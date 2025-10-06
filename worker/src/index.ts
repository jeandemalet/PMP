import { config } from 'dotenv'
import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { imageProcessor, ImageProcessingData } from './processors/imageProcessor'
import { zipProcessor } from './processors/zipProcessor'

// Interface pour les données du smart crop
interface SmartCropData {
  imageId: string;
  targetWidth: number;
  targetHeight: number;
  userId: string;
}

// Load environment variables
config()

// Initialize Redis and Prisma
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})
const prisma = new PrismaClient()

// Create worker for image processing
const imageWorker = new Worker(
  'image-processing',
  async (job: Job<ImageProcessingData>) => {
    const { imageId, variantId, userId, operations } = job.data

    console.log(`Processing image ${imageId} for user ${userId}`)

    try {
      // Update job status if we have a variantId (new system)
      if (variantId) {
        await prisma.imageVariant.update({
          where: { id: variantId },
          data: {
            // You could add a processing status here if needed
          }
        })
      }

      // Process the image with Sharp
      const result = await imageProcessor.process({
        imageId,
        variantId,
        userId,
        operations
      })

      console.log(`Image processing completed for ${imageId}`)
      return result

    } catch (error) {
      console.error(`Image processing failed for ${imageId}:`, error)

      // Update variant with error if it exists
      if (variantId) {
        await prisma.imageVariant.update({
          where: { id: variantId },
          data: {
            path: '',
            size: 0,
            width: 0,
            height: 0,
          }
        })
      }

      throw error
    }
  },
  {
    connection: redis,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
  }
)

// Create worker for zip creation
const zipWorker = new Worker(
  'zip-creation',
  async (job) => {
    const { imageIds, userId, archiveName } = job.data

    console.log(`Creating ZIP for ${imageIds.length} images`)

    try {
      const result = await zipProcessor.process({
        imageIds,
        archiveName
      })

      console.log(`Zip creation completed`)
      return result

    } catch (error) {
      console.error(`Zip creation failed:`, error)
      throw error
    }
  },
  {
    connection: redis,
    concurrency: 1, // One at a time for zip creation
  }
)

// Create worker for smart crop
const smartCropWorker = new Worker(
  'smart-crop',
  async (job: Job<SmartCropData>) => {
    const { imageId, targetWidth, targetHeight, userId } = job.data

    console.log(`Smart cropping image ${imageId} to ${targetWidth}x${targetHeight}`)

    try {
      // Use the smartCrop function from imageProcessor
      const result = await imageProcessor.smartCrop(
        imageId,
        targetWidth,
        targetHeight
      )

      console.log(`Smart crop completed for ${imageId}`)
      return result

    } catch (error) {
      console.error(`Smart crop failed for ${imageId}:`, error)
      throw error
    }
  },
  {
    connection: redis,
    concurrency: 2, // Allow 2 concurrent smart crop operations
  }
)

// Event listeners for image worker
imageWorker.on('completed', (job: Job<ImageProcessingData> | undefined) => {
  console.log(`Image processing job ${job?.id} completed`)
})

imageWorker.on('failed', async (job: Job<ImageProcessingData> | undefined, err) => {
  console.error(`Image processing job ${job?.id} failed:`, err.message)

  // Mettre à jour le statut dans la base de données Prisma
  if (job?.data?.variantId) {
    try {
      await prisma.imageVariant.update({
        where: { id: job.data.variantId },
        data: {
          path: '',
          size: 0,
          width: 0,
          height: 0,
        }
      });

      // Récupérer l'ID du job Prisma depuis les données du job BullMQ
      // Les données du job devraient contenir l'ID Prisma du job créé dans la BDD
      const prismaJobId = (job as any).data?.prismaJobId;

      if (prismaJobId) {
        // Mettre à jour uniquement le job spécifique qui a échoué
        await prisma.job.update({
          where: { id: prismaJobId },
          data: {
            status: 'FAILED',
            error: err.message,
            completedAt: new Date()
          }
        });
      } else {
        console.warn('Aucun ID de job Prisma trouvé dans les données du job BullMQ');
      }
    } catch (updateError) {
      console.error('Erreur lors de la mise à jour du statut en BDD:', updateError);
    }
  }
})

// Event listeners for zip worker
zipWorker.on('completed', (job) => {
  console.log(`Zip creation job ${job?.id} completed`)
})

zipWorker.on('failed', async (job, err) => {
  console.error(`Zip creation job ${job?.id} failed:`, err.message)

  // Mettre à jour le statut dans la base de données Prisma
  try {
    // Récupérer l'ID du job Prisma depuis les données du job BullMQ
    const prismaJobId = (job as any).data?.prismaJobId;

    if (prismaJobId) {
      // Mettre à jour le job spécifique qui a échoué
      await prisma.job.update({
        where: { id: prismaJobId },
        data: {
          status: 'FAILED',
          error: err.message,
          completedAt: new Date()
        }
      });
    } else {
      console.warn('Aucun ID de job Prisma trouvé dans les données du job ZIP BullMQ');
    }
  } catch (updateError) {
    console.error('Erreur lors de la mise à jour du statut ZIP en BDD:', updateError);
  }
})

// Event listeners for smart crop worker
smartCropWorker.on('completed', (job: Job<SmartCropData> | undefined) => {
  console.log(`Smart crop job ${job?.id} completed`)
})

smartCropWorker.on('failed', async (job: Job<SmartCropData> | undefined, err) => {
  console.error(`Smart crop job ${job?.id} failed:`, err.message)

  // Mettre à jour le statut dans la base de données Prisma
  try {
    // Récupérer l'ID du job Prisma depuis les données du job BullMQ
    const prismaJobId = (job as any)?.data?.prismaJobId;

    if (prismaJobId) {
      // Mettre à jour le job spécifique qui a échoué
      await prisma.job.update({
        where: { id: prismaJobId },
        data: {
          status: 'FAILED',
          error: err.message,
          completedAt: new Date()
        }
      });
    } else {
      console.warn('Aucun ID de job Prisma trouvé dans les données du job Smart Crop BullMQ');
    }
  } catch (updateError) {
    console.error('Erreur lors de la mise à jour du statut Smart Crop en BDD:', updateError);
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...')
  await imageWorker.close()
  await zipWorker.close()
  await smartCropWorker.close()
  await redis.quit()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Shutting down workers...')
  await imageWorker.close()
  await zipWorker.close()
  await smartCropWorker.close()
  await redis.quit()
  await prisma.$disconnect()
  process.exit(0)
})

console.log('PMP Worker started with BullMQ...')
console.log('- Image processing worker: active')
console.log('- Zip creation worker: active')
console.log('- Smart crop worker: active')
