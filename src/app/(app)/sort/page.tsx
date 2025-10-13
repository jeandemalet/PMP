'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/auth';
import { Button } from '@/components/ui/button';
import { fetchPublications, createPublication, reorderPublicationImages } from '@/lib/api';
import { notifications } from '@/lib/notifications';

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
  const { user, isAuthenticated } = useAuth();
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [sortableImages, setSortableImages] = useState<SortableImage[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [sortType, setSortType] = useState<'manual' | 'chronological' | 'random' | 'interlaced'>('manual');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Utilisation de TanStack Query pour récupérer les publications
  const { data: publicationsData, isLoading, error } = useQuery({
    queryKey: ['publications'],
    queryFn: fetchPublications,
    enabled: isAuthenticated,
  });

  const publications = publicationsData?.publications || [];

  // Sélectionner automatiquement la première publication quand les données sont chargées
  useEffect(() => {
    if (publications.length > 0 && !selectedPublication) {
      setSelectedPublication(publications[0]);
      setSortableImages(publications[0].images);
    }
  }, [publications, selectedPublication]);

  // Mutation pour créer une publication
  const createPublicationMutation = useMutation({
    mutationFn: createPublication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      notifications.success('Publication créée avec succès');
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Erreur lors de la création de la publication');
    },
  });

  // Mutation pour réorganiser les images
  const reorderImagesMutation = useMutation({
    mutationFn: ({ publicationId, imageOrders }: { publicationId: string; imageOrders: Array<{ imageId: string; position: number }> }) =>
      reorderPublicationImages(publicationId, imageOrders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      notifications.success('Ordre sauvegardé avec succès');
    },
    onError: (error: Error) => {
      notifications.error(error.message || 'Erreur lors de la sauvegarde de l\'ordre');
    },
  });

  const handlePublicationSelect = (publication: Publication) => {
    setSelectedPublication(publication);
    setSortableImages(publication.images);
    setSortType('manual');
  };

  // Fonction pour obtenir le libellé du tri
  const getSortLabel = (type: 'manual' | 'chronological' | 'random' | 'interlaced') => {
    switch (type) {
      case 'manual': return 'Manuel';
      case 'chronological': return 'Chronologique';
      case 'random': return 'Aléatoire';
      case 'interlaced': return 'Entrelacé';
      default: return 'Manuel';
    }
  };

  // Fonctions de tri avancées
  const applySort = (type: 'manual' | 'chronological' | 'random' | 'interlaced') => {
    if (!selectedPublication) return;

    let sortedImages = [...selectedPublication.images];

    switch (type) {
      case 'chronological':
        // Trier par date d'upload (si disponible) ou par ordre alphabétique du nom
        sortedImages.sort((a, b) => {
          const nameA = a.image.originalName.toLowerCase();
          const nameB = b.image.originalName.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;

      case 'random':
        // Tri aléatoire
        for (let i = sortedImages.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sortedImages[i], sortedImages[j]] = [sortedImages[j], sortedImages[i]];
        }
        break;

      case 'interlaced':
        // Tri entrelacé - alterner les images
        if (sortedImages.length > 1) {
          const firstHalf = sortedImages.slice(0, Math.ceil(sortedImages.length / 2));
          const secondHalf = sortedImages.slice(Math.ceil(sortedImages.length / 2));
          sortedImages = [];

          for (let i = 0; i < Math.max(firstHalf.length, secondHalf.length); i++) {
            if (firstHalf[i]) sortedImages.push(firstHalf[i]);
            if (secondHalf[i]) sortedImages.push(secondHalf[i]);
          }
        }
        break;

      case 'manual':
      default:
        // Garder l'ordre actuel (manuel)
        break;
    }

    // Mettre à jour les positions
    const updatedImages = sortedImages.map((img, index) => ({
      ...img,
      position: index,
    }));

    setSortableImages(updatedImages);
    setSortType(type);
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

  const handleSaveOrder = () => {
    if (!selectedPublication) return;

    const imageOrders = sortableImages.map((img, index) => ({
      imageId: img.image.id,
      position: index,
    }));

    reorderImagesMutation.mutate({
      publicationId: selectedPublication.id,
      imageOrders,
    });
  };

  const handleCreatePublication = () => {
    createPublicationMutation.mutate({
      name: 'Nouvelle publication',
      description: 'Créée depuis la page de tri',
    });
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
        <div className="w-full px-4 sm:px-6 lg:px-8">
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
                    {publications.map((publication: Publication) => (
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
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Tri: {selectedPublication.name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {sortType === 'manual'
                          ? 'Glissez les images pour réorganiser la publication'
                          : `Tri appliqué: ${getSortLabel(sortType)}`
                        }
                      </p>
                    </div>

                    {/* Barre d'outils de tri */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 mr-2">Tri:</span>
                      <Button
                        variant={sortType === 'manual' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applySort('manual')}
                        className="text-xs"
                      >
                        Manuel
                      </Button>
                      <Button
                        variant={sortType === 'chronological' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applySort('chronological')}
                        className="text-xs"
                      >
                        Chronologique
                      </Button>
                      <Button
                        variant={sortType === 'random' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applySort('random')}
                        className="text-xs"
                      >
                        Aléatoire
                      </Button>
                      <Button
                        variant={sortType === 'interlaced' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applySort('interlaced')}
                        className="text-xs"
                      >
                        Entrelacé
                      </Button>
                    </div>
                  </div>
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
