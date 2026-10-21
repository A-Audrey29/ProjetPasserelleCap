# Decisions Registry

## Index
| ID | Date | Domaine | Décision |
|----|------|---------|----------|
| DEC-001 | 2026-05-28 | DB/migrations | Migrations manuelles uniquement |

---

## DEC-001
**Date:** 2026-05-28
**Domaine:** DB/migrations
**Status:** active

### Décision
Migrations custom uniquement (`0XX_*.sql` écrites à la main). Pas de migrations auto-générées Drizzle.

### Pourquoi
- Drizzle génère du bruit (DROP/CREATE INDEX inutiles)
- Conflits avec schema_migrations existant
- Besoin de contrôle précis sur ce qui est appliqué

### Alternatives rejetées
- Migrations Drizzle auto → trop de bruit, conflits
- Dual system (Drizzle + custom) → confusion, dette technique

### Conséquences
- Fichier `0001_bizarre_hex.sql` reste comme archive, jamais exécuté
- Toute nouvelle migration = fichier `0XX_*.sql` manuel
- Regex migrate.ts: `/^0\d{2}_/` (3 chiffres seulement)

---

## Déplacement forcé d'une fiche avec contrat signé (2026-10-21)

### Décision
L'admin peut déplacer une fiche entre sessions d'un même atelier même si son contrat est signé, et vers une session déjà contractualisée. Fonction permanente (`PATCH /api/enrollments/:id/session`).

### Pourquoi
- Le terrain regroupe les familles autrement que l'affectation auto, et les structures cochent parfois le contrat trop tôt.
- Le contrat vit uniquement sur `workshop_enrollments` (cases EVS/commune, date, PDF) + mails (subvention EVS, démarrage commune). L'état de la fiche (`fiche_navettes.state`) n'est jamais modifié par la signature: l'effacer ne touche pas la fiche.

### Règles
- Contrat signé sur la fiche: double validation (case + retaper la réf, revérifiée serveur) via `forceEngaged` + `confirmFicheRef`.
- Le contrat de la fiche déplacée est effacé; anciennes valeurs (dont URL PDF commune) dans l'audit `MOVE_ENROLLMENT_SESSION`.
- Aucun mail renvoyé; subventions déjà déclenchées = correction manuelle.
- Dépassement de capacité: confirmation explicite.
- Toujours bloqué: activité réalisée (fiche source ou session cible).

### Conséquences
- Session cible contractualisée: la fiche arrivée n'a pas de contrat propre mais la session s'affiche "EN COURS" (agrégat `.some()`).
- Testé sur branche Neon de test (21 tests logique + 13 tests HTTP): `scripts/tests/move-enrollment-*.test.ts`. Ils refusent de tourner sur la base de `.env` (prod).
