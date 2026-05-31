# PasserelleCap

## Stack
Node.js/Express + React + Drizzle ORM + PostgreSQL (Neon) | Deploy: Render

## Règles critiques
- Migrations: fichiers `0XX_*.sql` manuels uniquement (pas Drizzle auto)
- Jamais modifier prod sans backup Neon + test branche dédiée
- Vérifier `DATABASE_URL` avant toute commande DB

## Memory
Détails projet dans `.claude/memory/`:
| Fichier | Contenu |
|---------|---------|
| blockers.md | Bugs résolus (BLK-001 migration enrollments ✓) |
| decisions.md | Choix architecture |
| learnings.md | Apprentissages |

**Consulter AVANT modifications sur:** migrations, workshop_enrollments, workshop_global_reports

## graphify
Knowledge graph: `graphify-out/`

Rules:
- Codebase questions → `graphify query "<question>"` d'abord
- Relations → `graphify path "<A>" "<B>"`
- Concept → `graphify explain "<concept>"`
- Après modif code → `graphify update .` (AST-only, gratuit)
