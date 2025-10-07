import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// TODO: Implémenter une fonction pour envoyer des emails
async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  console.log(`Password reset link for ${email}: ${resetLink}`);
  // Ici, vous intégreriez un service d'email comme Nodemailer, Resend, etc.
  // Exemple : await sendEmail({ to: email, subject: 'Réinitialisation de mot de passe', html: `<a href="${resetLink}">Cliquez ici pour réinitialiser</a>` });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Pour des raisons de sécurité, on ne révèle pas si l'email existe.
    // On envoie une réponse de succès dans tous les cas.
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Le token expire dans 1 heure
      const expires = new Date(Date.now() + 3600 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          identifier: email,
          token: hashedToken,
          expires,
        },
      });

      await sendPasswordResetEmail(email, token);
    }

    return NextResponse.json({ message: 'Si un compte avec cet email existe, un lien de réinitialisation a été envoyé.' }, { status: 200 });

  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
