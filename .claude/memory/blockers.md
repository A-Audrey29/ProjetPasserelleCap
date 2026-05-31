# Blockers Registry

## Index
| ID | Status | Domaine | Résumé |
|----|--------|---------|--------|
| BLK-001 | ✓ resolved | DB/migrations | Bug enrollments - colonnes manquantes |

---

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
