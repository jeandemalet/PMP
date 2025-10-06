'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/auth';
import { Button } from '@/components/ui/button';

interface Image {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  width?: number;
  height?: number;
  mimeType: string;
  title?: string;
  description?: string;
  tags?: string;
  alt?: string;
  caption?: string;
}

interface Metadata {
  id: string;
  title?: string;
  description?: string;
  tags?: string;
  alt?: string;
  caption?: string;
  uploadedAt: string;
  updatedAt: string;
}

export default function DescriptionPage() {
  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const imageId = searchParams.get('imageId');
  const queryClient = useQueryClient();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    alt: '',
    caption: '',
  });

  // Récupérer les données de l'image actuelle pour obtenir le galleryId
  const { data: currentImageData, isLoading: isLoadingCurrentImage } = useQuery({
    queryKey: ['current-image', imageId],
    queryFn: async () => {
      if (!imageId) throw new Error('No image ID provided');
      const response = await fetch(`/api/images/${imageId}`);
      if (!response.ok) throw new Error('Failed to fetch image');
      return response.json();
    },
    enabled: !!imageId && isAuthenticated,
  });

  // Récupérer les images de la galerie avec TanStack Query
  const { data: galleryData, isLoading: isLoadingGallery } = useQuery({
    queryKey: ['gallery-images', currentImageData?.image?.galleryId],
    queryFn: async () => {
      if (!currentImageData?.image?.galleryId) throw new Error('No gallery ID available');
      const response = await fetch(`/api/images?galleryId=${currentImageData.image.galleryId}&page=1&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch gallery images');
      return response.json();
    },
    enabled: !!currentImageData?.image?.galleryId && isAuthenticated,
  });

  // Récupérer les métadonnées de l'image actuelle avec TanStack Query
  const { data: metadata, isLoading: isLoadingMetadata } = useQuery({
    queryKey: ['image-metadata', imageId],
    queryFn: async () => {
      if (!imageId) throw new Error('No image ID provided');
      const response = await fetch(`/api/images/${imageId}/metadata`);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      return response.json();
    },
    enabled: !!imageId && isAuthenticated,
  });

  // Mettre à jour les images et l'index quand les données changent
  useEffect(() => {
    if (galleryData?.images) {
      const images = galleryData.images;
      const currentIndex = images.findIndex((img: Image) => img.id === imageId) || 0;
      setCurrentImageIndex(currentIndex);
    }
  }, [galleryData, imageId]);

  // Mettre à jour le formulaire quand les métadonnées changent
  useEffect(() => {
    if (metadata?.metadata) {
      setFormData({
        title: metadata.metadata.title || '',
        description: metadata.metadata.description || '',
        tags: metadata.metadata.tags || '',
        alt: metadata.metadata.alt || '',
        caption: metadata.metadata.caption || '',
      });
    }
  }, [metadata]);

  const images = galleryData?.images || [];
  const currentImage = images[currentImageIndex];
  const isLoading = isLoadingCurrentImage || isLoadingGallery || isLoadingMetadata;

  const handleSave = async () => {
    if (!currentImage) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/images/${currentImage.id}/metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Invalider et recharger les métadonnées avec TanStack Query
        queryClient.invalidateQueries({ queryKey: ['image-metadata', currentImage.id] });
        console.log('Métadonnées sauvegardées');
      } else {
        console.error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else if (direction === 'next' && currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Accès non autorisé
          </h1>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Aucune image sélectionnée
          </h1>
          <p className="text-gray-600">
            Sélectionnez une image depuis la galerie pour gérer ses métadonnées.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                PMP - Gestion des métadonnées
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Image {currentImageIndex + 1} sur {images.length}
              </span>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleImageNavigation('prev')}
                  disabled={currentImageIndex === 0}
                  variant="outline"
                  size="sm"
                >
                  ← Précédente
                </Button>
                <Button
                  onClick={() => handleImageNavigation('next')}
                  disabled={currentImageIndex === images.length - 1}
                  variant="outline"
                  size="sm"
                >
                  Suivante →
                </Button>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
          {/* Image Preview */}
          <div className="col-span-4">
            <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Aperçu</h2>
              </div>

              <div className="flex-1 p-4 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  {currentImage.filename ? (
                    <img
                      src={`/uploads/${currentImage.filename}`}
                      alt={currentImage.originalName}
                      className="w-full h-auto rounded-lg shadow-md"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  <div className="mt-4 text-center">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentImage.originalName}
                    </p>
                    {currentImage.width && currentImage.height && (
                      <p className="text-xs text-gray-600">
                        {currentImage.width} × {currentImage.height}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Form */}
          <div className="col-span-8">
            <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Métadonnées</h2>
                <p className="text-sm text-gray-600">
                  Modifiez les informations de cette image
                </p>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Titre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Titre de l'image"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      placeholder="Description détaillée de l'image"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => handleInputChange('tags', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="tag1, tag2, tag3"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Séparez les tags par des virgules
                    </p>
                  </div>

                  {/* Texte alternatif */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Texte alternatif (Alt)
                    </label>
                    <input
                      type="text"
                      value={formData.alt}
                      onChange={(e) => handleInputChange('alt', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Description pour l'accessibilité"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Important pour l'accessibilité et le SEO
                    </p>
                  </div>

                  {/* Légende */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Légende
                    </label>
                    <textarea
                      value={formData.caption}
                      onChange={(e) => handleInputChange('caption', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      placeholder="Légende courte pour l'image"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {metadata && (
                      <span>
                        Dernière modification: {new Date(metadata.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      disabled={isSaving}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
