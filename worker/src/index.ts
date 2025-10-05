import { config } from 'dotenv'
import { Queue, Worker } from 'bull'
import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { imageProcessor } from './processors/imageProcessor'
import { zipProcessor } from './processors/zipProcessor'

// Load environment variables
config()

// Initialize Redis and Prisma
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
const prisma = new PrismaClient()

// Create job queue
export const jobQueue = new Queue('pmp-jobs', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

// Create worker
const worker = new Worker(
  'pmp-jobs',
  async (job) => {
    const { id, type, data } = job.data

    console.log(`Processing job ${id} of type ${type}`)

    try {
      // Update job status to processing
      await prisma.job.update({
        where: { id },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      })

      let result

      // Process based on job type
      switch (type) {
        case 'IMAGE_CROP':
        case 'IMAGE_RESIZE':
          result = await imageProcessor.process(data)
          break
        case 'ZIP_CREATE':
          result = await zipProcessor.process(data)
          break
        default:
          throw new Error(`Unknown job type: ${type}`)
      }

      // Update job status to completed
      await prisma.job.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: result,
        },
      })

      console.log(`Job ${id} completed successfully`)
      return result

    } catch (error) {
      console.error(`Job ${id} failed:`, error)

      // Update job status to failed
      await prisma.job.update({
        where: { id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      throw error
    }
  },
  {
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
  }
)

// Event listeners
worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`)
})

worker.on('error', (err) => {
  console.error('Worker error:', err)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...')
  await worker.close()
  await redis.quit()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Shutting down worker...')
  await worker.close()
  await redis.quit()
  await prisma.$disconnect()
  process.exit(0)
})

console.log('PMP Worker started and listening for jobs...')
