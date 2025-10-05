import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

export interface ImageProcessData {
  imageId: string
  operation: 'crop' | 'resize'
  params: {
    width?: number
    height?: number
    x?: number
    y?: number
    quality?: number
  }
}

export class ImageProcessor {
  async process(data: ImageProcessData) {
    console.log('Processing image:', data)

    // Get image from database
    const image = await prisma.image.findUnique({
      where: { id: data.imageId }
    })

    if (!image) {
      throw new Error(`Image not found: ${data.imageId}`)
    }

    const inputPath = path.join(process.cwd(), image.path)
    const outputDir = path.dirname(inputPath)
    const outputFilename = `${uuidv4()}_${image.filename}`
    const outputPath = path.join(outputDir, outputFilename)

    try {
      let sharpInstance = sharp(inputPath)

      switch (data.operation) {
        case 'crop':
          if (data.params.width && data.params.height && data.params.x !== undefined && data.params.y !== undefined) {
            sharpInstance = sharpInstance.extract({
              left: data.params.x,
              top: data.params.y,
              width: data.params.width,
              height: data.params.height
            })
          }
          break

        case 'resize':
          if (data.params.width || data.params.height) {
            sharpInstance = sharpInstance.resize({
              width: data.params.width,
              height: data.params.height,
              fit: 'inside',
              withoutEnlargement: true
            })
          }
          break

        default:
          throw new Error(`Unknown operation: ${data.operation}`)
      }

      // Set quality if provided
      if (data.params.quality) {
        sharpInstance = sharpInstance.jpeg({ quality: data.params.quality })
      }

      // Process and save image
      await sharpInstance.toFile(outputPath)

      // Get new image stats
      const stats = await fs.stat(outputPath)

      // Create new image record
      const processedImage = await prisma.image.create({
        data: {
          filename: outputFilename,
          originalName: `${image.originalName}_${data.operation}`,
          path: path.relative(process.cwd(), outputPath),
          size: stats.size,
          mimeType: 'image/jpeg',
          userId: image.userId,
          description: `Processed: ${data.operation} - ${new Date().toISOString()}`
        }
      })

      return {
        success: true,
        processedImageId: processedImage.id,
        outputPath: processedImage.path,
        size: stats.size,
        operation: data.operation,
        params: data.params
      }

    } catch (error) {
      console.error('Image processing error:', error)
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const imageProcessor = new ImageProcessor()
