# Passerelle CAP

Plateforme de gestion des fiches navettes CAP - Une application full-stack pour la gestion des fiches d'accompagnement des familles dans le cadre du dispositif CAP (Contrat d'Accompagnement Personnalisé).

## 🚀 Fonctionnalités

### Gestion des fiches navettes
- Création et édition de fiches navettes avec workflow complet
- Machine d'états pour le suivi du processus (brouillon → clôture)
- Sélection d'ateliers par objectifs pédagogiques
- Gestion des pièces justificatives et documents
- Système de commentaires internes

### Contrôle d'accès basé sur les rôles (RBAC)
- **ADMIN** : Gestion complète des utilisateurs, organisations et paramètres
- **SUIVI_PROJETS** : Lecture seule globale pour le suivi
- **EMETTEUR** : Création et édition des fiches navettes
- **RELATIONS_EVS** : Affectation, gestion des contrats et paiements
- **EVS_CS** : Réception, traitement et réalisation des activités

### Tableau de bord et rapports
- KPIs en temps réel (fiches actives, familles aidées, budget)
- Filtres avancés par état, EPSI, organisation, objectif
- Exports CSV/PDF pour les rapports
- Journal d'audit complet

## 🛠️ Stack technique

### Frontend
- **React 18** avec hooks et context
- **React Router 6** pour la navigation
- **TanStack Query** pour la gestion d'état et cache
- **Wouter** pour le routing léger
- **Lucide React** pour les icônes
- **CSS personnalisé** avec variables CSS

### Backend
- **Node.js + Express** pour l'API REST
- **Prisma ORM** avec PostgreSQL
- **bcrypt** pour le hachage des mots de passe
- **JWT** avec cookies HTTPOnly sécurisés
- **Multer** pour l'upload de fichiers
- **Yup/Zod** pour la validation

### Base de données
- **PostgreSQL** comme base de données principale
- **Prisma** pour les migrations et ORM
- **Relations complexes** entre entités
- **Index optimisés** pour les performances

## 📋 Prérequis

- Node.js 18+ 
- PostgreSQL 13+
- npm ou yarn

## 🚀 Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd passerelle-cap
