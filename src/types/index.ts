export interface User {
  id: string
  email: string
  name?: string
  role: 'USER' | 'ADMIN'
  createdAt: Date
  updatedAt: Date
}

export interface Image {
  id: string
  filename: string
  originalName: string
  path: string
  size: number
  mimeType: string
  width?: number
  height?: number
  description?: string
  tags: string[]
  uploadedAt: Date
  userId: string
  user?: User
}

export interface Job {
  id: string
  type: 'IMAGE_CROP' | 'IMAGE_RESIZE' | 'ZIP_CREATE' | 'VIDEO_PROCESS'
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  data?: any
  result?: any
  error?: string
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  userId: string
  user?: User
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

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

export interface GalleryFilters {
  search?: string
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  userId?: string
}

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type JobType = 'IMAGE_CROP' | 'IMAGE_RESIZE' | 'ZIP_CREATE' | 'VIDEO_PROCESS'
export type UserRole = 'USER' | 'ADMIN'
