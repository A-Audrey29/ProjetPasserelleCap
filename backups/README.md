# Sauvegardes de la base de données Passerelle CAP

## Fichiers de sauvegarde

- `passerelle_cap_backup_YYYYMMDD_HHMMSS.sql` : Sauvegarde complète au format SQL
- `passerelle_cap_backup_YYYYMMDD_HHMMSS.sql.gz` : Version compressée (économise ~75% d'espace)

## Comment restaurer une sauvegarde

### Option 1 : Restaurer depuis le fichier SQL
```bash
psql $DATABASE_URL < backups/passerelle_cap_backup_YYYYMMDD_HHMMSS.sql
```

### Option 2 : Restaurer depuis le fichier compressé
```bash
gunzip -c backups/passerelle_cap_backup_YYYYMMDD_HHMMSS.sql.gz | psql $DATABASE_URL
```

### Option 3 : Restaurer après avoir vidé la base (ATTENTION: supprime toutes les données)
```bash
# Vider la base de données
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restaurer la sauvegarde
psql $DATABASE_URL < backups/passerelle_cap_backup_YYYYMMDD_HHMMSS.sql
```

## Créer une nouvelle sauvegarde

```bash
pg_dump $DATABASE_URL > backups/passerelle_cap_backup_$(date +%Y%m%d_%H%M%S).sql
gzip -k backups/passerelle_cap_backup_*.sql  # Compresser
```

## Contenu de la sauvegarde actuelle

La sauvegarde inclut toutes les tables :
- audit_logs
- comments
- email_logs
- epcis
- fiche_navettes
- migrations
- organizations
- users
- workshop_enrollments
- workshop_objectives
- workshops

Ainsi que toutes les données, index, contraintes et relations.
