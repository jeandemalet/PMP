'use client';

import { useState, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { GallerySkeleton, GalleryEmptySkeleton, GalleryNoImagesSkeleton } from '@/components/ui/skeletons/GallerySkeleton';

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

interface GalleryGridProps {
  gallery: Gallery | null;
  onRefresh: () => void;
  onAddPhotos: () => void;
}

interface Image {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  variants: Array<{
    id: string;
    path: string;
    variantType: string;
    parameters?: any;
  }>;
}

export function GalleryGrid({ gallery, onRefresh, onAddPhotos }: GalleryGridProps) {
  const queryClient = useQueryClient();
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [zoomLevel, setZoomLevel] = useState(4); // Nombre de colonnes par défaut

  // Récupérer les images de la galerie sélectionnée (sans tri serveur)
  const fetchImages = async () => {
    if (!gallery) {
      setImages([]);
      return;
    }

    setIsLoading(true);
    try {
      // Récupérer les images sans paramètres de tri (tri côté client)
      const response = await fetch(`/api/galleries/${gallery.id}/images`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [gallery]);

  // Tri côté client avec useMemo pour réactivité instantanée
  const sortedImages = useMemo(() => {
    const sorted = [...images].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.originalName.localeCompare(b.originalName);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
        default:
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [images, sortBy, sortOrder]);

  const handleImageSelect = (imageId: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.size === 0) return;

    try {
      // Créer la liste des IDs à supprimer
      const idsToDelete = Array.from(selectedImages);

      // Appel API pour supprimer les images
      const response = await fetch('/api/images/batch?ids=' + idsToDelete.join(','), {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Images supprimées:', result);

        // Recharger les images après suppression
        await fetchImages();

        // Vider la sélection
        setSelectedImages(new Set());

        // Invalider les requêtes des galeries pour mettre à jour la sidebar
        queryClient.invalidateQueries({ queryKey: ['galleries'] });

        // Suppression silencieuse - pas de popup
      } else {
        const error = await response.json();
        console.error('Erreur lors de la suppression:', error);
        alert(`Erreur lors de la suppression: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      alert('Erreur réseau lors de la suppression');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Configuration de la virtualisation
  const containerRef = useMemo(() => ({ current: null }), []);

  // Virtualisation avec TanStack Virtual - utilise zoomLevel pour le nombre de colonnes
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(sortedImages.length / zoomLevel),
    getScrollElement: () => containerRef.current,
    estimateSize: () => 200, // Hauteur estimée de chaque ligne (aspect ratio 1:1 + gap)
    overscan: 5, // Nombre de lignes à pré-charger
  });

  // Composant pour une ligne virtualisée
  const VirtualizedRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const startIndex = index * zoomLevel;
    const endIndex = Math.min(startIndex + zoomLevel, sortedImages.length);
    const rowImages = sortedImages.slice(startIndex, endIndex);

    return (
      <div
        className="grid gap-4"
        style={{
          ...style,
          gridTemplateColumns: `repeat(${zoomLevel}, 1fr)`,
        }}
      >
        {rowImages.map((image) => {

          // --- LOGIQUE DE SÉLECTION DE LA VARIANTE ---
          // Cherche une variante de type 'crop' ou 'preview'.
          // Vous pouvez ajuster cette logique selon les types de variantes que votre worker crée.
          const displayVariant = image.variants?.find(v => v.variantType === 'crop' || v.variantType === 'preview');

          // Utilise le chemin de la variante si elle existe, sinon utilise le chemin de l'image originale comme fallback.
          const imageSrc = displayVariant ? `/${displayVariant.path}` : `/${image.path}`;

          // Ajouter la gestion des variantes vidéo si nécessaire
          const isVideo = image.mimeType?.startsWith('video/');

          // Gestion spécifique des variantes vidéo
          let videoVariant = null;
          if (isVideo) {
            videoVariant = image.variants?.find(v => v.variantType === 'thumbnail' || v.variantType === 'preview');
          }

          const finalImageSrc = isVideo && videoVariant ? `/${videoVariant.path}` : imageSrc;

          // Ajouter un indicateur visuel pour les vidéos
          const isVideoFile = image.mimeType?.startsWith('video/');

          // Gestion des métadonnées vidéo pour l'affichage
          const videoDuration = image.variants?.find(v => v.variantType === 'video_process')?.parameters?.duration;
          // --- FIN DE LA LOGIQUE ---

          return (
            <div
              key={image.id}
              className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                selectedImages.has(image.id)
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              data-testid={`gallery-image-${image.id}`}
              data-selected={selectedImages.has(image.id)}
            >
              {/* Image */}
              <div className="w-full h-full bg-gray-100 flex items-center justify-center relative">
                {image.path ? (
                  <img
                    src={finalImageSrc}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Indicateur de type de fichier - visible en permanence en bas à droite */}
                <div className="absolute bottom-2 right-2 z-10">
                  {isVideoFile && (
                    <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                        <path fillRule="evenodd" d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>VIDÉO</span>
                    </div>
                  )}
                </div>

                {/* Checkbox individuelle - visible seulement au hover et en haut à droite */}
                <div
                  className={`absolute top-2 right-2 z-10 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                    selectedImages.has(image.id) ? 'opacity-100' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageSelect(image.id);
                  }}
                >
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                    selectedImages.has(image.id)
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white bg-opacity-80 border-gray-300 hover:border-indigo-400'
                  }`}>
                    {selectedImages.has(image.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>



              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-end">
                <div className="p-2 w-full">
                  <p className="text-xs text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {image.originalName}
                  </p>
                  <p className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatFileSize(image.size)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!gallery) {
    return <GalleryEmptySkeleton />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header avec contrôles de zoom et tri */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{gallery.name}</h2>
            {gallery.description && (
              <p className="text-sm text-gray-600 mt-1">{gallery.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              onClick={onAddPhotos}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center space-x-2"
            >
              <Icon name="add" size={20} />
              <span>Ajouter des photos</span>
            </Button>

            {/* Bouton supprimer - visible seulement s'il y a des images sélectionnées */}
            {selectedImages.size > 0 && (
              <Button
                onClick={handleDeleteSelected}
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center space-x-2"
              >
                <Icon name="delete" size={20} />
                <span>Supprimer ({selectedImages.size})</span>
              </Button>
            )}

            {/* Boutons de sélection - visible seulement s'il y a des images */}
            {images.length > 0 && (
              <Button
                onClick={handleSelectAll}
                size="sm"
                variant="outline"
                className="hover:bg-gray-50"
              >
                {selectedImages.size === images.length && images.length > 0
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </Button>
            )}

            {/* Indicateur de sélection - visible seulement s'il y a des images sélectionnées */}
            {selectedImages.size > 0 && (
              <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                {selectedImages.size} sélectionnée{selectedImages.size > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Contrôles de zoom et tri selon le cahier des charges */}
        {images.length > 0 && (
          <div className="flex items-center space-x-4">
            {/* Contrôle de zoom - Design amélioré */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Taille:</span>
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {[2, 3, 4, 5, 6].map((level) => (
                  <button
                    key={level}
                    onClick={() => setZoomLevel(level)}
                    className={`relative px-3 py-2 rounded-md transition-all duration-200 flex items-center justify-center text-xs font-medium ${
                      zoomLevel === level
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    title={`${level} colonnes`}
                  >
                    <div className="flex items-center space-x-0.5">
                      {Array.from({ length: level }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            zoomLevel === level ? 'bg-indigo-400' : 'bg-gray-400'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sélecteur de tri */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Tri:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'date' | 'name' | 'size');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1"
                data-testid="sort-select"
              >
                <option value="date-desc">Plus récent</option>
                <option value="date-asc">Plus ancien</option>
                <option value="name-asc">Nom A-Z</option>
                <option value="name-desc">Nom Z-A</option>
                <option value="size-desc">Plus lourd</option>
                <option value="size-asc">Plus léger</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <GallerySkeleton />
        ) : images.length === 0 ? (
          <GalleryNoImagesSkeleton />
        ) : (
          <div
            ref={containerRef as any}
            className="h-full overflow-auto"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => (
                <VirtualizedRow
                  key={virtualItem.key}
                  index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {images.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{images.length} images au total</span>
            {selectedImages.size > 0 && (
              <span>{selectedImages.size} sélectionnée{selectedImages.size > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
