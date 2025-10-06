import sharp from 'sharp'
import { prisma } from '../lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import * as SmartCropModule from '../lib/smartcrop.js'
import { nodeImageOperations } from '../lib/smartcrop-node-bridge'

// Importer SmartCrop de manière fonctionnelle - la bibliothèque exporte directement la fonction crop
const SmartCrop = SmartCropModule

// Instance partagée de Prisma déjà configurée dans ../lib/prisma.ts
// Cette approche évite de créer plusieurs pools de connexions

export interface CropOperation {
  crop?: {
    width: number
    height: number
    x: number
    y: number
  }
  resize?: {
    width: number
    height: number
  }
  rotate?: number
  flipHorizontal?: boolean
  flipVertical?: boolean
  format?: 'jpeg' | 'png' | 'webp'
  quality?: number
}

export interface ImageProcessingData {
  imageId: string
  variantId?: string | undefined
  userId: string
  operations: CropOperation
}

export class ImageProcessor {
  async process(data: ImageProcessingData) {
    console.log('Processing image with operations:', data)

    // Get image from database
    const image = await prisma.image.findUnique({
      where: { id: data.imageId }
    })

    if (!image) {
      throw new Error(`Image not found: ${data.imageId}`)
    }

    const inputPath = path.join(process.cwd(), image.path)
    const outputDir = path.dirname(inputPath)
    const fileExtension = data.operations.format || 'jpeg'
    const outputFilename = `variant_${Date.now()}.${fileExtension}`
    const outputPath = path.join(outputDir, outputFilename)

    try {
      let sharpInstance = sharp(inputPath)

      // Appliquer les transformations dans l'ordre
      if (data.operations.rotate && data.operations.rotate !== 0) {
        sharpInstance = sharpInstance.rotate(data.operations.rotate)
      }

      if (data.operations.flipHorizontal) {
        sharpInstance = sharpInstance.flop()
      }

      if (data.operations.flipVertical) {
        sharpInstance = sharpInstance.flip()
      }

      if (data.operations.crop) {
        const { x, y, width, height } = data.operations.crop
        sharpInstance = sharpInstance.extract({
          left: Math.round(x),
          top: Math.round(y),
          width: Math.round(width),
          height: Math.round(height)
        })
      }

      if (data.operations.resize) {
        const { width, height } = data.operations.resize
        sharpInstance = sharpInstance.resize({
          width: width ? Math.round(width) : undefined,
          height: height ? Math.round(height) : undefined,
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      // Configurer le format de sortie
      switch (data.operations.format) {
        case 'png':
          sharpInstance = sharpInstance.png({
            quality: data.operations.quality || 90
          })
          break
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: data.operations.quality || 90
          })
          break
        case 'jpeg':
        default:
          sharpInstance = sharpInstance.jpeg({
            quality: data.operations.quality || 90
          })
          break
      }

      // Process and save image
      await sharpInstance.toFile(outputPath)

      // Get new image stats
      const stats = await fs.stat(outputPath)

      // Get image metadata to determine actual dimensions
      const metadata = await sharp(outputPath).metadata()

      // Update or create variant record
      if (data.variantId) {
        // Update existing variant
        await prisma.imageVariant.update({
          where: { id: data.variantId },
          data: {
            path: path.relative(process.cwd(), outputPath),
            size: stats.size,
            width: metadata.width || 0,
            height: metadata.height || 0,
          }
        })
      } else {
        // Create new variant
        await prisma.imageVariant.create({
          data: {
            filename: outputFilename,
            path: path.relative(process.cwd(), outputPath),
            width: metadata.width || 0,
            height: metadata.height || 0,
            size: stats.size,
            mimeType: `image/${fileExtension}`,
            variantType: 'crop',
            parameters: data.operations as any,
            imageId: data.imageId,
            userId: data.userId,
          }
        })
      }

      return {
        success: true,
        variantId: data.variantId,
        outputPath: path.relative(process.cwd(), outputPath),
        size: stats.size,
        width: metadata.width || 0,
        height: metadata.height || 0,
        operations: data.operations
      }

    } catch (error) {
      console.error('Image processing error:', error)

      // Update variant with error if it exists
      if (data.variantId) {
        await prisma.imageVariant.update({
          where: { id: data.variantId },
          data: {
            path: '',
            size: 0,
            width: 0,
            height: 0,
          }
        })
      }

      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Méthode utilitaire pour générer des thumbnails
  async generateThumbnail(imageId: string, size: number = 256) {
    return this.process({
      imageId,
      userId: '', // Will be set by caller
      operations: {
        resize: { width: size, height: size },
        format: 'jpeg',
        quality: 80
      }
    })
  }

  // Méthode utilitaire pour générer des previews
  async generatePreview(imageId: string, maxSize: number = 1024) {
    return this.process({
      imageId,
      userId: '', // Will be set by caller
      operations: {
        resize: { width: maxSize, height: maxSize },
        format: 'jpeg',
        quality: 85
      }
    })
  }



  // Méthode pour le recadrage automatique intelligent avec smartcrop.js
  async smartCrop(imageId: string, targetWidth: number, targetHeight: number) {
    console.log(`Smart-cropping image ${imageId} to ${targetWidth}x${targetHeight}`)

    // Get image from database
    const image = await prisma.image.findUnique({
      where: { id: imageId }
    })

    if (!image) {
      throw new Error(`Image not found: ${imageId}`)
    }

    const inputPath = path.join(process.cwd(), image.path)

    try {
      // 1. Utiliser smartcrop.js pour trouver la meilleure zone de recadrage
      const cropResult = await SmartCrop.crop(inputPath, {
        width: targetWidth,
        height: targetHeight,
        imageOperations: nodeImageOperations, // <-- C'est ici qu'on injecte notre pont !
      })

      const bestCrop = cropResult.topCrop
      console.log('Best crop found by smartcrop.js:', bestCrop)

      // 2. Utiliser Sharp pour effectuer le recadrage physique
      const outputDir = path.dirname(inputPath)
      const outputFilename = `smartcrop_${Date.now()}.jpeg`
      const outputPath = path.join(outputDir, outputFilename)

      await sharp(inputPath)
        .extract({
          left: Math.round(bestCrop.x),
          top: Math.round(bestCrop.y),
          width: Math.round(bestCrop.width),
          height: Math.round(bestCrop.height),
        })
        .resize(targetWidth, targetHeight) // Redimensionner à la taille finale
        .jpeg({ quality: 90 })
        .toFile(outputPath)

      // 3. Sauvegarder la variante dans la base de données
      const stats = await fs.stat(outputPath)
      const newMetadata = await sharp(outputPath).metadata()

      const variant = await prisma.imageVariant.create({
        data: {
          filename: outputFilename,
          path: path.relative(process.cwd(), outputPath),
          width: newMetadata.width || 0,
          height: newMetadata.height || 0,
          size: stats.size,
          mimeType: 'image/jpeg',
          variantType: 'smartcrop',
          parameters: {
            targetWidth,
            targetHeight,
            ...bestCrop // Sauvegarder les résultats de l'analyse
          },
          imageId: imageId,
          userId: image.userId,
        }
      })

      return {
        success: true,
        variantId: variant.id,
        outputPath: path.relative(process.cwd(), outputPath),
        size: stats.size,
        width: newMetadata.width || 0,
        height: newMetadata.height || 0,
        cropArea: {
          x: bestCrop.x,
          y: bestCrop.y,
          width: bestCrop.width,
          height: bestCrop.height,
        },
        score: bestCrop.score, // Vous avez maintenant un score de pertinence !
      }

    } catch (error) {
      console.error('Smart-crop error:', error)
      throw new Error(`Failed to smart-crop image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


}

export const imageProcessor = new ImageProcessor()
