import { config } from 'dotenv'
import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { imageProcessor, ImageProcessingData } from './processors/imageProcessor'
import { zipProcessor } from './processors/zipProcessor'

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

// Event listeners for image worker
imageWorker.on('completed', (job: Job<ImageProcessingData> | undefined) => {
  console.log(`Image processing job ${job?.id} completed`)
})

imageWorker.on('failed', (job: Job<ImageProcessingData> | undefined, err) => {
  console.error(`Image processing job ${job?.id} failed:`, err.message)
})

// Event listeners for zip worker
zipWorker.on('completed', (job) => {
  console.log(`Zip creation job ${job?.id} completed`)
})

zipWorker.on('failed', (job, err) => {
  console.error(`Zip creation job ${job?.id} failed:`, err.message)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...')
  await imageWorker.close()
  await zipWorker.close()
  await redis.quit()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Shutting down workers...')
  await imageWorker.close()
  await zipWorker.close()
  await redis.quit()
  await prisma.$disconnect()
  process.exit(0)
})

console.log('PMP Worker started with BullMQ...')
console.log('- Image processing worker: active')
console.log('- Zip creation worker: active')
