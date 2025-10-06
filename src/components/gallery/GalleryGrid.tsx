'use client';

import { useState, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';

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

interface GalleryGridProps {
  gallery: Gallery | null;
  onRefresh: () => void;
}

interface Image {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export function GalleryGrid({ gallery, onRefresh }: GalleryGridProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [zoomLevel, setZoomLevel] = useState(4); // Nombre de colonnes par défaut

  // Récupérer les images de la galerie sélectionnée
  const fetchImages = async () => {
    if (!gallery) {
      setImages([]);
      return;
    }

    setIsLoading(true);
    try {
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

  // Re-déclencher fetchImages quand les paramètres de tri changent
  useEffect(() => {
    if (gallery) {
      fetchImages();
    }
  }, [sortBy, sortOrder]);

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Configuration de la virtualisation
  const containerRef = useMemo(() => ({ current: null }), []);

  // Calculer le nombre de colonnes basé sur la largeur du conteneur
  const getColumnCount = () => {
    if (typeof window === 'undefined') return 6; // Default pour SSR
    const width = window.innerWidth;
    if (width < 768) return 2; // Mobile
    if (width < 1024) return 3; // Tablet
    if (width < 1280) return 4; // Desktop moyen
    return 6; // Desktop large
  };

  const [columnCount, setColumnCount] = useState(getColumnCount());

  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getColumnCount());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Virtualisation avec TanStack Virtual
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(images.length / columnCount),
    getScrollElement: () => containerRef.current,
    estimateSize: () => 200, // Hauteur estimée de chaque ligne (aspect ratio 1:1 + gap)
    overscan: 5, // Nombre de lignes à pré-charger
  });

  // Composant pour une ligne virtualisée
  const VirtualizedRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const startIndex = index * zoomLevel;
    const endIndex = Math.min(startIndex + zoomLevel, images.length);
    const rowImages = images.slice(startIndex, endIndex);

    return (
      <div
        className="grid gap-4"
        style={{
          ...style,
          gridTemplateColumns: `repeat(${zoomLevel}, 1fr)`,
        }}
      >
        {rowImages.map((image) => (
          <div
            key={image.id}
            className={`group relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
              selectedImages.has(image.id)
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleImageSelect(image.id)}
          >
            {/* Image */}
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              {image.filename ? (
                <img
                  src={`/uploads/${image.filename}`}
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
            </div>

            {/* Selection overlay */}
            {selectedImages.has(image.id) && (
              <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex items-center justify-center">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

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
        ))}
      </div>
    );
  };

  if (!gallery) {
    return (
      <div className="bg-white rounded-lg shadow-sm border h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-lg font-medium">Sélectionnez une galerie</p>
          <p className="text-sm">Choisissez une galerie dans la sidebar pour voir ses images</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header avec contrôles de zoom et tri */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{gallery.name}</h2>
            {gallery.description && (
              <p className="text-sm text-gray-600 mt-1">{gallery.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {images.length > 0 && (
              <>
                <Button
                  onClick={handleSelectAll}
                  size="sm"
                  variant="outline"
                >
                  {selectedImages.size === images.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </Button>
                {selectedImages.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedImages.size} sélectionnée{selectedImages.size > 1 ? 's' : ''}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Contrôles de zoom et tri selon le cahier des charges */}
        {images.length > 0 && (
          <div className="flex items-center space-x-4">
            {/* Contrôle de zoom */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Zoom:</span>
              <div className="flex items-center space-x-1">
                {[2, 3, 4, 5, 6].map((level) => (
                  <Button
                    key={level}
                    onClick={() => setZoomLevel(level)}
                    size="sm"
                    variant={zoomLevel === level ? "default" : "outline"}
                    className="w-8 h-8 p-0"
                  >
                    {level}
                  </Button>
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
              >
                <option value="date-desc">📅 Plus récent</option>
                <option value="date-asc">📅 Plus ancien</option>
                <option value="name-asc">🔤 Nom A-Z</option>
                <option value="name-desc">🔤 Nom Z-A</option>
                <option value="size-desc">📏 Plus lourd</option>
                <option value="size-asc">📏 Plus léger</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium">Aucune image</p>
              <p className="text-sm">Ajoutez des images à cette galerie</p>
            </div>
          </div>
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
