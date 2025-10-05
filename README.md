# PMP - Publication Management Platform

Une plateforme complète de gestion de publications avec traitement d'images, organisation et planification.

## 🚀 Fonctionnalités

### ✅ Workflow Complet
- **📸 Galerie** : Upload et gestion des images
- **✂️ Recadrage** : Outils manuels et automatiques avancés
- **📝 Description** : Métadonnées complètes (titre, description, tags, alt, caption)
- **🔄 Tri** : Organisation par drag & drop avec publications
- **📅 Calendrier** : Planification temporelle avec interface interactive
- **📦 Export** : Génération automatique de ZIP avec métadonnées

### ✅ Architecture Technique
- **🔐 Authentification** : NextAuth.js avec rôles utilisateurs
- **🗄️ Base de données** : Prisma ORM avec PostgreSQL/SQLite
- **⚡ Traitement asynchrone** : BullMQ avec worker dédié
- **🎨 Interface moderne** : Next.js 14 + Tailwind CSS + shadcn/ui
- **🧪 Tests complets** : Vitest (unitaires) + Playwright (e2e)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │     Worker      │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (BullMQ)      │◄──►│   (Prisma)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌─────────────────┐
│     Redis       │    │     Files       │
│  (Queue/Cache)  │    │   (Uploads)     │
└─────────────────┘    └─────────────────┘
```

## 🛠️ Installation et Démarrage

### Prérequis
- Node.js 18+
- Docker et Docker Compose (recommandé)
- Git

### Installation Rapide (Docker)

1. **Cloner le projet**
```bash
git clone <votre-repo>
cd PMP
```

2. **Démarrer avec Docker Compose**
```bash
# Démarrer tous les services
docker-compose up -d

# Générer la base de données
docker-compose exec app npm run db:push

# Créer un utilisateur admin
docker-compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@pmp.local',
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Administrateur'
    }
  });
  console.log('Utilisateur admin créé');
}

main().catch(console.error).finally(() => prisma.$disconnect());
"
```

3. **Accéder à l'application**
- Application : http://localhost:3000
- Interface admin : http://localhost:3000/admin

### Installation Manuelle

1. **Installer les dépendances**
```bash
npm install
cd worker && npm install && cd ..
```

2. **Configuration de l'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos paramètres
```

3. **Démarrer les services**
```bash
# Base de données
npm run db:push

# Services en arrière-plan
docker-compose up -d redis postgres

# Application principale
npm run dev

# Worker (nouveau terminal)
npm run worker:dev
```

## 📖 Guide d'Utilisation

### 🔐 Connexion
- **Utilisateur normal** : Créer un compte ou utiliser les identifiants fournis
- **Administrateur** : `admin@pmp.local` / `admin123`

### 📸 Workflow Utilisateur

1. **Galerie** (`/gallery`)
   - Créer une galerie
   - Uploader des images
   - Attendre le traitement automatique (thumbnails, previews)

2. **Recadrage** (`/crop`)
   - Sélectionner des images
   - Utiliser les outils de recadrage
   - Appliquer des transformations

3. **Description** (`/description`)
   - Ajouter des métadonnées complètes
   - Définir titre, description, tags, texte alternatif

4. **Tri** (`/sort`)
   - Créer des publications
   - Organiser les images par drag & drop
   - Définir l'ordre d'affichage

5. **Calendrier** (`/calendar`)
   - Planifier les publications
   - Glisser les publications sur les dates souhaitées

6. **Export** (`/calendar`)
   - Sélectionner les publications à exporter
   - Télécharger l'archive ZIP avec métadonnées

### 👑 Interface Administrateur (`/admin`)

- **Tableau de bord** : Statistiques et activité système
- **Gestion utilisateurs** : Promouvoir/rétrograder des utilisateurs
- **Impersonation** : Se connecter en tant qu'un utilisateur
- **Santé du système** : Monitoring CPU, mémoire, stockage

## 🧪 Tests

### Tests End-to-End (Playwright)
```bash
# Interface interactive
npm run test:e2e:ui

# Tests headless
npm run test:e2e

# Tests spécifiques
npx playwright test tests/e2e/auth.spec.ts
```

### Tests Unitaires (Vitest)
```bash
# Tous les tests
npm run test:unit

# Mode watch
npm run test
```

## 🔧 Développement

### Structure du Projet
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Authentification
│   │   ├── galleries/     # Gestion des galeries
│   │   ├── publications/  # Publications
│   │   ├── export/        # Export ZIP
│   │   └── admin/         # Interface admin
│   ├── gallery/           # Page galerie
│   ├── crop/             # Page recadrage
│   ├── description/      # Page métadonnées
│   ├── sort/             # Page tri
│   ├── calendar/         # Page calendrier
│   └── admin/            # Page admin
├── components/           # Composants React
├── lib/                  # Utilitaires et configuration
└── types/                # Types TypeScript

worker/                   # Worker BullMQ
tests/                    # Tests automatisés
```

### Variables d'Environnement

```env
# Base de données
DATABASE_URL="postgresql://user:pass@localhost:5432/pmp"

# Authentification
NEXTAUTH_SECRET="votre-secret-256-bits"
NEXTAUTH_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://localhost:6379"

# Configuration
NODE_ENV="production"
LOG_LEVEL="info"
```

## 🚀 Déploiement

### Production (Docker)
```bash
# Build et déploiement
docker-compose -f docker-compose.prod.yml up -d

# Migrations de base de données
docker-compose exec app npm run db:push
```

### Production (Manuel)
```bash
# Build de l'application
npm run build

# Démarrer en production
npm start
```

## 🔍 Monitoring et Logs

### Logs Structurés
```bash
# Voir les logs de l'application
docker-compose logs -f app

# Logs du worker
docker-compose logs -f worker

# Logs de la base de données
docker-compose logs -f db
```

### Métriques
- Accès admin : http://localhost:3000/admin
- Health checks disponibles sur `/api/health`

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

- **Documentation** : Voir les spécifications dans `Appspecifications.md`
- **Issues** : Créer un ticket sur GitHub
- **Discussions** : Utiliser les discussions GitHub

---

**🎉 PMP est maintenant prêt pour la production !**

Pour commencer : http://localhost:3000
