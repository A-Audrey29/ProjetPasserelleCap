# Templates de formulaires

Ce dossier contient les templates de formulaires PDF destinés à être téléchargés et remplis par les utilisateurs.

## Fichiers

### `FicheDeSuiviAtelier.pdf`
- **Description** : Template vierge pour les bilans d'ateliers
- **Utilisé dans** : `client/src/components/Fiches/FicheDetail.jsx`
- **Route d'accès** : `/templates/FicheDeSuiviAtelier.pdf`
- **Taille** : 285 KB
- **Ajouté le** : 2026-03-04

## Maintenance

Pour ajouter un nouveau template :

1. Placer le fichier PDF dans ce dossier
2. Créer un lien `<a href="/templates/...">` dans le composant React approprié
3. Mettre à jour ce README avec la description et l'emplacement d'utilisation

## Accès

Les fichiers de ce dossier sont servis statiquement par Vite en développement et par Express en production.

- **Développement** : `http://localhost:3000/templates/[fichier]`
- **Production** : `https://[domaine]/templates/[fichier]`
