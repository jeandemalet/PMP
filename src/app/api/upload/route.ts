import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { imageQueue } from '@/lib/queue';
import { z } from 'zod';

// Schéma de validation pour l'upload
const uploadSchema = z.object({
  galleryId: z.string().min(1, 'L\'ID de la galerie est requis'),
});

// POST /api/upload - Upload d'images avec traitement asynchrone
export async function POST(request: NextRequest) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const galleryId = formData.get('galleryId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Valider les données
    const { galleryId: validatedGalleryId } = uploadSchema.parse({ galleryId });

    // Vérifier que la galerie existe et appartient à l'utilisateur
    const gallery = await prisma.gallery.findFirst({
      where: {
        id: validatedGalleryId,
        userId,
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: 'Galerie non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.' },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximale: 10MB.' },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique avec une structure organisée
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'bin';
    const filename = `${timestamp}_${randomSuffix}.${fileExtension}`;

    // Créer une structure de répertoires organisée par utilisateur et date
    const fs = await import('fs/promises');
    const path = await import('path');

    // Structure: uploads/userId/year/month/
    const uploadDate = new Date();
    const year = uploadDate.getFullYear();
    const month = String(uploadDate.getMonth() + 1).padStart(2, '0');

    const userUploadsDir = path.join(process.cwd(), 'uploads', userId, year.toString(), month);

    try {
      await fs.access(userUploadsDir);
    } catch {
      await fs.mkdir(userUploadsDir, { recursive: true });
    }

    // Créer d'abord l'entrée en base de données avec un statut temporaire
    const image = await prisma.image.create({
      data: {
        filename,
        originalName: file.name,
        path: '', // Chemin temporairement vide
        size: file.size,
        mimeType: file.type,
        userId,
        galleryId: validatedGalleryId,
      },
    });

    // Sauvegarder le fichier avec le chemin relatif organisé
    const filePath = path.join(userUploadsDir, filename);
    const relativePath = path.relative(process.cwd(), filePath);

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.writeFile(filePath, buffer);

      // Mettre à jour le chemin dans la base de données maintenant que le fichier est sauvegardé
      await prisma.image.update({
        where: { id: image.id },
        data: {
          path: filePath,
        },
      });

      // Ajouter le job à la file d'attente pour le traitement asynchrone
      try {
        await imageQueue.add('process-image', {
          imageId: image.id,
          userId,
          operations: {
            // Pour l'instant, traitement basique
            resize: { width: 1024, height: 1024 }
          }
        });
      } catch (queueError) {
        console.error('Erreur lors de l\'ajout à la file d\'attente:', queueError);
        // Si la queue n'est pas disponible, marquer l'image comme "en attente"
        await prisma.image.update({
          where: { id: image.id },
          data: {
            // Ajouter un champ pour indiquer que l'image attend d'être traitée
            // Vous pouvez ajouter ce champ à votre schéma Prisma si nécessaire
          },
        });
      }
    } catch (fileError) {
      // Si la sauvegarde du fichier échoue, supprimer l'entrée de la base de données
      await prisma.image.delete({
        where: { id: image.id },
      });
      throw fileError;
    }

    return NextResponse.json(
      {
        message: 'Image uploadée avec succès et ajoutée au traitement',
        image: {
          id: image.id,
          filename: image.filename,
          originalName: image.originalName,
          size: image.size,
          mimeType: image.mimeType,
          uploadedAt: image.uploadedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erreur lors de l\'upload:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
