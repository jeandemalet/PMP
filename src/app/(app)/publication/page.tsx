'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/auth';
import { Button } from '@/components/ui/button';
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

export default function PublicationPage() {
  const { user, isAuthenticated } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Récupérer les publications prêtes à être exportées
  const fetchPublications = async () => {
    try {
      const response = await fetch('/api/publications');
      if (response.ok) {
        const data = await response.json();
        setPublications(data.publications);
        // Sélectionner la première publication par défaut
        if (data.publications.length > 0 && !selectedPublication) {
          setSelectedPublication(data.publications[0]);
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
  };

  const handleExport = async () => {
    if (!selectedPublication) return;

    setIsExporting(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicationIds: [selectedPublication.id],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Export démarré:', data);

        // Afficher une notification de succès
        notifications.success('Export démarré avec succès ! Vous serez notifié quand il sera terminé.');

        // Recharger les publications pour mettre à jour les statuts
        await fetchPublications();
      } else {
        const error = await response.json();
        notifications.error(`Erreur lors de l'export: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      notifications.error('Erreur de connexion lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSchedulePublication = async () => {
    if (!selectedPublication) return;

    const scheduledDate = prompt('Entrez la date de programmation (YYYY-MM-DD HH:mm):');
    if (!scheduledDate) return;

    try {
      const response = await fetch(`/api/publications/${selectedPublication.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledAt: scheduledDate,
        }),
      });

      if (response.ok) {
        notifications.success('Publication programmée avec succès !');
        await fetchPublications();
      } else {
        const error = await response.json();
        notifications.error(`Erreur lors de la programmation: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      notifications.error('Erreur de connexion lors de la programmation');
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
                PMP - Publication et Export
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={handleSchedulePublication}
                disabled={!selectedPublication}
                variant="outline"
                className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
              >
                📅 Programmer
              </Button>

              <Button
                onClick={handleExport}
                disabled={isExporting || !selectedPublication}
                className="bg-green-600 hover:bg-green-700"
              >
                {isExporting ? 'Export en cours...' : '🚀 Exporter'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
          {/* Publications Sidebar */}
          <div className="col-span-4">
            <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Publications</h2>
                <p className="text-sm text-gray-600">
                  Sélectionnez une publication à exporter
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {publications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">Aucune publication</p>
                    <p className="text-xs mt-1">Créez d'abord une publication</p>
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
                        {publication.scheduledAt && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              📅 Programmé: {new Date(publication.scheduledAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Publication Details and Preview */}
          <div className="col-span-8">
            {selectedPublication ? (
              <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedPublication.name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {selectedPublication.description || 'Aucune description'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {selectedPublication._count.images} images
                      </p>
                      <p className="text-xs text-gray-500">
                        Créée le {new Date(selectedPublication.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  {selectedPublication.images.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium">Aucune image</p>
                        <p className="text-sm">Cette publication ne contient aucune image</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <h3 className="text-md font-medium text-gray-900 mb-2">
                          Aperçu de la publication ({selectedPublication.images.length} images)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                          {selectedPublication.images.map((item, index) => (
                            <div key={item.image.id} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
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

                              {/* Image info on hover */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-xs text-white truncate">
                                  {item.image.title || item.image.originalName}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Export Options */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">
                          Options d'export
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-700">Export immédiat</h5>
                            <p className="text-xs text-gray-600">
                              Lance l'export de la publication maintenant. Vous serez notifié quand il sera terminé.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-700">Programmation</h5>
                            <p className="text-xs text-gray-600">
                              Planifiez l'export pour une date et heure spécifique.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Publication prête pour l'export</span>
                    <span>
                      {selectedPublication.scheduledAt
                        ? `Programmé pour le ${new Date(selectedPublication.scheduledAt).toLocaleDateString()}`
                        : 'Pas de programmation'
                      }
                    </span>
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
                  <p className="text-sm">Choisissez une publication à exporter</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
