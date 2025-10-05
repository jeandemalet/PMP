import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock des modules externes
vi.mock('bcryptjs');
vi.mock('jsonwebtoken');

// Mock de Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Import des fonctions à tester après les mocks
import { POST as signupHandler } from '@/app/api/auth/signup/route';
import { POST as loginHandler } from '@/app/api/auth/login/route';

describe('Authentification - Tests Unitaires', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hachage des mots de passe', () => {
    it('devrait hacher correctement un mot de passe', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashedPassword';

      (bcrypt.hash as any).mockResolvedValue(hashedPassword);

      const result = await bcrypt.hash(password, 12);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('devrait vérifier correctement un mot de passe', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashedPassword';

      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await bcrypt.compare(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });
  });

  describe('Inscription utilisateur', () => {
    it('devrait créer un utilisateur avec succès', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as any).mockResolvedValue('hashedPassword');

      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await signupHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Utilisateur créé avec succès');
      expect(data.user.email).toBe('test@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            password: 'hashedPassword',
            name: 'Test User',
          }),
        })
      );
    });

    it('devrait refuser l\'inscription avec un email déjà existant', async () => {
      const existingUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Existing User',
        password: 'hashedPassword',
        role: 'USER',
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await signupHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Un utilisateur avec cet email existe déjà');
    });

    it('devrait valider les données d\'entrée', async () => {
      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: '123', // Trop court
        }),
      });

      const response = await signupHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Données invalides');
    });
  });

  describe('Connexion utilisateur', () => {
    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'USER',
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue('mock-jwt-token');

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Connexion réussie');
      expect(data.user.email).toBe('test@example.com');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '1',
          email: 'test@example.com',
          role: 'USER',
        }),
        process.env.NEXTAUTH_SECRET,
        { expiresIn: '7d' }
      );
    });

    it('devrait refuser la connexion avec un mot de passe incorrect', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'USER',
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      });

      const response = await loginHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Email ou mot de passe incorrect');
    });

    it('devrait refuser la connexion avec un utilisateur inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Email ou mot de passe incorrect');
    });
  });

  describe('Génération de tokens JWT', () => {
    it('devrait générer un token JWT valide', () => {
      const payload = {
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
      };

      const secret = 'test-secret';
      const options = { expiresIn: '7d' as const };

      (jwt.sign as any).mockReturnValue('mock-jwt-token');

      const token = jwt.sign(payload, secret, options);

      expect(jwt.sign).toHaveBeenCalledWith(payload, secret, options);
      expect(token).toBe('mock-jwt-token');
    });

    it('devrait vérifier un token JWT valide', () => {
      const token = 'valid-jwt-token';
      const secret = 'test-secret';
      const decoded = { userId: '1', email: 'test@example.com' };

      (jwt.verify as any).mockReturnValue(decoded);

      const result = jwt.verify(token, secret);

      expect(jwt.verify).toHaveBeenCalledWith(token, secret);
      expect(result).toEqual(decoded);
    });

    it('devrait lever une erreur pour un token invalide', () => {
      const token = 'invalid-jwt-token';
      const secret = 'test-secret';

      (jwt.verify as any).mockImplementation(() => {
        throw new Error('invalid token');
      });

      expect(() => jwt.verify(token, secret)).toThrow('invalid token');
    });
  });
});
