'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { GallerySidebar } from '@/components/gallery/GallerySidebar';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { UploadDialog } from '@/components/gallery/UploadDialog';
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
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Récupérer les galeries
  const fetchGalleries = async () => {
    try {
      const response = await fetch('/api/galleries');
      if (response.ok) {
        const data = await response.json();
        setGalleries(data.galleries);
        // Sélectionner la première galerie par défaut
        if (data.galleries.length > 0 && !selectedGallery) {
          setSelectedGallery(data.galleries[0]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des galeries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchGalleries();
    }
  }, [isAuthenticated]);

  const handleCreateGallery = async (name: string, description?: string) => {
    // Création optimiste : ajouter immédiatement la galerie à l'état local
    const optimisticGallery: Gallery = {
      id: `temp-${Date.now()}`, // ID temporaire
      name,
      description: description || null,
      color: null,
      createdAt: new Date().toISOString(),
      _count: { images: 0 },
      images: []
    };

    // Ajouter temporairement la galerie à la liste
    setGalleries(prev => [...prev, optimisticGallery]);

    try {
      const response = await fetch('/api/galleries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      if (response.ok) {
        await fetchGalleries(); // Recharger les galeries pour obtenir les vraies données
        notifications.success('Galerie créée avec succès');
      } else {
        // Retirer la galerie temporaire en cas d'erreur
        setGalleries(prev => prev.filter(g => g.id !== optimisticGallery.id));
        const errorData = await response.json();
        notifications.error(errorData.error || 'Erreur lors de la création de la galerie');
      }
    } catch (error) {
      // Retirer la galerie temporaire en cas d'erreur
      setGalleries(prev => prev.filter(g => g.id !== optimisticGallery.id));
      console.error('Erreur lors de la création de la galerie:', error);
      notifications.error('Erreur lors de la création de la galerie');
    }
  };

  const handleDeleteGallery = async (galleryId: string) => {
    try {
      const response = await fetch(`/api/galleries/${galleryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchGalleries(); // Recharger les galeries
        if (selectedGallery?.id === galleryId) {
          setSelectedGallery(galleries.find(g => g.id !== galleryId) || null);
        }
        notifications.success('Galerie supprimée avec succès');
      } else {
        const errorData = await response.json();
        notifications.error(errorData.error || 'Erreur lors de la suppression de la galerie');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la galerie:', error);
      notifications.error('Erreur lors de la suppression de la galerie');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                PMP - Gestionnaire de Médias
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Ajouter des images
              </Button>

              <div className="text-sm text-gray-600">
                Bienvenue, {user?.name || user?.email}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex h-[calc(100vh-12rem)]">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 mr-8">
            <GallerySidebar
              galleries={galleries}
              selectedGallery={selectedGallery}
              onSelectGallery={setSelectedGallery}
              onCreateGallery={handleCreateGallery}
              onDeleteGallery={handleDeleteGallery}
            />
          </div>

          {/* Main Grid */}
          <div className="flex-1">
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
    </div>
  );
}
