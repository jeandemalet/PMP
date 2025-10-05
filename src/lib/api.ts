// Fonctions API pour l'utilisation avec TanStack Query

// API pour les galeries
export const fetchGalleries = async () => {
  const response = await fetch('/api/galleries');
  if (!response.ok) {
    throw new Error('Erreur lors du chargement des galeries');
  }
  return response.json();
};

export const fetchGallery = async (galleryId: string) => {
  const response = await fetch(`/api/galleries/${galleryId}`);
  if (!response.ok) {
    throw new Error('Erreur lors du chargement de la galerie');
  }
  return response.json();
};

export const createGallery = async (data: { name: string; description?: string }) => {
  const response = await fetch('/api/galleries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la création de la galerie');
  }
  return response.json();
};

export const deleteGallery = async (galleryId: string) => {
  const response = await fetch(`/api/galleries/${galleryId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la suppression de la galerie');
  }
  return response.json();
};

// API pour les images
export const fetchImages = async (params?: {
  galleryId?: string;
  page?: number;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.galleryId) searchParams.set('galleryId', params.galleryId);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`/api/images?${searchParams}`);
  if (!response.ok) {
    throw new Error('Erreur lors du chargement des images');
  }
  return response.json();
};

export const fetchImage = async (imageId: string) => {
  const response = await fetch(`/api/images/${imageId}`);
  if (!response.ok) {
    throw new Error('Erreur lors du chargement de l\'image');
  }
  return response.json();
};

// API pour les publications
export const fetchPublications = async () => {
  const response = await fetch('/api/publications');
  if (!response.ok) {
    throw new Error('Erreur lors du chargement des publications');
  }
  return response.json();
};

export const fetchPublication = async (publicationId: string) => {
  const response = await fetch(`/api/publications/${publicationId}`);
  if (!response.ok) {
    throw new Error('Erreur lors du chargement de la publication');
  }
  return response.json();
};

export const createPublication = async (data: { name: string; description?: string }) => {
  const response = await fetch('/api/publications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Erreur lors de la création de la publication');
  }
  return response.json();
};

// API pour l'export
export const startExport = async (data: {
  publicationIds?: string[];
  imageIds?: string[];
  includeMetadata?: boolean;
  archiveName?: string;
}) => {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Erreur lors du démarrage de l\'export');
  }
  return response.json();
};

export const getExportStatus = async (jobId: string) => {
  const response = await fetch(`/api/export?jobId=${jobId}`);
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération du statut');
  }
  return response.json();
};
