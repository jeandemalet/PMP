import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de Prisma
const mockPrisma = {
  gallery: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  image: {
    findMany: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Import des fonctions à tester après les mocks
import { GET as getGalleriesHandler, POST as createGalleryHandler } from '@/app/api/galleries/route';
import { DELETE as deleteGalleryHandler } from '@/app/api/galleries/[id]/route';
import { GET as getImagesHandler } from '@/app/api/galleries/[id]/images/route';

describe('Galerie - Tests d\'Intégration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/galleries', () => {
    it('devrait retourner les galeries de l\'utilisateur', async () => {
      const mockGalleries = [
        {
          id: '1',
          name: 'Galerie 1',
          description: 'Description 1',
          color: '#ff0000',
          createdAt: new Date(),
          _count: { images: 5 },
          images: [
            { id: 'img1', filename: 'test1.jpg', originalName: 'test1.jpg', size: 1000, mimeType: 'image/jpeg', uploadedAt: new Date() },
          ],
        },
      ];

      mockPrisma.gallery.findMany.mockResolvedValue(mockGalleries);

      const request = new Request('http://localhost:3000/api/galleries', {
        headers: {
          'x-user-id': 'user1',
        },
      });

      const response = await getGalleriesHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.galleries).toHaveLength(1);
      expect(data.galleries[0].name).toBe('Galerie 1');
      expect(mockPrisma.gallery.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: {
          _count: { select: { images: true } },
          images: {
            take: 4,
            orderBy: { uploadedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('devrait refuser l\'accès sans authentification', async () => {
      const request = new Request('http://localhost:3000/api/galleries');

      const response = await getGalleriesHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non authentifié');
    });
  });

  describe('POST /api/galleries', () => {
    it('devrait créer une nouvelle galerie', async () => {
      const mockGallery = {
        id: '1',
        name: 'Nouvelle galerie',
        description: 'Description',
        color: '#00ff00',
        createdAt: new Date(),
        _count: { images: 0 },
      };

      mockPrisma.gallery.create.mockResolvedValue(mockGallery);

      const request = new Request('http://localhost:3000/api/galleries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user1',
        },
        body: JSON.stringify({
          name: 'Nouvelle galerie',
          description: 'Description',
          color: '#00ff00',
        }),
      });

      const response = await createGalleryHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Galerie créée avec succès');
      expect(data.gallery.name).toBe('Nouvelle galerie');
      expect(mockPrisma.gallery.create).toHaveBeenCalledWith({
        data: {
          name: 'Nouvelle galerie',
          description: 'Description',
          color: '#00ff00',
          userId: 'user1',
        },
        include: {
          _count: { select: { images: true } },
        },
      });
    });

    it('devrait valider les données d\'entrée', async () => {
      const request = new Request('http://localhost:3000/api/galleries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user1',
        },
        body: JSON.stringify({
          // Nom manquant
          description: 'Description sans nom',
        }),
      });

      const response = await createGalleryHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Données invalides');
    });
  });

  describe('DELETE /api/galleries/[id]', () => {
    it('devrait supprimer une galerie existante', async () => {
      const mockGallery = {
        id: '1',
        name: 'Galerie à supprimer',
        userId: 'user1',
      };

      mockPrisma.gallery.findFirst.mockResolvedValue(mockGallery);
      mockPrisma.gallery.delete.mockResolvedValue(mockGallery);

      const request = new Request('http://localhost:3000/api/galleries/1', {
        headers: {
          'x-user-id': 'user1',
        },
      });

      const response = await deleteGalleryHandler(request as any, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Galerie supprimée avec succès');
      expect(mockPrisma.gallery.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('devrait refuser la suppression d\'une galerie inexistante', async () => {
      mockPrisma.gallery.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/galleries/999', {
        headers: {
          'x-user-id': 'user1',
        },
      });

      const response = await deleteGalleryHandler(request as any, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Galerie non trouvée');
    });
  });

  describe('GET /api/galleries/[id]/images', () => {
    it('devrait retourner les images d\'une galerie', async () => {
      const mockImages = [
        {
          id: '1',
          filename: 'image1.jpg',
          originalName: 'image1.jpg',
          size: 1000,
          mimeType: 'image/jpeg',
          uploadedAt: new Date(),
          width: 800,
          height: 600,
          description: 'Description 1',
          tags: 'tag1,tag2',
        },
      ];

      const mockGallery = {
        id: 'gallery1',
        userId: 'user1',
      };

      mockPrisma.gallery.findFirst.mockResolvedValue(mockGallery);
      mockPrisma.image.findMany.mockResolvedValue(mockImages);

      const request = new Request('http://localhost:3000/api/galleries/gallery1/images', {
        headers: {
          'x-user-id': 'user1',
        },
      });

      const response = await getImagesHandler(request as any, { params: { id: 'gallery1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(1);
      expect(data.images[0].filename).toBe('image1.jpg');
      expect(mockPrisma.image.findMany).toHaveBeenCalledWith({
        where: { galleryId: 'gallery1' },
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          filename: true,
          originalName: true,
          size: true,
          mimeType: true,
          uploadedAt: true,
          width: true,
          height: true,
          description: true,
          tags: true,
        },
      });
    });

    it('devrait refuser l\'accès à une galerie inexistante', async () => {
      mockPrisma.gallery.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/galleries/gallery1/images', {
        headers: {
          'x-user-id': 'user1',
        },
      });

      const response = await getImagesHandler(request as any, { params: { id: 'gallery1' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Galerie non trouvée');
    });
  });
});
