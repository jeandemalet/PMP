import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma de validation pour les préférences utilisateur
const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.enum(['fr', 'en', 'es', 'de']).optional(),
  notifications: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  itemsPerPage: z.number().int().min(5).max(100).optional(),
  timezone: z.string().optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
});

// GET /api/me/preferences - Récupérer les préférences de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer les préférences de l'utilisateur
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Si aucune préférence n'existe, retourner les valeurs par défaut
    if (!preferences) {
      preferences = {
        theme: 'light',
        language: 'fr',
        notifications: true,
        autoSave: true,
        itemsPerPage: 20,
        timezone: 'Europe/Paris',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
      } as any;
    }

    return NextResponse.json({
      preferences,
    }, { status: 200 });

  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/me/preferences - Mettre à jour les préférences de l'utilisateur connecté
export async function PUT(request: NextRequest) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updatePreferencesSchema.parse(body);

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Mettre à jour ou créer les préférences
    const updatedPreferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: validatedData,
      create: {
        userId,
        ...validatedData,
      },
    });

    return NextResponse.json(
      {
        message: 'Préférences mises à jour avec succès',
        preferences: updatedPreferences,
      },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erreur lors de la mise à jour des préférences:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/me/preferences - Réinitialiser les préférences aux valeurs par défaut
export async function DELETE(request: NextRequest) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer les préférences existantes (elles seront recréées avec les valeurs par défaut lors du prochain GET)
    await prisma.userPreferences.deleteMany({
      where: { userId },
    });

    return NextResponse.json(
      {
        message: 'Préférences réinitialisées aux valeurs par défaut',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erreur lors de la suppression des préférences:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
