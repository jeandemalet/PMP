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
  color?: string;
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

interface CalendarDay {
  date: Date;
  publications: Publication[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export default function CalendarPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [draggedPublication, setDraggedPublication] = useState<Publication | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Couleurs pour les publications
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
  ];

  // Récupérer les publications
  const fetchPublications = async () => {
    try {
      const response = await fetch('/api/publications');
      if (response.ok) {
        const data = await response.json();
        // Assigner des couleurs aux publications
        const publicationsWithColors = data.publications.map((pub: Publication, index: number) => ({
          ...pub,
          color: colors[index % colors.length]
        }));
        setPublications(publicationsWithColors);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des publications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Générer les jours du calendrier (vue mensuelle)
  const generateMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dayPublications = publications.filter(pub => {
        if (!pub.scheduledAt) return false;
        const pubDate = new Date(pub.scheduledAt);
        return pubDate.toDateString() === current.toDateString();
      });

      days.push({
        date: new Date(current),
        publications: dayPublications,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString()
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Générer les jours du calendrier (vue hebdomadaire)
  const generateWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const days: CalendarDay[] = [];
    const current = new Date(startOfWeek);

    for (let i = 0; i < 7; i++) {
      const dayPublications = publications.filter(pub => {
        if (!pub.scheduledAt) return false;
        const pubDate = new Date(pub.scheduledAt);
        return pubDate.toDateString() === current.toDateString();
      });

      days.push({
        date: new Date(current),
        publications: dayPublications,
        isCurrentMonth: true, // En vue semaine, on considère toujours le mois actuel
        isToday: current.toDateString() === new Date().toDateString()
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Fonction générique pour générer les jours du calendrier
  const generateCalendarDays = (date: Date) => {
    if (viewMode === 'week') {
      setCalendarDays(generateWeekDays(date));
    } else {
      setCalendarDays(generateMonthDays(date));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPublications();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    generateCalendarDays(currentDate);
  }, [currentDate, publications]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, publication: Publication) => {
    setDraggedPublication(publication);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', publication.id);
  };

  const handleDragEnd = () => {
    setDraggedPublication(null);
  };

  // Fonction factorisée pour mettre à jour une publication
  const updatePublication = async (publicationId: string, data: { scheduledAt?: string | null }) => {
    try {
      const response = await fetch(`/api/publications/${publicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchPublications(); // Recharger les publications
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la publication:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  };

  const handleDayDrop = async (e: React.DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();

    if (!draggedPublication) return;

    await updatePublication(draggedPublication.id, {
      scheduledAt: date.toISOString(),
    });
  };

  const handleDayDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRemoveScheduling = async (publicationId: string) => {
    await updatePublication(publicationId, {
      scheduledAt: null,
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleExportAll = async () => {
    const scheduledPublications = publications.filter(p => p.scheduledAt);

    if (scheduledPublications.length === 0) {
      alert('Aucune publication planifiée à exporter');
      return;
    }

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicationIds: scheduledPublications.map(p => p.id),
          includeMetadata: true,
          archiveName: `publications_${new Date().toISOString().split('T')[0]}.zip`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Export démarré ! Job ID: ${data.jobId}`);
        // Ici on pourrait ajouter un système de suivi du job
      } else {
        alert('Erreur lors du démarrage de l\'export');
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur de connexion lors de l\'export');
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
                PMP - Calendrier de Publication
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
                >
                  Vue {viewMode === 'month' ? 'semaine' : 'mois'}
                </Button>

                <Button
                  onClick={handleExportAll}
                  disabled={publications.filter(p => p.scheduledAt).length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  📥 Exporter tout
                </Button>
              </div>
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
                <p className="text-sm text-gray-600">
                  Glissez les publications sur le calendrier pour les planifier
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {publications.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-sm">Aucune publication</p>
                    <p className="text-xs mt-1">Créez des publications depuis la page Tri</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publications.map((publication) => (
                      <div
                        key={publication.id}
                        className={`p-3 rounded-lg border-2 cursor-move transition-all hover:shadow-md ${
                          publication.scheduledAt
                            ? 'border-gray-200 bg-gray-50'
                            : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, publication)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-4 h-4 rounded-full ${publication.color} flex-shrink-0 mt-1`}></div>
                          <div className="flex-1 min-w-0">
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
                              {publication.scheduledAt && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span>Planifié: {new Date(publication.scheduledAt).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
              {/* Calendar Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </h2>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                    >
                      ← Mois précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date())}
                    >
                      Aujourd'hui
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                    >
                      Mois suivant →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Calendar Days */}
              <div className="flex-1 p-4">
                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-px mb-2">
                  {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px h-full">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border ${
                        day.isCurrentMonth
                          ? day.isToday
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200'
                          : 'bg-gray-50 border-gray-100'
                      }`}
                      onDrop={(e) => handleDayDrop(e, day.date)}
                      onDragOver={handleDayDragOver}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        day.isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {day.date.getDate()}
                      </div>

                      <div className="space-y-1">
                        {day.publications.map((publication) => (
                          <div
                            key={publication.id}
                            className={`p-2 rounded text-xs ${publication.color} text-white cursor-pointer hover:opacity-80 transition-opacity`}
                            title={`${publication.name} (${publication._count.images} images)`}
                          >
                            <div className="font-medium truncate">
                              {publication.name}
                            </div>
                            <div className="text-xs opacity-90">
                              {publication._count.images} images
                            </div>
                          </div>
                        ))}

                        {day.publications.length === 0 && day.isCurrentMonth && (
                          <div className="text-xs text-gray-400 italic">
                            Aucun contenu
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar Footer */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span>Publications planifiées: {publications.filter(p => p.scheduledAt).length}</span>
                    <span>•</span>
                    <span>Publications non planifiées: {publications.filter(p => !p.scheduledAt).length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Légende:</span>
                    <div className="flex space-x-1">
                      {colors.slice(0, 5).map((color, index) => (
                        <div key={index} className={`w-3 h-3 rounded-full ${color}`}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
