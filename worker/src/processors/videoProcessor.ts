import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';

export interface VideoProcessingData {
  videoId: string;
  userId: string;
  operations: {
    format?: 'mp4' | 'webm' | 'avi' | 'mov';
    quality?: 'low' | 'medium' | 'high';
    resolution?: '480p' | '720p' | '1080p' | '4k';
    trim?: {
      start: number; // en secondes
      duration: number; // en secondes
    };
    crop?: {
      width: number;
      height: number;
      x: number;
      y: number;
    };
  };
}

export class VideoProcessor {
  private inputPath: string;
  private outputPath: string;
  private tempDir: string;

  constructor(inputPath: string, outputPath: string) {
    this.inputPath = inputPath;
    this.outputPath = outputPath;
    this.tempDir = path.dirname(outputPath);
  }

  async process(data: VideoProcessingData): Promise<string> {
    try {
      // Vérifier que le fichier d'entrée existe
      await fs.access(this.inputPath);

      // Créer le répertoire de sortie si nécessaire
      await fs.mkdir(this.tempDir, { recursive: true });

      // Construire la commande FFmpeg
      let command = ffmpeg(this.inputPath);

      // Appliquer les opérations demandées
      command = this.applyOperations(command, data.operations);

      // Configurer la sortie
      command = command.output(this.outputPath);

      // Retourner une promesse qui se résout quand le traitement est terminé
      return new Promise((resolve, reject) => {
        command
          .on('end', async () => {
            try {
              // Récupérer les informations du fichier traité
              const stats = await fs.stat(this.outputPath);
              const outputInfo = await this.getVideoInfo(this.outputPath);

              resolve(JSON.stringify({
                success: true,
                outputPath: this.outputPath,
                size: stats.size,
                duration: outputInfo.duration,
                resolution: outputInfo.resolution,
                format: outputInfo.format
              }));
            } catch (error) {
              reject(error);
            }
          })
          .on('error', (err: Error) => {
            reject(new Error(`Erreur FFmpeg: ${err.message}`));
          })
          .on('progress', (progress: { percent: number }) => {
            console.log(`Traitement vidéo: ${Math.round(progress.percent)}%`);
          })
          .run();
      });

    } catch (error) {
      throw new Error(`Erreur lors du traitement vidéo: ${error}`);
    }
  }

  private applyOperations(command: any, operations: VideoProcessingData['operations']): any {
    let cmd = command;

    // Conversion de format
    if (operations.format) {
      switch (operations.format) {
        case 'mp4':
          cmd = cmd.videoCodec('libx264').audioCodec('aac');
          break;
        case 'webm':
          cmd = cmd.videoCodec('libvpx').audioCodec('libvorbis');
          break;
        case 'avi':
          cmd = cmd.videoCodec('libxvid').audioCodec('mp3');
          break;
        case 'mov':
          cmd = cmd.videoCodec('libx264').audioCodec('aac');
          break;
      }
    }

    // Qualité
    if (operations.quality) {
      switch (operations.quality) {
        case 'low':
          cmd = cmd.videoBitrate('800k').audioBitrate('128k');
          break;
        case 'medium':
          cmd = cmd.videoBitrate('1200k').audioBitrate('192k');
          break;
        case 'high':
          cmd = cmd.videoBitrate('2500k').audioBitrate('320k');
          break;
      }
    }

    // Résolution
    if (operations.resolution) {
      switch (operations.resolution) {
        case '480p':
          cmd = cmd.size('854x480');
          break;
        case '720p':
          cmd = cmd.size('1280x720');
          break;
        case '1080p':
          cmd = cmd.size('1920x1080');
          break;
        case '4k':
          cmd = cmd.size('3840x2160');
          break;
      }
    }

    // Découpage temporel
    if (operations.trim) {
      cmd = cmd
        .setStartTime(operations.trim.start)
        .setDuration(operations.trim.duration);
    }

    // Recadrage
    if (operations.crop) {
      cmd = cmd
        .videoFilter(`crop=${operations.crop.width}:${operations.crop.height}:${operations.crop.x}:${operations.crop.y}`);
    }

    return cmd;
  }

  private async getVideoInfo(filePath: string): Promise<{
    duration: number;
    resolution: string;
    format: string;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err: Error | null, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('Aucun flux vidéo trouvé'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          resolution: `${videoStream.width}x${videoStream.height}`,
          format: metadata.format.format_name || 'unknown'
        });
      });
    });
  }
}

// Fonction principale de traitement pour BullMQ
export async function processVideo(jobData: VideoProcessingData): Promise<string> {
  const { videoId, userId, operations } = jobData;

  try {
    // Récupérer les informations de la vidéo depuis la base de données
    const video = await prisma.video.findUnique({
      where: { id: videoId, userId },
      select: {
        id: true,
        filename: true,
        path: true,
        mimeType: true,
      },
    });

    if (!video) {
      throw new Error(`Vidéo non trouvée: ${videoId}`);
    }

    // Construire les chemins
    const inputPath = path.join(process.cwd(), 'uploads', video.path);
    const outputFilename = `processed_${Date.now()}_${video.filename}`;
    const outputPath = path.join(process.cwd(), 'uploads', 'processed', outputFilename);

    // Créer le processeur et traiter la vidéo
    const processor = new VideoProcessor(inputPath, outputPath);
    const result = await processor.process(jobData);

    // Parser le résultat pour extraire les informations
    const resultData = JSON.parse(result);
    const { size: outputSize, duration, resolution } = resultData;

    // Sauvegarder les informations du fichier traité dans VideoVariant
    await prisma.videoVariant.create({
      data: {
        videoId: videoId,
        filename: outputFilename,
        path: path.relative(process.cwd(), outputPath).replace(/\\/g, '/'),
        width: resolution ? parseInt(resolution.split('x')[0], 10) : undefined,
        height: resolution ? parseInt(resolution.split('x')[1], 10) : undefined,
        size: outputSize,
        mimeType: `video/${operations.format || 'mp4'}`,
        variantType: 'video_process',
        parameters: operations as any, // Cast en 'any' si TypeScript se plaint
      },
    });

    // Retourner le résultat complet
    return JSON.stringify({
      success: true,
      outputPath: outputPath,
      size: outputSize,
      duration: duration,
      resolution: resolution,
      format: resultData.format,
      note: 'VideoVariant model needs Prisma client regeneration'
    });

  } catch (error) {
    console.error('Erreur lors du traitement vidéo:', error);
    throw error;
  }
}
