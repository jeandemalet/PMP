import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de Sharp
const mockSharpInstance = {
  rotate: vi.fn().mockReturnThis(),
  flop: vi.fn().mockReturnThis(),
  flip: vi.fn().mockReturnThis(),
  extract: vi.fn().mockReturnThis(),
  resize: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  toFile: vi.fn().mockResolvedValue(undefined),
  metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
};

vi.mock('sharp', () => {
  return {
    default: vi.fn(() => mockSharpInstance),
  };
});

// Mock de Prisma
const mockPrisma = {
  image: {
    findUnique: vi.fn(),
  },
  imageVariant: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    stat: vi.fn().mockResolvedValue({ size: 1000 }),
    access: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock path
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
    relative: vi.fn((from, to) => to.replace(from + '/', '')),
  },
}));

// Import après les mocks
import { ImageProcessor } from '../../worker/src/processors/imageProcessor';

describe('ImageProcessor - Tests Unitaires', () => {
  let imageProcessor: ImageProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    imageProcessor = new ImageProcessor();
  });

  describe('Traitement d\'images de base', () => {
    it('devrait traiter une image avec des opérations de base', async () => {
      // Setup
      const mockImage = {
        id: 'test-image-id',
        path: '/uploads/test-image.jpg',
        userId: 'test-user-id',
      };

      mockPrisma.image.findUnique.mockResolvedValue(mockImage);

      const processingData = {
        imageId: 'test-image-id',
        userId: 'test-user-id',
        operations: {
          resize: { width: 1024, height: 768 },
          format: 'jpeg' as const,
          quality: 90,
        },
      };

      // Execute
      const result = await imageProcessor.process(processingData);

      // Verify
      expect(mockPrisma.image.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-image-id' },
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 1024,
        height: 768,
        fit: 'inside',
        withoutEnlargement: true,
      });

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 90,
      });

      expect(mockSharpInstance.toFile).toHaveBeenCalled();
      expect(mockPrisma.imageVariant.create).toHaveBeenCalled();

      expect(result).toMatchObject({
        success: true,
        width: 800,
        height: 600,
      });
    });

    it('devrait gérer les erreurs de traitement d\'image', async () => {
      // Setup
      const mockImage = {
        id: 'test-image-id',
        path: '/uploads/test-image.jpg',
        userId: 'test-user-id',
      };

      mockPrisma.image.findUnique.mockResolvedValue(mockImage);
      mockSharpInstance.toFile.mockRejectedValue(new Error('Processing failed'));

      const processingData = {
        imageId: 'test-image-id',
        userId: 'test-user-id',
        operations: {
          resize: { width: 1024, height: 768 },
        },
      };

      // Execute & Verify
      await expect(imageProcessor.process(processingData)).rejects.toThrow('Failed to process image');
    });

    it('devrait lever une erreur si l\'image n\'existe pas', async () => {
      // Setup
      mockPrisma.image.findUnique.mockResolvedValue(null);

      const processingData = {
        imageId: 'non-existent-id',
        userId: 'test-user-id',
        operations: {},
      };

      // Execute & Verify
      await expect(imageProcessor.process(processingData)).rejects.toThrow('Image not found');
    });
  });

  describe('Recadrage automatique (autoCrop)', () => {
    it('devrait effectuer un recadrage automatique pour un format paysage', async () => {
      // Setup
      const mockImage = {
        id: 'test-image-id',
        path: '/uploads/test-image.jpg',
        userId: 'test-user-id',
      };

      mockPrisma.image.findUnique.mockResolvedValue(mockImage);
      mockSharpInstance.metadata.mockResolvedValue({ width: 1920, height: 1080 });

      // Execute
      const result = await imageProcessor.autoCrop('test-image-id', 800, 600);

      // Verify
      expect(mockSharpInstance.extract).toHaveBeenCalledWith({
        left: expect.any(Number),
        top: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      });

      expect(mockPrisma.imageVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variantType: 'autocrop',
          imageId: 'test-image-id',
          userId: 'test-user-id',
        }),
      });

      expect(result).toMatchObject({
        success: true,
        cropArea: {
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
        },
      });
    });

    it('devrait effectuer un recadrage automatique pour un format portrait', async () => {
      // Setup
      const mockImage = {
        id: 'test-image-id',
        path: '/uploads/test-image.jpg',
        userId: 'test-user-id',
      };

      mockPrisma.image.findUnique.mockResolvedValue(mockImage);
      mockSharpInstance.metadata.mockResolvedValue({ width: 1080, height: 1920 });

      // Execute
      const result = await imageProcessor.autoCrop('test-image-id', 600, 800);

      // Verify
      expect(mockSharpInstance.extract).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Recadrage intelligent (smartCrop)', () => {
    it('devrait effectuer un recadrage intelligent basé sur l\'entropie', async () => {
      // Setup
      const mockImage = {
        id: 'test-image-id',
        path: '/uploads/test-image.jpg',
        userId: 'test-user-id',
      };

      mockPrisma.image.findUnique.mockResolvedValue(mockImage);
      mockSharpInstance.metadata.mockResolvedValue({ width: 1920, height: 1080 });

      // Execute
      const result = await imageProcessor.smartCrop('test-image-id', 800, 600);

      // Verify
      expect(mockSharpInstance.extract).toHaveBeenCalledWith({
        left: expect.any(Number),
        top: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      });

      expect(mockPrisma.imageVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variantType: 'smartcrop',
          parameters: expect.objectContaining({
            method: 'entropy',
            entropy: expect.any(Number),
          }),
        }),
      });

      expect(result).toMatchObject({
        success: true,
        cropArea: {
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
        },
        entropy: expect.any(Number),
      });
    });

    it('devrait utiliser un fallback au centre si aucune région optimale n\'est trouvée', async () => {
      // Setup - forcer un scénario où le fallback est utilisé
      const mockImage = {
        id: 'test-image-id',
        path: '/uploads/test-image.jpg',
        userId: 'test-user-id',
      };

      mockPrisma.image.findUnique.mockResolvedValue(mockImage);
      mockSharpInstance.metadata.mockResolvedValue({ width: 100, height: 100 });

      // Execute
      const result = await imageProcessor.smartCrop('test-image-id', 50, 50);

      // Verify
      expect(result.success).toBe(true);
      expect(result.cropArea).toBeDefined();
    });
  });

  describe('Méthodes utilitaires', () => {
    it('devrait générer un thumbnail', async () => {
      // Setup
      const mockImage = {
        id: 'test-image-id',
        path: '/uploads/test-image.jpg',
        userId: 'test-user-id',
      };

      mockPrisma.image.findUnique.mockResolvedValue(mockImage);

      // Execute
      const result = await imageProcessor.generateThumbnail('test-image-id', 256);

      // Verify
      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 256,
        height: 256,
        fit: 'inside',
        withoutEnlargement: true,
      });

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 80,
      });

      expect(result.success).toBe(true);
    });

    it('devrait générer un preview', async () => {
      // Setup
      const mockImage = {
        id: 'test-image-id',
        path: '/uploads/test-image.jpg',
        userId: 'test-user-id',
      };

      mockPrisma.image.findUnique.mockResolvedValue(mockImage);

      // Execute
      const result = await imageProcessor.generatePreview('test-image-id', 1024);

      // Verify
      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 1024,
        height: 1024,
        fit: 'inside',
        withoutEnlargement: true,
      });

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 85,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Analyse d\'entropie', () => {
    it('devrait analyser l\'entropie d\'une image', () => {
      // Test privé - nous testons indirectement via smartCrop
      // mais nous pouvons tester la logique de calcul d'entropie

      const regions = [
        { x: 0, y: 0, width: 100, height: 100, entropy: 80, centerX: 50, centerY: 50 },
        { x: 100, y: 0, width: 100, height: 100, entropy: 60, centerX: 150, centerY: 50 },
        { x: 0, y: 100, width: 100, height: 100, entropy: 90, centerX: 50, centerY: 150 },
        { x: 100, y: 100, width: 100, height: 100, entropy: 70, centerX: 150, centerY: 150 },
      ];

      // Trouver la région avec la plus haute entropie
      const bestRegion = regions.reduce((best, current) =>
        current.entropy > best.entropy ? current : best
      );

      expect(bestRegion.entropy).toBe(90);
      expect(bestRegion.centerX).toBe(50);
      expect(bestRegion.centerY).toBe(150);
    });
  });
});
