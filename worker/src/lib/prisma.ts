import { PrismaClient } from '@prisma/client'

// Instance partagée de Prisma pour le worker
// Cette approche évite de créer plusieurs pools de connexions
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
