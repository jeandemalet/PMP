'use client';

import { useState } from 'react';
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
  isPending?: boolean; // Pour l'UI optimiste
}

interface GallerySidebarProps {
  galleries: Gallery[];
  selectedGallery: Gallery | null;
  onSelectGallery: (gallery: Gallery) => void;
  onCreateGallery: (name: string, description?: string) => void;
  onDeleteGallery: (galleryId: string) => void;
}

export function GallerySidebar({
  galleries,
  selectedGallery,
  onSelectGallery,
  onCreateGallery,
  onDeleteGallery,
}: GallerySidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [newGalleryDescription, setNewGalleryDescription] = useState('');

  const handleCreateGallery = () => {
    if (newGalleryName.trim()) {
      onCreateGallery(newGalleryName.trim(), newGalleryDescription.trim() || undefined);
      setNewGalleryName('');
      setNewGalleryDescription('');
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateGallery();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewGalleryName('');
      setNewGalleryDescription('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Galeries</h2>
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            + Nouvelle
          </Button>
        </div>
      </div>

      {/* Gallery List */}
      <div className="flex-1 overflow-y-auto">
        {galleries.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">Aucune galerie</p>
            <p className="text-xs mt-1">Créez votre première galerie</p>
          </div>
        ) : (
          <div className="p-2">
            {galleries.map((gallery) => (
              <div
                key={gallery.id}
                className={`group relative p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                  selectedGallery?.id === gallery.id
                    ? 'bg-indigo-50 border-2 border-indigo-200'
                    : 'hover:bg-gray-50 border-2 border-transparent'
                } ${gallery.isPending ? 'opacity-60' : ''}`}
                onClick={() => onSelectGallery(gallery)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {gallery.name}
                      </h3>
                      {gallery.isPending && (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></div>
                          <span className="text-xs text-indigo-600 ml-1">Création...</span>
                        </div>
                      )}
                    </div>
                    {gallery.description && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {gallery.description}
                      </p>
                    )}
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <span>{gallery._count.images} images</span>
                      <span className="mx-1">•</span>
                      <span>{new Date(gallery.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Delete button - visible on hover and only for non-pending galleries */}
                  {!gallery.isPending && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Êtes-vous sûr de vouloir supprimer cette galerie ?')) {
                          onDeleteGallery(gallery.id);
                        }
                      }}
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      ×
                    </Button>
                  )}
                </div>

                {/* Preview images */}
                {gallery.images.length > 0 && (
                  <div className="mt-3 flex -space-x-2">
                    {gallery.images.slice(0, 4).map((image, index) => (
                      <div
                        key={image.id}
                        className="w-8 h-8 rounded border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
                        style={{
                          backgroundImage: `url(/uploads/${image.filename})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          zIndex: 4 - index,
                        }}
                      >
                        {!image.filename && image.originalName.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {gallery._count.images > 4 && (
                      <div className="w-8 h-8 rounded border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        +{gallery._count.images - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Gallery Form */}
      {isCreating && (
        <div className="p-4 border-t bg-gray-50">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nom de la galerie"
              value={newGalleryName}
              onChange={(e) => setNewGalleryName(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
            <textarea
              placeholder="Description (optionnelle)"
              value={newGalleryDescription}
              onChange={(e) => setNewGalleryDescription(e.target.value)}
              onKeyDown={handleKeyPress}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
            <div className="flex space-x-2">
              <Button
                onClick={handleCreateGallery}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Créer
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(false);
                  setNewGalleryName('');
                  setNewGalleryDescription('');
                }}
                size="sm"
                variant="outline"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
