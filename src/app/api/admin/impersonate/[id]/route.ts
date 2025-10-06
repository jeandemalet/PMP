import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/admin/impersonate/[id] - Se connecter en tant qu'un autre utilisateur (admin seulement)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer l'ID utilisateur depuis les headers (ajouté par le middleware)
    const currentUserId = request.headers.get('x-user-id');

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur actuel est admin
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé. Fonctionnalité admin uniquement.' },
        { status: 403 }
      );
    }

    const targetUserId = params.id;

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Créer un token JWT pour l'utilisateur cible
    const token = jwt.sign(
      {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        impersonated: true,
        impersonatedBy: currentUserId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return NextResponse.json(
      {
        message: `Connecté en tant que ${targetUser.name || targetUser.email}`,
        user: targetUser,
        token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de l\'impersonation:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/impersonate/[id] - Arrêter l'impersonation et revenir à l'admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer le token depuis les cookies pour extraire impersonatedBy
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Token non trouvé' },
        { status: 401 }
      );
    }

    // Décoder le token pour récupérer impersonatedBy
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: string;
      impersonated?: boolean;
      impersonatedBy?: string;
    };

    if (!decoded.impersonatedBy) {
      return NextResponse.json(
        { error: 'Aucune impersonation en cours' },
        { status: 400 }
      );
    }

    // Récupérer les informations de l'administrateur d'origine
    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.impersonatedBy },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Administrateur d\'origine non trouvé' },
        { status: 404 }
      );
    }

    // Créer un token JWT pour revenir à l'administrateur d'origine
    const newToken = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        impersonated: false,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return NextResponse.json(
      {
        message: `Reconnecté en tant qu'admin ${adminUser.name || adminUser.email}`,
        user: adminUser,
        token: newToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de l\'arrêt de l\'impersonation:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
