# Blockers Registry

## Index
| ID | Status | Domaine | Résumé |
|----|--------|---------|--------|
| BLK-001 | ✓ resolved | DB/migrations | Bug enrollments - colonnes manquantes |
| BLK-002 | ⏸ workaround | Frontend/feature | Formulaire bilan atelier in-app masqué (en construction) |

---

## BLK-002
**Date:** 2026-06-07
**Status:** ⏸ workaround (formulaire masqué, à finaliser avant réexposition)
**Domaine:** Frontend / feature workshop report

### Problème
Signalement support (Centre Social Les Bras Ouverts) sur la fiche bilan atelier CAP:
1. Données saisies non conservées malgré "Sauvegarde automatique" — fiche réapparaît vide.
2. PDF téléchargé impossible à remplir/ouvrir.

### Cause racine
Feature `WorkshopReportForm` **non finie mais exposée en prod** (mergée dans main via commit 95e543c):
- Autosave fragile: debounce 1000ms; `handleClose()` ne flushe que `familyData`, jamais `globalData` (WorkshopReportForm.jsx:139-145); filet `beforeunload` commenté/inactif (useDebouncedSave.ts:53).
- Blocage 400 silencieux si `enrollment.activityDone` faux (routes.ts:2993-2997), erreur avalée côté front.
- Export PDF = endpoint TODO renvoyant du JSON en `.pdf` (routes.ts:3052-3061); aucune lib PDF installée.
- Template `FicheDeSuiviAtelier.pdf` = PDF plat, 0 champ AcroForm.

### Fix appliqué (workaround)
- Feature flag `WORKSHOP_REPORT_FORM_ENABLED = false` dans WorkshopSessionCard.jsx → bouton "Remplir le bilan" + modal non rendus.
- Branche: `fix/masquer-bilan-atelier-en-construction`.
- Composant + routes backend conservés intacts (juste non exposés).
- Repli structures: template PDF vierge `/templates/FicheDeSuiviAtelier.pdf` + upload via `POST /api/enrollments/:id/upload-report`.

### ⚠️ Important — fix non encore mergé dans `main`
Le flag `WORKSHOP_REPORT_FORM_ENABLED = false` n'existe QUE sur `fix/masquer-bilan-atelier-en-construction` (commit 364169f), pas sur `main`. Toute branche créée depuis `main` aura encore le bouton "Remplir le bilan pour FN-..." visible (WorkshopSessionCard.jsx:560).
→ Vu en pratique sur `feature/faq-tuto-bilan-atelier` (créée depuis main le 2026-06-08) : bouton toujours là, résolu en mergeant `fix/masquer-bilan-atelier-en-construction` dedans.
→ **Ouvrir la PR de `fix/masquer-bilan-atelier-en-construction` vers `main` au plus vite** pour éviter que ce problème se reproduise sur chaque nouvelle branche.

### Reste à faire avant de repasser le flag à true
- Flush `globalData` + `familyData` à la fermeture; retirer blocage `activityDone`.
- Filet `beforeunload` réel (`sendBeacon`); toast d'erreur visible sur échec autosave.
- Vraie génération PDF (`pdf-lib`, from scratch — template officiel sans champs AcroForm).

## BLK-001
**Date:** 2026-05-28
**Status:** ✓ resolved
**Domaine:** DB/migrations

### Problème
Création d'inscription aux ateliers (workshop_enrollments) échoue silencieusement en prod depuis 26 mars 2026.

### Cause racine
Désynchronisation schéma code ↔ base:
- Commit 95e543c ajouté 6 colonnes `report_*` dans schema.ts
- Migration Drizzle `0001_bizarre_hex.sql` générée mais JAMAIS appliquée
- Regex migrate.ts exclut fichiers 4 chiffres (`0001_*`)
- INSERT avec colonnes inexistantes → erreur avalée par try/catch

### Fix appliqué
- Migration `003_add_workshop_report_fields.sql` (commit 66975fe)
- stateTransitions.js réparé (commit d6b0a22)
- Backfill 3 fiches: FN-2026-02-014, FN-2026-02-042, FN-2026-05-001

### Leçons
→ Voir LRN-001 dans learnings.md
