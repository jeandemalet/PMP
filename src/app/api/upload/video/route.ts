import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { videoQueue } from '@/lib/queue';
import { z } from 'zod';

// Schéma de validation pour l'upload vidéo
const uploadVideoSchema = z.object({
  galleryId: z.string().min(1, 'L\'ID de la galerie est requis'),
});

// POST /api/upload/video - Upload de vidéos avec traitement asynchrone
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
    const { galleryId: validatedGalleryId } = uploadVideoSchema.parse({ galleryId });

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

    // Vérifier le type de fichier vidéo
    const allowedVideoTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ];

    if (!allowedVideoTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier vidéo non supporté. Utilisez MP4, AVI, MOV, WMV, FLV, WebM ou MKV.' },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier (max 500MB pour les vidéos)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier vidéo trop volumineux. Taille maximale: 500MB.' },
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
    const video = await prisma.video.create({
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

      // Mettre à jour le chemin dans la base de données avec le CHEMIN RELATIF
      await prisma.video.update({
        where: { id: video.id },
        data: {
          path: relativePath.replace(/\\/g, '/'), // Remplace les backslashes par des slashes pour la compatibilité URL
        },
      });

      // Ajouter le job à la file d'attente pour le traitement asynchrone
      try {
        await videoQueue.add('process-video', {
          videoId: video.id,
          userId,
          operations: {
            // Traitement vidéo de base
            generateThumbnail: true,
            generatePreview: true,
            format: 'mp4', // Format de sortie
          }
        });
      } catch (queueError) {
        console.error('Erreur lors de l\'ajout à la file d\'attente vidéo:', queueError);
        // Si la queue n'est pas disponible, marquer la vidéo comme "en attente"
        await prisma.video.update({
          where: { id: video.id },
          data: {
            // Ajouter un champ pour indiquer que la vidéo attend d'être traitée
            // Vous pouvez ajouter ce champ à votre schéma Prisma si nécessaire
          },
        });
      }
    } catch (fileError) {
      // Si la sauvegarde du fichier échoue, supprimer l'entrée de la base de données
      await prisma.video.delete({
        where: { id: video.id },
      });
      throw fileError;
    }

    return NextResponse.json(
      {
        message: 'Vidéo uploadée avec succès et ajoutée au traitement',
        video: {
          id: video.id,
          filename: video.filename,
          originalName: video.originalName,
          size: video.size,
          mimeType: video.mimeType,
          uploadedAt: video.uploadedAt,
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

    console.error('Erreur lors de l\'upload vidéo:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
