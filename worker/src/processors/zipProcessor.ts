import archiver from 'archiver'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import fs from 'fs/promises'
import path from 'path'

// Instance partagée de Prisma déjà configurée dans ../lib/prisma.ts

// Instance partagée de Prisma déjà configurée dans ../lib/prisma.ts
// Cette approche évite de créer plusieurs pools de connexions

export interface ZipProcessData {
  imageIds: string[]
  archiveName?: string
  includeMetadata?: boolean
}

export class ZipProcessor {
  async process(data: ZipProcessData) {
    console.log('Creating ZIP archive:', data)

    if (!data.imageIds || data.imageIds.length === 0) {
      throw new Error('No images provided for ZIP creation')
    }

    // Get images from database
    const images = await prisma.image.findMany({
      where: {
        id: { in: data.imageIds }
      }
    })

    if (images.length === 0) {
      throw new Error('No valid images found')
    }

    const archiveName = data.archiveName || `archive_${uuidv4()}.zip`
    const outputDir = path.join(process.cwd(), 'archives')
    const outputPath = path.join(outputDir, archiveName)

    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true })

      // Create write stream for ZIP file
      const outputFileHandle = await fs.open(outputPath, 'w')
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      })

      // Pipe archive data to the file
      const writeStream = outputFileHandle.createWriteStream()
      archive.pipe(writeStream)

      // Add images and metadata to archive
      for (const image of images) {
        const imagePath = path.join(process.cwd(), image.path)

        try {
          // Check if file exists
          await fs.access(imagePath)
          archive.file(imagePath, { name: image.filename })

          // Add metadata file if requested
          if (data.includeMetadata) {
            const metadata = {
              id: image.id,
              filename: image.filename,
              originalName: image.originalName,
              title: image.title,
              description: image.description,
              alt: image.alt,
              caption: image.caption,
              tags: image.tags,
              width: image.width,
              height: image.height,
              mimeType: image.mimeType,
              uploadedAt: image.uploadedAt,
            }

            const metadataFilename = image.filename.replace(/\.[^/.]+$/, '.txt')
            const metadataContent = Object.entries(metadata)
              .filter(([key, value]) => value !== null && value !== undefined)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')

            archive.append(metadataContent, { name: metadataFilename })
          }
        } catch (error) {
          console.warn(`Skipping missing file: ${imagePath}`)
        }
      }

      // Finalize the archive
      await archive.finalize()

      // Wait for the archive to finish
      await new Promise<void>((resolve, reject) => {
        writeStream.on('close', () => {
          outputFileHandle.close().then(resolve).catch(reject)
        })
        archive.on('error', (error: Error) => {
          outputFileHandle.close().then(() => reject(error)).catch(reject)
        })
      })

      // Get archive stats
      const stats = await fs.stat(outputPath)

      return {
        success: true,
        archivePath: path.relative(process.cwd(), outputPath),
        archiveName,
        size: stats.size,
        imageCount: images.length,
        createdAt: new Date().toISOString()
      }

    } catch (error) {
      console.error('ZIP creation error:', error)
      throw new Error(`Failed to create ZIP archive: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const zipProcessor = new ZipProcessor()
