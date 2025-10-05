# PMP - Photo Management Platform

Une plateforme complète de gestion de photos avec traitement d'images, galerie, calendrier et fonctionnalités de publication.

## Fonctionnalités

- 📸 **Galerie interactive** - Visualisez et gérez vos photos
- ✂️ **Recadrage intelligent** - Recadrez vos images avec des outils avancés
- 📅 **Calendrier intégré** - Organisez vos photos par date
- 🔄 **Tri automatique** - Classez vos images intelligemment
- 📝 **Descriptions personnalisées** - Ajoutez des métadonnées à vos photos
- 🚀 **Publication facilitée** - Publiez vos photos sur les réseaux sociaux
- 👥 **Interface administrateur** - Gérez utilisateurs et système
- 🔄 **Traitement en arrière-plan** - Jobs asynchrones avec Redis

## Architecture

- **Frontend** : Next.js 14 avec App Router, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes
- **Base de données** : PostgreSQL avec Prisma ORM
- **File d'attente** : Redis avec Bull
- **Worker** : Node.js dédié pour le traitement d'images
- **Conteneurisation** : Docker et Docker Compose

## Prérequis

- Node.js 18+
- Docker et Docker Compose
- Git

## Installation

### 1. Cloner le repository

```bash
git clone <repository-url>
cd pmp
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

```bash
cp .env.example .env.local
```

Editez `.env.local` avec vos paramètres :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pmp_db"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="votre-clé-secrète-générée"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Démarrer les services avec Docker

```bash
docker-compose up -d
```

Cette commande démarre :
- L'application Next.js (port 3000)
- PostgreSQL (port 5432)
- Redis (port 6379)
- Le worker de traitement (arrière-plan)

### 5. Configuration de la base de données

```bash
# Générer le client Prisma
npm run db:generate

# Appliquer les migrations
npm run db:push

# (Optionnel) Ouvrir Prisma Studio
npm run db:studio
```

## Développement

### Démarrer en mode développement

```bash
npm run dev
```

### Construire pour la production

```bash
npm run build
npm run start
```

### Lancer les tests

```bash
npm run test
```

## Structure du projet

```
├── src/
│   ├── app/                 # Pages Next.js App Router
│   │   ├── (app)/          # Routes utilisateur
│   │   ├── admin/          # Interface administrateur
│   │   ├── api/            # API Routes
│   │   └── ...
│   ├── components/         # Composants React
│   ├── lib/               # Utilitaires et configurations
│   ├── hooks/             # Hooks personnalisés
│   ├── store/             # État global (Zustand)
│   └── types/             # Définitions TypeScript
├── prisma/                # Schéma et migrations
├── worker/                # Service de traitement en arrière-plan
└── public/                # Fichiers statiques
```

## Scripts disponibles

- `npm run dev` - Démarrer en développement
- `npm run build` - Construire pour la production
- `npm run start` - Démarrer en production
- `npm run lint` - Vérifier le code
- `npm run db:generate` - Générer le client Prisma
- `npm run db:push` - Appliquer le schéma à la DB
- `npm run db:studio` - Ouvrir Prisma Studio
- `npm run worker:dev` - Démarrer le worker en développement

## API

### Jobs

- `POST /api/jobs` - Créer un nouveau job
- `GET /api/jobs/[jobId]` - Statut d'un job

### Images

- `GET /api/images` - Liste des images
- `POST /api/images` - Upload d'images
- `GET /api/images/[id]` - Détails d'une image

## Worker

Le worker traite les jobs en arrière-plan :

- Traitement d'images (recadrage, redimensionnement)
- Création de ZIP
- Traitement vidéo

Pour démarrer le worker séparément :

```bash
cd worker
npm install
npm run dev
```

## Déploiement

### Production avec Docker

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Variables d'environnement de production

```env
NODE_ENV="production"
DATABASE_URL="..."  # URL de production
REDIS_URL="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://votre-domaine.com"
```

## Support

Pour toute question ou problème, veuillez consulter la documentation ou créer une issue sur le repository.

## Licence

Ce projet est sous licence MIT.
