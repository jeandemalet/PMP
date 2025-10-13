const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pmp.local';

  // Récupérer le mot de passe depuis les variables d'environnement ou générer un mot de passe sécurisé
  const adminPassword = process.env.ADMIN_PASSWORD || 'PMP_' + crypto.randomBytes(16).toString('hex') + '_Secure!';

  const userExists = await prisma.user.findUnique({ where: { email } });

  if (userExists) {
    console.log('L\'utilisateur admin existe déjà.');
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  await prisma.user.create({
    data: {
      email: email,
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Administrateur'
    }
  });

  console.log('Utilisateur admin créé avec succès !');
  console.log(`Email: ${email}`);
  console.log(`Mot de passe: ${adminPassword}`);
  console.log('⚠️  Assurez-vous de noter ce mot de passe et de le changer après la première connexion !');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
