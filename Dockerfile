# Utiliser l'image de base Node.js 18 Alpine
FROM node:18-alpine

# Installer les dépendances système nécessaires à la compilation (pour canvas, etc.)
RUN apk add --no-cache libc6-compat build-base python3 py3-pip g++ cairo-dev jpeg-dev pango-dev git

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de définition des dépendances
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm install

# Copier tout le reste du code source
COPY . .

# Exposer le port que Next.js va utiliser
EXPOSE 3000

# La commande de démarrage est maintenant gérée par docker-compose.yml
