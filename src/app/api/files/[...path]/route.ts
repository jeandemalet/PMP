import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import mime from 'mime-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 1. Reconstruire le chemin du fichier
    const filePath = path.join(process.cwd(), 'uploads', ...params.path);

    // 2. Vérifier que le fichier existe
    await fs.access(filePath);

    // 3. Lire le fichier depuis le disque
    const fileBuffer = await fs.readFile(filePath);

    // 4. Déterminer le type MIME
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';

    // 5. Créer la réponse avec gestion correcte du Buffer
    return new NextResponse(Buffer.from(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache d'un an pour les fichiers statiques
      },
    });

  } catch (error) {
    // Gérer le cas où le fichier n'est pas trouvé
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
    }
    // Gérer les autres erreurs
    console.error('Erreur lors du service du fichier:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
