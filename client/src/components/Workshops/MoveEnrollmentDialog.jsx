import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import styles from "./MoveEnrollmentDialog.module.css";

/**
 * Déplace une fiche d'une session d'atelier vers une autre.
 *
 * Corrige les cas où le terrain a regroupé les familles autrement que
 * l'affectation automatique faite à la validation de la fiche.
 *
 * On utilise fetch directement plutôt que apiRequest: celui-ci lève une
 * exception sur les réponses non-2xx, ce qui perdrait le corps JSON structuré
 * des 409 (OVER_CAPACITY, TARGET_SESSION_LOCKED) dont dépend le flux de
 * confirmation ci-dessous.
 */
export default function MoveEnrollmentDialog({ enrollmentId, ficheRef, onClose }) {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null);

  const [selectedSession, setSelectedSession] = useState(null);
  const [reason, setReason] = useState("");
  const [acknowledgeOverCapacity, setAcknowledgeOverCapacity] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTargets() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/enrollments/${enrollmentId}/move-targets`, {
          credentials: "include",
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(body?.message || "Impossible de charger les sessions");
        }
        if (!cancelled) {
          setData(body);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTargets();
    return () => {
      cancelled = true;
    };
  }, [enrollmentId]);

  const targets = data?.targets ?? [];
  const selectedTarget = targets.find((t) => t.sessionNumber === selectedSession) || null;

  // La case de confirmation n'apparaît que si la cible dépasse la capacité.
  const needsCapacityAck = selectedTarget?.wouldExceedCapacity === true;

  const canSubmit =
    selectedTarget !== null &&
    selectedTarget.eligible &&
    reason.trim().length >= 3 &&
    (!needsCapacityAck || acknowledgeOverCapacity) &&
    !isSubmitting;

  const handleSelect = (target) => {
    if (!target.eligible) return;
    setSelectedSession(target.sessionNumber);
    setAcknowledgeOverCapacity(false);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/session`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetSessionNumber: selectedTarget.sessionNumber,
          reason: reason.trim(),
          acknowledgeOverCapacity,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitError(body?.message || "Le déplacement a échoué");
        return;
      }

      await queryClient.refetchQueries({ queryKey: ["/api/workshop-sessions"] });

      toast({
        title: "Fiche déplacée",
        description: body?.message,
      });
      onClose();
    } catch (error) {
      setSubmitError(error.message || "Le déplacement a échoué");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={styles.modal}
      onClick={onClose}
      data-testid={`dialog-move-enrollment-${enrollmentId}`}
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Déplacer la fiche {ficheRef}</h3>
            <p className={styles.subtitle}>
              {data?.workshop?.name}
              {data?.enrollment ? ` — actuellement en session ${data.enrollment.sessionNumber}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fermer"
            data-testid="button-close-move-dialog"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading && <p className={styles.emptyState}>Chargement des sessions…</p>}

        {loadError && <div className={styles.errorBox}>{loadError}</div>}

        {!isLoading && !loadError && (
          <>
            <h4 className={styles.sectionTitle}>Session de destination</h4>

            {targets.length === 0 ? (
              <p className={styles.emptyState}>
                Aucune autre session n'existe pour cet atelier. Une fiche ne peut être déplacée que
                vers une session déjà créée.
              </p>
            ) : (
              <div className={styles.targetList}>
                {targets.map((target) => {
                  const isSelected = target.sessionNumber === selectedSession;
                  const classNames = [
                    styles.targetItem,
                    isSelected ? styles.targetSelected : "",
                    target.eligible ? "" : styles.targetDisabled,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <label
                      key={target.sessionNumber}
                      className={classNames}
                      data-testid={`option-session-${target.sessionNumber}`}
                    >
                      <input
                        type="radio"
                        name="targetSession"
                        className={styles.targetRadio}
                        checked={isSelected}
                        disabled={!target.eligible}
                        onChange={() => handleSelect(target)}
                      />
                      <div className={styles.targetBody}>
                        <div className={styles.targetHeading}>
                          <span className={styles.targetName}>Session {target.sessionNumber}</span>
                          <span className={styles.targetCount}>
                            {target.totalParticipants}
                            {data?.workshop?.maxCapacity ? `/${data.workshop.maxCapacity}` : ""}{" "}
                            participants
                          </span>
                        </div>

                        {target.fiches?.length > 0 && (
                          <div className={styles.targetFiches}>
                            {target.fiches.map((f) => f.ref).join(", ")}
                          </div>
                        )}

                        {/* Motif affiché explicitement: l'admin doit comprendre
                            pourquoi une destination lui est refusée. */}
                        {!target.eligible && (
                          <div className={styles.targetBlocked}>🔒 {target.blockedReason}</div>
                        )}

                        {target.eligible && target.wouldExceedCapacity && (
                          <div className={styles.targetWarning}>
                            ⚠️ Passerait à {target.projectedTotal}/{data?.workshop?.maxCapacity} —
                            dépassement de capacité
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {needsCapacityAck && (
              <div className={styles.capacityWarning}>
                <p className={styles.capacityWarningText}>
                  Cette session dépassera sa capacité maximale ({selectedTarget.projectedTotal}/
                  {data?.workshop?.maxCapacity} participants).
                </p>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={acknowledgeOverCapacity}
                    onChange={(e) => setAcknowledgeOverCapacity(e.target.checked)}
                    data-testid="checkbox-acknowledge-over-capacity"
                  />
                  <span>Je confirme le dépassement, cela reflète la situation réelle.</span>
                </label>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="move-reason">
                Motif du déplacement <span className={styles.required}>*</span>
              </label>
              <textarea
                id="move-reason"
                className={styles.textarea}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex. : la structure a regroupé les familles sur la même session."
                maxLength={500}
                data-testid="input-move-reason"
              />
              <p className={styles.hint}>
                Conservé dans l'historique pour expliquer la correction plus tard.
              </p>
            </div>

            {submitError && <div className={styles.errorBox}>{submitError}</div>}

            <div className={styles.actions}>
              <button
                onClick={onClose}
                className={styles.cancelButton}
                disabled={isSubmitting}
                data-testid="button-cancel-move"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                className={styles.confirmButton}
                disabled={!canSubmit}
                data-testid="button-confirm-move"
              >
                {isSubmitting ? "Déplacement…" : "Déplacer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
