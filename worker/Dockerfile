# Utiliser Node.js 20 Alpine comme image de base
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Créer le répertoire pour les fichiers temporaires
RUN mkdir -p /tmp/uploads

# Construire l'application (si nécessaire)
RUN npm run build

# Exposer le port (si nécessaire pour les health checks)
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]
