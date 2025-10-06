# Étape 1 : Construction
# Utiliser Node.js 20 Alpine comme image de base
FROM node:20-alpine AS builder

# Installer les dépendances système pour node-canvas AVANT npm install
RUN apk add --no-cache build-base g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour la construction)
RUN npm install

# Copier le reste du code source
COPY . .

# Construire l'application TypeScript en JavaScript
RUN npm run build


# Étape 2 : Production
# Utiliser une nouvelle image de base propre pour l'exécution
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier uniquement les dépendances de production depuis l'étape de construction
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
RUN npm prune --production

# Copier le code construit (le dossier 'dist') depuis l'étape de construction
COPY --from=builder /app/dist ./dist

# Créer le répertoire pour les fichiers temporaires
# Note : Dans une vraie application, les uploads devraient être dans un volume persistant
RUN mkdir -p /tmp/uploads

# Commande pour démarrer le worker
CMD ["npm", "start"]