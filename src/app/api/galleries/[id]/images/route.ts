import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour ajouter une image à une galerie
const addImageToGallerySchema = z.object({
  imageId: z.string().min(1, 'L\'ID de l\'image est requis'),
});

// GET /api/galleries/[id]/images - Récupérer toutes les images d'une galerie
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const galleryId = params.id;

    // Vérifier que la galerie existe et appartient à l'utilisateur
    const gallery = await prisma.gallery.findFirst({
      where: {
        id: galleryId,
        userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: 'Galerie non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer les images de la galerie
    const images = await prisma.image.findMany({
      where: { galleryId },
      select: {
        id: true,
        filename: true,
        originalName: true,
        title: true,
        description: true,
        uploadedAt: true,
        width: true,
        height: true,
      },
      orderBy: {
        uploadedAt: 'asc',
      },
    });

    return NextResponse.json(
      {
        gallery,
        images,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des images de la galerie:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/galleries/[id]/images - Ajouter une image à une galerie
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const galleryId = params.id;
    const body = await request.json();
    const { imageId } = addImageToGallerySchema.parse(body);

    // Vérifier que la galerie existe et appartient à l'utilisateur
    const gallery = await prisma.gallery.findFirst({
      where: {
        id: galleryId,
        userId,
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: 'Galerie non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'image existe et appartient à l'utilisateur
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si l'image est déjà dans la galerie
    const existingImage = await prisma.image.findFirst({
      where: {
        id: imageId,
        galleryId,
      },
    });

    if (existingImage) {
      return NextResponse.json(
        { error: 'L\'image est déjà dans cette galerie' },
        { status: 400 }
      );
    }

    // Mettre à jour l'image pour l'ajouter à la galerie
    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: { galleryId },
      select: {
        id: true,
        filename: true,
        originalName: true,
        title: true,
        description: true,
        uploadedAt: true,
        width: true,
        height: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Image ajoutée à la galerie avec succès',
        image: updatedImage,
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

    console.error('Erreur lors de l\'ajout de l\'image à la galerie:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/galleries/[id]/images - Retirer toutes les images d'une galerie
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const galleryId = params.id;

    // Vérifier que la galerie existe et appartient à l'utilisateur
    const gallery = await prisma.gallery.findFirst({
      where: {
        id: galleryId,
        userId,
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: 'Galerie non trouvée' },
        { status: 404 }
      );
    }

    // Retirer toutes les images de la galerie (mettre leur galleryId à null)
    await prisma.image.updateMany({
      where: { galleryId },
      data: { galleryId: undefined },
    });

    return NextResponse.json(
      { message: 'Toutes les images ont été retirées de la galerie' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors du retrait des images de la galerie:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
