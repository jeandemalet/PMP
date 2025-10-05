#!/bin/bash

# PMP - Script de démarrage rapide
echo "🚀 Démarrage de PMP (Publication Management Platform)..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker et Docker Compose."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose."
    exit 1
fi

# Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env..."
    cp .env.example .env
    echo "✅ Fichier .env créé. Vous pouvez le modifier si nécessaire."
fi

# Créer le répertoire uploads s'il n'existe pas
if [ ! -d uploads ]; then
    echo "📁 Création du répertoire uploads..."
    mkdir -p uploads
    echo "✅ Répertoire uploads créé."
fi

# Démarrer les services avec Docker Compose
echo "🐳 Démarrage des services Docker..."
docker-compose up -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Générer la base de données
echo "🗄️  Configuration de la base de données..."
docker-compose exec -T app npm run db:push

# Créer un utilisateur admin par défaut
echo "👑 Création de l'utilisateur administrateur..."
docker-compose exec -T app node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Vérifier si l'admin existe déjà
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@pmp.local' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@pmp.local',
        password: hashedPassword,
        role: 'ADMIN',
        name: 'Administrateur'
      }
    });
    console.log('✅ Utilisateur admin créé: admin@pmp.local / admin123');
  } else {
    console.log('✅ Utilisateur admin existe déjà');
  }
}

main().catch(console.error).finally(() => prisma.\$disconnect());
"

# Afficher les informations de connexion
echo ""
echo "🎉 PMP est maintenant démarré et configuré !"
echo ""
echo "📍 URLs d'accès :"
echo "   • Application principale : http://localhost:3000"
echo "   • Interface administrateur : http://localhost:3000/admin"
echo ""
echo "🔐 Identifiants par défaut :"
echo "   • Administrateur : admin@pmp.local / admin123"
echo "   • Utilisateur normal : Créer un compte via l'interface de connexion"
echo ""
echo "🐳 Services Docker actifs :"
docker-compose ps
echo ""
echo "📖 Pour plus d'informations, consultez le README.md"
echo "🚀 Bon travail avec PMP !"
