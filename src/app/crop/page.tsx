'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { CropCanvas } from '@/components/crop/CropCanvas';
import { CropFilmstrip } from '@/components/crop/CropFilmstrip';
import { CropToolbar } from '@/components/crop/CropToolbar';

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
  const { user, isAuthenticated } = useAuthStore();
  const searchParams = useSearchParams();
  const imageId = searchParams.get('imageId');

  const [images, setImages] = useState<Image[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isLoading, setIsLoading] = useState(true);
  const [cropMode, setCropMode] = useState<'manual' | 'auto'>('manual');
  const [isProcessing, setIsProcessing] = useState(false);

  // Récupérer les images de la galerie
  const fetchImages = async () => {
    if (!imageId) return;

    setIsLoading(true);
    try {
      // Récupérer l'ID de la galerie depuis l'URL ou l'API
      const imageResponse = await fetch(`/api/images/${imageId}`);
      if (imageResponse.ok) {
        const imageData = await imageResponse.json();

        // Récupérer les images de la même galerie avec pagination
        const galleryId = imageData.image?.galleryId;
        const response = await fetch(`/api/images?galleryId=${galleryId}&limit=100`);
        if (response.ok) {
          const data = await response.json();
          setImages(data.images || []);

          // Trouver l'index de l'image actuelle
          const currentIndex = data.images?.findIndex((img: Image) => img.id === imageId) || 0;
          setCurrentImageIndex(currentIndex);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchImages();
    }
  }, [isAuthenticated, imageId]);

  const currentImage = images[currentImageIndex];

  const handleCrop = async () => {
    if (!currentImage) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/crop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: currentImage.id,
          cropArea,
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

        // TODO: Afficher un message de succès et mettre à jour l'interface
      } else {
        console.error('Erreur lors du recadrage');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    } finally {
      setIsProcessing(false);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                PMP - Recadrage d'images
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
                onClick={handleCrop}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isProcessing ? 'Traitement...' : 'Appliquer le recadrage'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
          {/* Toolbar */}
          <div className="col-span-3">
            <CropToolbar
              cropMode={cropMode}
              onCropModeChange={setCropMode}
              onCrop={handleCrop}
              isProcessing={isProcessing}
            />
          </div>

          {/* Canvas Area */}
          <div className="col-span-6">
            <CropCanvas
              image={currentImage}
              cropArea={cropArea}
              onCropAreaChange={setCropArea}
              cropMode={cropMode}
            />
          </div>

          {/* Filmstrip */}
          <div className="col-span-3">
            <CropFilmstrip
              images={images}
              currentImageIndex={currentImageIndex}
              onImageSelect={setCurrentImageIndex}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
