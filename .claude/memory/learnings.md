# Learnings Registry

## Index
| ID | Date | Domaine | Pattern |
|----|------|---------|---------|
| LRN-001 | 2026-05-28 | DB/migrations | Try/catch silencieux cache erreurs critiques |

---

## LRN-001
**Date:** 2026-05-28
**Domaine:** DB/migrations
**Source:** BLK-001

### Pattern observé
Try/catch par atelier dans `createWorkshopEnrollments` avalait les erreurs DB → 0 enrollments créés, aucune alerte visible.

### Contexte
Bug prod pendant 2 mois non détecté car:
- Pas de logs d'erreur remontés
- Pas de tests automatisés
- Pas de monitoring enrollments

### À appliquer
- Logger les erreurs AVANT de les catch
- Ajouter monitoring sur tables critiques (enrollments count)
- Ne jamais avaler silencieusement une erreur DB
