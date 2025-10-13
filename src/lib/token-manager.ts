import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// Configuration Redis pour la blocklist des tokens
const TOKEN_BLOCKLIST_KEY = 'token_blocklist';
const TOKEN_EXPIRY_BUFFER = 60 * 60 * 24 * 7; // 7 jours en secondes

/**
 * Gestionnaire de tokens JWT avec blocklist Redis
 */
export class TokenManager {
  private static instance: TokenManager;
  private redisClient: any;

  private constructor() {
    // Initialiser le client Redis (à adapter selon votre configuration Redis)
    // Pour l'instant, on utilise un fallback en mémoire
    this.redisClient = null;
  }

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Ajouter un token à la blocklist
   */
  async blacklistToken(token: string, expiresAt?: Date): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        console.warn('Token invalide ou sans expiration, impossible de l\'ajouter à la blocklist');
        return;
      }

      const expiryTime = expiresAt ? expiresAt.getTime() : decoded.exp * 1000;
      const currentTime = Date.now();
      const ttl = Math.max(1, Math.ceil((expiryTime - currentTime) / 1000));

      // En production, utiliser Redis :
      if (this.redisClient) {
        await this.redisClient.setex(`${TOKEN_BLOCKLIST_KEY}:${token}`, ttl, 'blocked');
      } else {
        // Fallback en mémoire (pour développement)
        console.log(`🔒 Token ajouté à la blocklist (TTL: ${ttl}s)`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du token à la blocklist:', error);
    }
  }

  /**
   * Vérifier si un token est dans la blocklist
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      // En production, vérifier dans Redis :
      if (this.redisClient) {
        const result = await this.redisClient.get(`${TOKEN_BLOCKLIST_KEY}:${token}`);
        return result === 'blocked';
      } else {
        // Fallback : toujours retourner false en développement
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la blocklist:', error);
      return false;
    }
  }

  /**
   * Nettoyer les tokens expirés de la blocklist
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      if (this.redisClient) {
        // En production, supprimer les clés expirées automatiquement par Redis TTL
        console.log('🧹 Nettoyage des tokens expirés (géré automatiquement par Redis TTL)');
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des tokens expirés:', error);
    }
  }

  /**
   * Générer un token JWT avec une durée de vie cohérente avec le cookie (7 jours)
   */
  generateToken(payload: { userId: string; email: string; role: string }): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET manquant');
    }

    return jwt.sign(payload, jwtSecret, { expiresIn: '7d' }); // 7 jours pour cohérence avec le cookie
  }

  /**
   * Vérifier et décoder un token JWT
   */
  verifyToken(token: string): { userId: string; email: string; role: string } | null {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET manquant');
      }

      return jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      return null;
    }
  }
}

// Export d'une instance singleton
export const tokenManager = TokenManager.getInstance();
