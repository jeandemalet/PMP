'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/auth';
import { useJobStatus } from '@/lib/hooks/useJobStatus';
import { Button } from '@/components/ui/button';
import { CropCanvas } from '@/components/crop/CropCanvas';
import { CropFilmstrip } from '@/components/crop/CropFilmstrip';
import { CropToolbar } from '@/components/crop/CropToolbar';
import { notifications } from '@/lib/notifications';

interface Image {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  width?: number;
  height?: number;
  mimeType: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CropPage() {
  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const imageId = searchParams.get('imageId');
  const galleryId = searchParams.get('galleryId'); // <-- NOUVEAU
  const queryClient = useQueryClient();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cropAreas, setCropAreas] = useState<Record<string, CropArea>>({});
  const [cropMode, setCropMode] = useState<'manual' | 'auto'>('manual');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Utiliser le hook useJobStatus pour le suivi unifié des jobs
  const { jobStatus, isProcessing, isCompleted, isFailed, progress } = useJobStatus(currentJobId, {
    enabled: !!currentJobId,
    pollingInterval: 2000, // Polling toutes les 2 secondes
    onComplete: (result) => {
      notifications.success('Recadrage automatique terminé avec succès !');
      // Invalider et recharger les données avec TanStack Query
      queryClient.invalidateQueries({ queryKey: ['gallery-images', currentImageData?.image?.galleryId] });
      setCurrentJobId(null);
    },
    onError: (error) => {
      notifications.error(`Échec du recadrage automatique: ${error}`);
      setCurrentJobId(null);
    }
  });

  // Afficher automatiquement les notifications basées sur l'état du job
  useEffect(() => {
    if (isCompleted && jobStatus) {
      notifications.success(`Job terminé avec succès !`);
    }
    if (isFailed && jobStatus?.error) {
      notifications.error(`Échec du job: ${jobStatus.error}`);
    }
  }, [isCompleted, isFailed, jobStatus]);

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
    queryKey: ['gallery-images', galleryId],
    queryFn: async () => {
      if (!galleryId) throw new Error('No gallery ID available');
      const response = await fetch(`/api/images?galleryId=${galleryId}&page=1&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch gallery images');
      return response.json();
    },
    enabled: !!galleryId && isAuthenticated,
  });

  // Mettre à jour les images et l'index quand les données changent
  useEffect(() => {
    if (galleryData?.images) {
      const images = galleryData.images;
      const currentIndex = images.findIndex((img: Image) => img.id === imageId) || 0;
      setCurrentImageIndex(currentIndex);
    }
  }, [galleryData, imageId]);

  const images = galleryData?.images || [];
  const currentImage = images[currentImageIndex];
  const isLoading = isLoadingCurrentImage || isLoadingGallery;

  // Obtenir la zone de recadrage pour l'image actuelle, ou une valeur par défaut
  const currentCropArea = cropAreas[currentImage?.id] || { x: 0, y: 0, width: 200, height: 200 };

  // Créer une fonction pour mettre à jour la zone de recadrage
  const handleCropAreaChange = (newArea: CropArea) => {
    if (!currentImage) return;
    setCropAreas(prev => ({
      ...prev,
      [currentImage.id]: newArea,
    }));
  };



  // Gestionnaire pour le Smart Crop via API avec feedback utilisateur
  const handleSmartCrop = async () => {
    if (!currentImage) return;

    try {
      const response = await fetch('/api/crop/smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: currentImage.id,
          targetWidth: 800,
          targetHeight: 600,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Smart crop démarré:', data);

        // Démarrer le polling en stockant l'ID du job
        setCurrentJobId(data.jobId);

        // Afficher une notification de succès
        notifications.success('Recadrage intelligent démarré ! Vous serez notifié quand il sera terminé.');

      } else {
        const error = await response.json();
        console.error('Erreur lors du smart crop:', error);
        notifications.error(`Erreur lors du recadrage automatique: ${error.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      notifications.error('Erreur de connexion lors du recadrage automatique');
    }
  };

  const handleCrop = async () => {
    if (!currentImage) return;

    try {
      const response = await fetch('/api/crop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: currentImage.id,
          cropArea: currentCropArea,
          rotation: 0,
          flipHorizontal: false,
          flipVertical: false,
          outputFormat: 'jpeg',
          quality: 90,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Recadrage créé:', data);
        notifications.success('Recadrage appliqué avec succès !');
      } else {
        console.error('Erreur lors du recadrage');
        notifications.error('Erreur lors de l\'application du recadrage');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      notifications.error('Erreur de connexion lors du recadrage');
    }
  };

  // Gestionnaire pour les outils de recadrage
  const handleCropTool = (tool: 'bars' | 'split' | 'rotate' | 'ai') => {
    const width = currentImage.width || 800;
    const height = currentImage.height || 600;

    switch (tool) {
      case 'bars':
        // Ajouter des barres blanches autour de la zone de recadrage
        handleCropAreaChange({
          ...currentCropArea,
          x: Math.max(0, currentCropArea.x - 20),
          y: Math.max(0, currentCropArea.y - 20),
          width: Math.min(width, currentCropArea.width + 40),
          height: Math.min(height, currentCropArea.height + 40),
        });
        break;
      case 'split':
        // Diviser l'image en deux parties égales
        const isHorizontal = width > height;
        if (isHorizontal) {
          handleCropAreaChange({
            x: 0,
            y: 0,
            width: Math.floor(width / 2),
            height: height,
          });
        } else {
          handleCropAreaChange({
            x: 0,
            y: 0,
            width: width,
            height: Math.floor(height / 2),
          });
        }
        break;
      case 'rotate':
        // Rotation de 90° de la zone de recadrage
        handleCropAreaChange({
          x: currentCropArea.y,
          y: width - currentCropArea.x - currentCropArea.width,
          width: currentCropArea.height,
          height: currentCropArea.width,
        });
        break;
      case 'ai':
        // Recadrage automatique avec SmartCrop - API call
        handleSmartCrop();
        break;
    }
  };

  // Gestionnaire pour les ratios d'aspect prédéfinis
  const handleAspectRatio = (ratio: string) => {
    if (!currentImage.width || !currentImage.height) return;

    const [widthRatio, heightRatio] = ratio.split(':').map(Number);
    const targetAspectRatio = widthRatio / heightRatio;

    // Conserver le centre de la zone de recadrage actuelle
    const currentCenterX = currentCropArea.x + currentCropArea.width / 2;
    const currentCenterY = currentCropArea.y + currentCropArea.height / 2;

    let cropWidth, cropHeight;

    // Calculer les dimensions en préservant le centre actuel
    const maxWidth = currentImage.width;
    const maxHeight = currentImage.height;

    // Commencer avec la largeur maximale possible
    cropWidth = Math.min(maxWidth, currentCropArea.width);
    cropHeight = cropWidth / targetAspectRatio;

    // Si la hauteur dépasse l'image, ajuster en partant de la hauteur
    if (cropHeight > maxHeight) {
      cropHeight = Math.min(maxHeight, currentCropArea.height);
      cropWidth = cropHeight * targetAspectRatio;
    }

    // S'assurer que les dimensions ne dépassent pas l'image
    cropWidth = Math.min(cropWidth, maxWidth);
    cropHeight = Math.min(cropHeight, maxHeight);

    // Centrer sur le centre actuel préservé
    const newX = Math.max(0, Math.min(currentCenterX - cropWidth / 2, maxWidth - cropWidth));
    const newY = Math.max(0, Math.min(currentCenterY - cropHeight / 2, maxHeight - cropHeight));

    handleCropAreaChange({
      x: Math.floor(newX),
      y: Math.floor(newY),
      width: Math.floor(cropWidth),
      height: Math.floor(cropHeight),
    });
  };

  // Gestionnaire pour les formats Instagram
  const handleInstagramFormat = (format: 'post' | 'story' | 'reel') => {
    if (!currentImage.width || !currentImage.height) return;

    switch (format) {
      case 'post':
        // Format carré Instagram (1:1)
        handleAspectRatio('1:1');
        break;
      case 'story':
        // Format story Instagram (9:16)
        handleAspectRatio('9:16');
        break;
      case 'reel':
        // Format reel Instagram (9:16)
        handleAspectRatio('9:16');
        break;
    }
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
            Sélectionnez une image depuis la galerie pour commencer le recadrage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Navigation d'images - maintenant dans le contenu principal */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center mb-6">
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
          </div>

          <Button
            onClick={handleCrop}
            disabled={isProcessing}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isProcessing ? 'Traitement...' : 'Appliquer le recadrage'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
          {/* Toolbar - Pleine largeur sur mobile, colonne sur desktop */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <CropToolbar
              cropMode={cropMode}
              onCropModeChange={setCropMode}
              onCrop={handleCrop}
              isProcessing={isProcessing}
              onCropTool={handleCropTool}
              onAspectRatio={handleAspectRatio}
              onInstagramFormat={handleInstagramFormat}
            />
          </div>

          {/* Canvas Area - Pleine largeur sur mobile, colonne centrale sur desktop */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <CropCanvas
              image={currentImage}
              cropArea={currentCropArea}
              onCropAreaChange={handleCropAreaChange}
              cropMode={cropMode}
            />
          </div>

          {/* Filmstrip - Pleine largeur sur mobile, colonne sur desktop */}
          <div className="lg:col-span-3 order-3">
            <CropFilmstrip
              images={images}
              currentImageIndex={currentImageIndex}
              onImageSelect={setCurrentImageIndex}
            />
          </div>
        </div>
      </div>
    </>
  );
}
