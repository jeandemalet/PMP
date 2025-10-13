// src/app/api/admin/users/[id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';
import { z } from 'zod';

const updateUserSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

async function updateUserHandler(
  request: AuthenticatedRequest,
  context?: { params: { id: string } }
) {
  if (!context?.params) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  // Vérifier que l'utilisateur connecté est admin
  if (request.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé - Droits administrateur requis' }, { status: 403 });
  }

  const userId = context.params.id;

  try {
    const body = await request.json();
    const { role, name, email } = updateUserSchema.parse(body);

    // Vérifier que l'utilisateur cible existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Empêcher un admin de modifier son propre rôle
    if (userId === request.user.id) {
      return NextResponse.json({ error: 'Impossible de modifier son propre rôle' }, { status: 400 });
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role !== undefined && { role }),
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: 'Utilisateur mis à jour avec succès',
      user: updatedUser,
    }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error(`Erreur lors de la mise à jour de l'utilisateur ${userId}:`, error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export const PATCH = withAuth(updateUserHandler);
