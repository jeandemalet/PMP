import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // En développement, utiliser pino-pretty pour des logs lisibles
  transport: process.env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // En production, formatter JSON structuré pour les outils de monitoring
  formatters: {
    level: (label) => {
      return { level: label };
    },
    log: (obj) => {
      const { level, ...log } = obj;
      return { ...log, level };
    },
  },
  // Ajouter des informations contextuelles utiles
  base: {
    pid: process.pid,
    hostname: process.env.NODE_ENV !== 'production' ? 'dev' : undefined,
  },
  // Configuration pour les outils de monitoring en production
  ...(process.env.NODE_ENV === 'production' && {
    redact: ['password', 'token', 'authorization'], // Masquer les données sensibles
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
});

export default logger;

// Logger spécialisé pour les requêtes HTTP
export const httpLogger = logger.child({ component: 'http' });

// Logger spécialisé pour les jobs/workers
export const jobLogger = logger.child({ component: 'jobs' });

// Logger spécialisé pour la base de données
export const dbLogger = logger.child({ component: 'database' });

// Logger spécialisé pour l'authentification
export const authLogger = logger.child({ component: 'auth' });

// Logger spécialisé pour les erreurs
export const errorLogger = logger.child({ component: 'errors' });
