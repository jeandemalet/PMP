import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Configuration Redis
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// File d'attente pour le traitement des images (utilise le système worker externe)
export const imageQueue = new Queue('image-processing', { connection });

// File d'attente pour la création de ZIP (utilise le système worker externe)
export const zipQueue = new Queue('zip-creation', { connection });

// Types des données de job - alignés avec le système worker réel
export interface ImageProcessingData {
  imageId: string;
  variantId?: string;
  userId: string;
  operations: {
    crop?: {
      width: number;
      height: number;
      x: number;
      y: number;
    };
    resize?: {
      width: number;
      height: number;
    };
    rotate?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    format?: 'jpeg' | 'png' | 'webp';
    quality?: number;
  };
}

export interface ZipCreationData {
  imageIds: string[];
  userId: string;
  archiveName: string;
  includeMetadata?: boolean;
}

// Interface pour les jobs
export interface JobData {
  id: string;
  type: 'image-processing' | 'zip-creation';
  data: ImageProcessingData | ZipCreationData;
  userId: string;
}

// Fonction utilitaire pour ajouter un job de traitement d'image
export const addImageProcessingJob = async (data: ImageProcessingData) => {
  return await imageQueue.add('process-image', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
};

// Fonction utilitaire pour ajouter un job de création de ZIP
export const addZipCreationJob = async (data: ZipCreationData) => {
  return await zipQueue.add('create-zip', data, {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
};

// Fermeture propre des connexions
process.on('SIGTERM', async () => {
  await imageQueue.close();
  await zipQueue.close();
  connection.disconnect();
});

export default {
  imageQueue,
  zipQueue,
  addImageProcessingJob,
  addZipCreationJob,
};
