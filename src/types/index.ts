/**
 * Types spécifiques à l'application PMP
 *
 * Pour les modèles de données, utilisez les types générés par Prisma :
 * import { User, Image, Job, Publication, Gallery, Role, JobType, JobStatus } from '@prisma/client'
 */

// Interface pour les préférences utilisateur avec validation
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: 'fr' | 'en' | 'es' | 'de';
  notifications?: boolean;
  autoSave?: boolean;
  itemsPerPage?: number;
  timezone?: string;
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12h' | '24h';
}

// Types utilitaires pour les réponses API
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Types pour la pagination
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Types pour le traitement d'images
export interface CropParams {
  x: number
  y: number
  width: number
  height: number
}

export interface ResizeParams {
  width?: number
  height?: number
  quality?: number
}

export interface ImageProcessParams {
  operation: 'crop' | 'resize'
  params: CropParams | ResizeParams
}

// Types pour les filtres de recherche
export interface GalleryFilters {
  search?: string
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  userId?: string
}
