// src/app/api/files/[...path]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 1. Reconstruire le chemin du fichier demandé
    const filePath = params.path.join('/');

    // 2. Sécurité : Empêcher le "Directory Traversal"
    // On s'assure que le chemin demandé reste bien dans le dossier "uploads"
    const baseDir = path.join(process.cwd(), 'uploads');
    const absolutePath = path.join(baseDir, filePath);

    if (!absolutePath.startsWith(baseDir)) {
      return new NextResponse('Accès non autorisé', { status: 403 });
    }

    // 3. Lire le fichier depuis le disque
    const fileBuffer = await fs.readFile(absolutePath);

    // 4. Déterminer le type de contenu (MIME type)
    const mimeType = mime.lookup(absolutePath) || 'application/octet-stream';

    // 5. Renvoyer le fichier dans la réponse
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Fichier non trouvé
      return new NextResponse('Fichier non trouvé', { status: 404 });
    }
    // Autre erreur
    console.error(`Erreur lors du service du fichier: ${params.path.join('/')}`, error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
