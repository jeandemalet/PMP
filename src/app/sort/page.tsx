'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';

interface Publication {
  id: string;
  name: string;
  description: string | null;
  scheduledAt: string | null;
  createdAt: string;
  _count: {
    images: number;
  };
  images: Array<{
    id: string;
    position: number;
    image: {
      id: string;
      filename: string;
      originalName: string;
      title: string | null;
      description: string | null;
    };
  }>;
}

interface SortableImage {
  id: string;
  position: number;
  image: {
    id: string;
    filename: string;
    originalName: string;
    title: string | null;
    description: string | null;
  };
}

export default function SortPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [sortableImages, setSortableImages] = useState<SortableImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Récupérer les publications
  const fetchPublications = async () => {
    try {
      const response = await fetch('/api/publications');
      if (response.ok) {
        const data = await response.json();
        setPublications(data.publications);
        // Sélectionner la première publication par défaut
        if (data.publications.length > 0 && !selectedPublication) {
          setSelectedPublication(data.publications[0]);
          setSortableImages(data.publications[0].images);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des publications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPublications();
    }
  }, [isAuthenticated]);

  const handlePublicationSelect = (publication: Publication) => {
    setSelectedPublication(publication);
    setSortableImages(publication.images);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newImages = [...sortableImages];
    const draggedImage = newImages[draggedIndex];

    // Réorganiser les images
    newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    // Mettre à jour les positions
    const updatedImages = newImages.map((img, index) => ({
      ...img,
      position: index,
    }));

    setSortableImages(updatedImages);
  };

  const handleSaveOrder = async () => {
    if (!selectedPublication) return;

    setIsSaving(true);
    try {
      const imageOrders = sortableImages.map((img, index) => ({
        imageId: img.image.id,
        position: index,
      }));

      const response = await fetch(`/api/publications/${selectedPublication.id}/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageOrders }),
      });

      if (response.ok) {
        await fetchPublications(); // Recharger les publications
        console.log('Ordre sauvegardé');
      } else {
        console.error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePublication = async () => {
    try {
      const response = await fetch('/api/publications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Nouvelle publication',
          description: 'Créée depuis la page de tri',
        }),
      });

      if (response.ok) {
        await fetchPublications(); // Recharger les publications
      }
    } catch (error) {
      console.error('Erreur lors de la création de la publication:', error);
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
                PMP - Organisation et Tri
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={handleCreatePublication}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Nouvelle publication
              </Button>

              <Button
                onClick={handleSaveOrder}
                disabled={isSaving || !selectedPublication}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder l\'ordre'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
          {/* Publications Sidebar */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Publications</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {publications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">Aucune publication</p>
                    <p className="text-xs mt-1">Créez votre première publication</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {publications.map((publication) => (
                      <div
                        key={publication.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedPublication?.id === publication.id
                            ? 'bg-indigo-50 border-2 border-indigo-200'
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                        onClick={() => handlePublicationSelect(publication)}
                      >
                        <h3 className="font-medium text-gray-900 truncate">
                          {publication.name}
                        </h3>
                        {publication.description && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {publication.description}
                          </p>
                        )}
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <span>{publication._count.images} images</span>
                          <span className="mx-1">•</span>
                          <span>{new Date(publication.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sortable Grid */}
          <div className="col-span-9">
            {selectedPublication ? (
              <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Tri: {selectedPublication.name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Glissez les images pour réorganiser la publication
                  </p>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  {sortableImages.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium">Aucune image</p>
                        <p className="text-sm">Ajoutez des images à cette publication</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {sortableImages.map((item, index) => (
                        <div
                          key={item.image.id}
                          className="relative group"
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          {/* Image */}
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-indigo-300 transition-colors">
                            {item.image.filename ? (
                              <img
                                src={`/uploads/${item.image.filename}`}
                                alt={item.image.originalName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Position indicator */}
                          <div className="absolute top-2 left-2 w-6 h-6 bg-indigo-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                            {index + 1}
                          </div>

                          {/* Drag indicator */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-5 h-5 bg-gray-900 bg-opacity-50 text-white text-xs rounded flex items-center justify-center">
                              ⋮⋮
                            </div>
                          </div>

                          {/* Image info on hover */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs text-white truncate">
                              {item.image.title || item.image.originalName}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{sortableImages.length} images dans cette publication</span>
                    <span>Glissez pour réorganiser • Position {draggedIndex !== null ? draggedIndex + 1 : 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium">Sélectionnez une publication</p>
                  <p className="text-sm">Choisissez une publication pour organiser ses images</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
