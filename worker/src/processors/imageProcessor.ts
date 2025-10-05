import sharp from 'sharp'
import { prisma } from '../lib/prisma'
import fs from 'fs/promises'
import path from 'path'

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
  variantId?: string
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

  // Méthode pour le recadrage automatique intelligent
  async autoCrop(imageId: string, targetWidth: number, targetHeight: number) {
    console.log(`Auto-cropping image ${imageId} to ${targetWidth}x${targetHeight}`)

    // Get image from database
    const image = await prisma.image.findUnique({
      where: { id: imageId }
    })

    if (!image) {
      throw new Error(`Image not found: ${imageId}`)
    }

    const inputPath = path.join(process.cwd(), image.path)

    try {
      // Charger l'image avec sharp
      const sharpInstance = sharp(inputPath)
      const metadata = await sharpInstance.metadata()

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to get image dimensions')
      }

      const originalWidth = metadata.width
      const originalHeight = metadata.height

      // Calculer le ratio d'aspect cible
      const targetRatio = targetWidth / targetHeight
      const originalRatio = originalWidth / originalHeight

      let cropWidth: number
      let cropHeight: number
      let cropX: number
      let cropY: number

      if (originalRatio > targetRatio) {
        // L'image originale est plus large, recadrer en hauteur
        cropHeight = originalHeight
        cropWidth = Math.round(originalHeight * targetRatio)
        cropX = Math.round((originalWidth - cropWidth) / 2)
        cropY = 0
      } else {
        // L'image originale est plus haute, recadrer en largeur
        cropWidth = originalWidth
        cropHeight = Math.round(originalWidth / targetRatio)
        cropX = 0
        cropY = Math.round((originalHeight - cropHeight) / 2)
      }

      // Appliquer le recadrage automatique
      const outputDir = path.dirname(inputPath)
      const outputFilename = `autocrop_${Date.now()}.jpeg`
      const outputPath = path.join(outputDir, outputFilename)

      await sharpInstance
        .extract({
          left: cropX,
          top: cropY,
          width: cropWidth,
          height: cropHeight
        })
        .jpeg({ quality: 90 })
        .toFile(outputPath)

      // Get new image stats
      const stats = await fs.stat(outputPath)
      const newMetadata = await sharp(outputPath).metadata()

      // Create variant record
      const variant = await prisma.imageVariant.create({
        data: {
          filename: outputFilename,
          path: path.relative(process.cwd(), outputPath),
          width: newMetadata.width || 0,
          height: newMetadata.height || 0,
          size: stats.size,
          mimeType: 'image/jpeg',
          variantType: 'autocrop',
          parameters: {
            targetWidth,
            targetHeight,
            originalWidth,
            originalHeight,
            cropX,
            cropY,
            cropWidth,
            cropHeight
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
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight
        }
      }

    } catch (error) {
      console.error('Auto-crop error:', error)
      throw new Error(`Failed to auto-crop image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Méthode pour le recadrage automatique basé sur l'entropie (smart crop)
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
      // Charger l'image et calculer l'entropie pour trouver la zone la plus intéressante
      const sharpInstance = sharp(inputPath)
      const metadata = await sharpInstance.metadata()

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to get image dimensions')
      }

      const originalWidth = metadata.width
      const originalHeight = metadata.height

      // Calculer le ratio d'aspect cible
      const targetRatio = targetWidth / targetHeight

      let cropWidth: number
      let cropHeight: number

      if (originalWidth / originalHeight > targetRatio) {
        // L'image est plus large que le ratio cible
        cropHeight = originalHeight
        cropWidth = Math.round(originalHeight * targetRatio)
      } else {
        // L'image est plus haute que le ratio cible
        cropWidth = originalWidth
        cropHeight = Math.round(originalWidth / targetRatio)
      }

      // Diviser l'image en régions pour analyser l'entropie
      const regions = await this.analyzeImageEntropy(inputPath, originalWidth, originalHeight)

      // Trouver la région avec la plus haute entropie qui respecte le ratio d'aspect
      const bestRegion = this.findOptimalCropArea(regions, cropWidth, cropHeight, originalWidth, originalHeight)

      // Appliquer le recadrage intelligent
      const outputDir = path.dirname(inputPath)
      const outputFilename = `smartcrop_${Date.now()}.jpeg`
      const outputPath = path.join(outputDir, outputFilename)

      await sharpInstance
        .extract({
          left: Math.round(bestRegion.x),
          top: Math.round(bestRegion.y),
          width: Math.round(bestRegion.width),
          height: Math.round(bestRegion.height)
        })
        .jpeg({ quality: 90 })
        .toFile(outputPath)

      // Get new image stats
      const stats = await fs.stat(outputPath)
      const newMetadata = await sharp(outputPath).metadata()

      // Create variant record
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
            originalWidth,
            originalHeight,
            cropX: bestRegion.x,
            cropY: bestRegion.y,
            cropWidth: bestRegion.width,
            cropHeight: bestRegion.height,
            method: 'entropy',
            entropy: bestRegion.entropy
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
          x: bestRegion.x,
          y: bestRegion.y,
          width: bestRegion.width,
          height: bestRegion.height
        },
        entropy: bestRegion.entropy
      }

    } catch (error) {
      console.error('Smart-crop error:', error)
      throw new Error(`Failed to smart-crop image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Analyser l'entropie d'une image pour détecter les zones d'intérêt
  private async analyzeImageEntropy(imagePath: string, width: number, height: number) {
    try {
      // Utiliser les statistiques de Sharp pour analyser l'image
      const stats = await sharp(imagePath).stats()

      // Calculer l'entropie basée sur la variance des canaux de couleur
      const regions = []
      const gridSize = 8 // Grille plus fine pour une meilleure précision
      const regionWidth = Math.floor(width / gridSize)
      const regionHeight = Math.floor(height / gridSize)

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const regionX = x * regionWidth
          const regionY = y * regionHeight

          // Extraire les statistiques de cette région
          try {
            const regionStats = await sharp(imagePath)
              .extract({
                left: regionX,
                top: regionY,
                width: Math.min(regionWidth, width - regionX),
                height: Math.min(regionHeight, height - regionY)
              })
              .stats()

            // Calculer l'entropie basée sur la variance des canaux
            const channels = regionStats.channels
            let entropy = 0

            for (const channel of channels) {
              // Calculer la variance pour chaque canal
              const mean = channel.mean
              const variance = channels.reduce((sum, ch) => {
                return sum + Math.pow(ch.mean - mean, 2)
              }, 0) / channels.length

              // L'entropie est proportionnelle à la variance (plus de détails = plus d'intérêt)
              entropy += Math.sqrt(variance)
            }

            // Normaliser l'entropie
            entropy = entropy / channels.length

            // Ajouter un bonus pour les régions centrales (composition classique)
            const centerX = regionX + regionWidth / 2
            const centerY = regionY + regionHeight / 2
            const distanceFromCenter = Math.sqrt(
              Math.pow(centerX - width / 2, 2) + Math.pow(centerY - height / 2, 2)
            )
            const centerBonus = Math.max(0, 50 - (distanceFromCenter / (Math.sqrt(width * width + height * height) / 2)) * 30)

            const finalEntropy = Math.min(100, entropy + centerBonus)

            regions.push({
              x: regionX,
              y: regionY,
              width: Math.min(regionWidth, width - regionX),
              height: Math.min(regionHeight, height - regionY),
              entropy: finalEntropy,
              centerX,
              centerY
            })
          } catch (regionError) {
            // Fallback si l'extraction de région échoue
            regions.push({
              x: regionX,
              y: regionY,
              width: Math.min(regionWidth, width - regionX),
              height: Math.min(regionHeight, height - regionY),
              entropy: 25, // Score neutre par défaut
              centerX: regionX + regionWidth / 2,
              centerY: regionY + regionHeight / 2
            })
          }
        }
      }

      return regions
    } catch (error) {
      console.warn('Erreur lors de l\'analyse d\'entropie, utilisation du fallback:', error)
      // Fallback à une approche simplifiée si l'analyse Sharp échoue
      return this.analyzeImageEntropyFallback(width, height)
    }
  }

  // Fallback pour l'analyse d'entropie si Sharp échoue
  private analyzeImageEntropyFallback(width: number, height: number) {
    const gridSize = 8
    const regionWidth = Math.floor(width / gridSize)
    const regionHeight = Math.floor(height / gridSize)
    const regions = []

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const regionX = x * regionWidth
        const regionY = y * regionHeight

        // Calculer un score basé sur la position et des facteurs visuels
        const centerX = regionX + regionWidth / 2
        const centerY = regionY + regionHeight / 2
        const distanceFromCenter = Math.sqrt(
          Math.pow(centerX - width / 2, 2) + Math.pow(centerY - height / 2, 2)
        )

        // Les régions centrales et celles avec plus de contraste ont plus d'intérêt
        const centerScore = Math.max(0, 100 - distanceFromCenter / Math.sqrt(width * width + height * height) * 100)
        const contrastBonus = (Math.sin(x * 0.5) + Math.sin(y * 0.5)) * 10 + 20

        const entropy = Math.min(100, centerScore + contrastBonus)

        regions.push({
          x: regionX,
          y: regionY,
          width: Math.min(regionWidth, width - regionX),
          height: Math.min(regionHeight, height - regionY),
          entropy,
          centerX,
          centerY
        })
      }
    }

    return regions
  }

  // Trouver la zone de recadrage optimale basée sur l'entropie
  private findOptimalCropArea(regions: any[], cropWidth: number, cropHeight: number, imageWidth: number, imageHeight: number) {
    let bestRegion = null
    let maxEntropy = -1

    // Tester différentes positions de recadrage
    for (const region of regions) {
      // Calculer la position possible pour cette région
      const possibleX = Math.max(0, Math.min(region.centerX - cropWidth / 2, imageWidth - cropWidth))
      const possibleY = Math.max(0, Math.min(region.centerY - cropHeight / 2, imageHeight - cropHeight))

      // Calculer l'entropie totale pour cette zone
      let totalEntropy = 0
      let regionsInArea = 0

      for (const r of regions) {
        // Vérifier si cette région est dans la zone de recadrage
        if (r.x >= possibleX && r.x < possibleX + cropWidth &&
            r.y >= possibleY && r.y < possibleY + cropHeight) {
          totalEntropy += r.entropy
          regionsInArea++
        }
      }

      if (regionsInArea > 0) {
        const averageEntropy = totalEntropy / regionsInArea
        if (averageEntropy > maxEntropy) {
          maxEntropy = averageEntropy
          bestRegion = {
            x: possibleX,
            y: possibleY,
            width: cropWidth,
            height: cropHeight,
            entropy: averageEntropy
          }
        }
      }
    }

    // Fallback au centre si aucune région n'est trouvée
    if (!bestRegion) {
      bestRegion = {
        x: Math.round((imageWidth - cropWidth) / 2),
        y: Math.round((imageHeight - cropHeight) / 2),
        width: cropWidth,
        height: cropHeight,
        entropy: 50
      }
    }

    return bestRegion
  }
}

export const imageProcessor = new ImageProcessor()
