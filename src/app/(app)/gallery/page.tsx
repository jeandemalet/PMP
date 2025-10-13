'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/auth';
import { Button } from '@/components/ui/button';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { GallerySidebar } from '@/components/gallery/GallerySidebar';
import { UploadDialog } from '@/components/gallery/UploadDialog';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
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
    path: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  }>;
}

export default function GalleryPage() {
  const { user, isAuthenticated } = useAuth();
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Largeur par défaut de la sidebar (320px = w-80)
  const [isResizing, setIsResizing] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; gallery: Gallery | null }>({
    isOpen: false,
    gallery: null,
  });
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

  // Gestionnaire de redimensionnement de la sidebar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= 280 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

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
        setSelectedGallery(galleries.find((g: Gallery) => g.id !== deletedGalleryId) || null);
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
    // Trouver la galerie à supprimer pour l'afficher dans la modale
    const galleryToDelete = galleries.find((g: Gallery) => g.id === galleryId);
    if (galleryToDelete) {
      // Afficher la modale de confirmation au lieu de supprimer directement
      setDeleteModal({
        isOpen: true,
        gallery: galleryToDelete,
      });
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

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)]">
          {/* Sidebar - Pleine largeur sur mobile, colonne redimensionnable sur desktop */}
          <div
            className="w-full lg:w-80 mb-6 lg:mb-0 lg:mr-8 relative group"
            style={{
              width: isResizing ? `${sidebarWidth}px` : undefined,
              minWidth: '280px',
              maxWidth: '600px'
            }}
          >
            <GallerySidebar
              galleries={galleries}
              selectedGallery={selectedGallery}
              onSelectGallery={setSelectedGallery}
              onCreateGallery={handleCreateGallery}
              onDeleteGallery={handleDeleteGallery}
            />

            {/* Resize handle - visible seulement sur desktop au hover */}
            <div
              className="hidden lg:block absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity bg-gray-200 hover:bg-gray-300 rounded-full"
              onMouseDown={(e) => {
                setIsResizing(true);
                e.preventDefault();
              }}
            >
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 rounded-full"></div>
            </div>
          </div>

          {/* Main Grid - Pleine largeur sur mobile, flex sur desktop */}
          <div className="flex-1 min-h-0">
            <GalleryGrid
              gallery={selectedGallery}
              onRefresh={fetchGalleries}
              onAddPhotos={() => setIsUploadOpen(true)}
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
          selectedGallery={selectedGallery}
        />
      )}

      {/* Confirmation Modal for Gallery Deletion */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, gallery: null })}
        onConfirm={() => {
          if (deleteModal.gallery) {
            deleteGalleryMutation.mutate(deleteModal.gallery.id);
            setDeleteModal({ isOpen: false, gallery: null });
          }
        }}
        title="Supprimer la galerie"
        message={`Êtes-vous sûr de vouloir supprimer la galerie "${deleteModal.gallery?.name}" ? Cette action est irréversible et supprimera toutes les images qu'elle contient.`}
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        variant="danger"
      />
    </>
  );
}
