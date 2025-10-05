'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { GallerySidebar } from '@/components/gallery/GallerySidebar';
import { UploadDialog } from '@/components/gallery/UploadDialog';
import { fetchGalleries, createGallery, deleteGallery } from '@/lib/api';
import { notifications } from '@/lib/notifications';

interface Gallery {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  _count: {
    images: number;
  };
  images: Array<{
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  }>;
}

export default function GalleryPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const queryClient = useQueryClient();

  // Utilisation de TanStack Query pour récupérer les galeries
  const { data: galleriesData, isLoading, error } = useQuery({
    queryKey: ['galleries'],
    queryFn: fetchGalleries,
    enabled: isAuthenticated,
  });

  const galleries = galleriesData?.galleries || [];

  // Sélectionner automatiquement la première galerie quand les données sont chargées
  useEffect(() => {
    if (galleries.length > 0 && !selectedGallery) {
      setSelectedGallery(galleries[0]);
    }
  }, [galleries, selectedGallery]);

  // Mutation pour créer une galerie
  const createGalleryMutation = useMutation({
    mutationFn: createGallery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      notifications.success('Galerie créée avec succès');
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Erreur lors de la création de la galerie');
    },
  });

  // Mutation pour supprimer une galerie
  const deleteGalleryMutation = useMutation({
    mutationFn: deleteGallery,
    onSuccess: (_, deletedGalleryId) => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      if (selectedGallery?.id === deletedGalleryId) {
        setSelectedGallery(galleries.find(g => g.id !== deletedGalleryId) || null);
      }
      notifications.success('Galerie supprimée avec succès');
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Erreur lors de la suppression de la galerie');
    },
  });

  const handleCreateGallery = (name: string, description?: string) => {
    createGalleryMutation.mutate({ name, description });
  };

  const handleDeleteGallery = (galleryId: string) => {
    deleteGalleryMutation.mutate(galleryId);
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

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)]">
          {/* Sidebar - Pleine largeur sur mobile, colonne fixe sur desktop */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
            <GallerySidebar
              galleries={galleries}
              selectedGallery={selectedGallery}
              onSelectGallery={setSelectedGallery}
              onCreateGallery={handleCreateGallery}
              onDeleteGallery={handleDeleteGallery}
            />
          </div>

          {/* Main Grid - Pleine largeur sur mobile, flex sur desktop */}
          <div className="flex-1 min-h-0">
            <GalleryGrid
              gallery={selectedGallery}
              onRefresh={fetchGalleries}
            />
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {isUploadOpen && (
        <UploadDialog
          galleries={galleries}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={fetchGalleries}
        />
      )}
    </>
  );
}
