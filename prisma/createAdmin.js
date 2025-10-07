const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pmp.local';
  const userExists = await prisma.user.findUnique({ where: { email } });

  if (userExists) {
    console.log('L\'utilisateur admin existe déjà.');
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.create({
    data: {
      email: email,
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Administrateur'
    }
  });

  console.log('Utilisateur admin créé avec succès ! (email: admin@pmp.local, mdp: admin123)');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
