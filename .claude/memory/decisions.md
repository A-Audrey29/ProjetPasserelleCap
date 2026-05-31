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
