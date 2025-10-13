'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/auth';

// Interface pour les publications
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

// Fonction pour récupérer les publications
const fetchPublications = async (): Promise<{ publications: Publication[] }> => {
  const response = await fetch('/api/publications');
  if (!response.ok) {
    throw new Error('Erreur lors du chargement des publications');
  }
  return response.json();
};

// Composant PhoneMockup - Mockup de téléphone
function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[414px] h-[736px] bg-white rounded-3xl border-8 border-gray-800 shadow-2xl overflow-hidden">
      <div className="w-full h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// Composant ProfileHeader - Header du profil Instagram
function ProfileHeader({ user, postCount }: { user: any; postCount: number }) {
  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-xl font-semibold text-gray-700">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">{user?.name || 'Utilisateur'}</h2>
          <p className="text-sm text-gray-600">{postCount} publications</p>
        </div>
      </div>
    </div>
  );
}

// Composant ViewToggle - Toggle entre grille et feed
function ViewToggle({
  viewMode,
  setViewMode
}: {
  viewMode: 'grid' | 'feed';
  setViewMode: (mode: 'grid' | 'feed') => void;
}) {
  return (
    <div className="flex justify-center p-2 bg-white border-b border-gray-200">
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'grid'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Grille
        </button>
        <button
          onClick={() => setViewMode('feed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'feed'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Feed
        </button>
      </div>
    </div>
  );
}

// Composant ProfileGrid - Vue grille Instagram (3 colonnes)
function ProfileGrid({ posts }: { posts: Publication[] }) {
  // Aplatir toutes les images de toutes les publications
  const allImages = posts.flatMap(post =>
    post.images.map(img => ({
      ...img,
      isCarousel: post.images.length > 1,
      publicationName: post.name
    }))
  );

  return (
    <div className="grid grid-cols-3 gap-0.5 p-2">
      {allImages.map((item, index) => (
        <div key={`${item.image.id}-${index}`} className="relative aspect-square bg-gray-200">
          <img
            src={`/uploads/${item.image.filename}`}
            alt={item.image.originalName}
            className="w-full h-full object-cover"
          />
          {/* Indicateur de carrousel */}
          {item.isCarousel && (
            <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Composant Post - Post individuel pour la vue feed
function Post({ publication }: { publication: Publication }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasCarousel = publication.images.length > 1;

  const nextImage = () => {
    setCurrentImageIndex(i => (i + 1) % publication.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(i => (i - 1 + publication.images.length) % publication.images.length);
  };

  return (
    <article className="border-b border-gray-200 bg-white">
      {/* Header du post */}
      <div className="p-3 flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">U</span>
        </div>
        <span className="font-semibold text-sm">{publication.name}</span>
      </div>

      {/* Média (Image ou Carrousel) */}
      <div className="relative aspect-square bg-black">
        <img
          src={`/uploads/${publication.images[currentImageIndex]?.image.filename}`}
          alt={publication.images[currentImageIndex]?.image.originalName}
          className="w-full h-full object-contain"
        />

        {/* Navigation carrousel */}
        {hasCarousel && (
          <>
            {currentImageIndex > 0 && (
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center"
              >
                ‹
              </button>
            )}
            {currentImageIndex < publication.images.length - 1 && (
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center"
              >
                ›
              </button>
            )}

            {/* Indicateurs de position */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {publication.images.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions et description */}
      <div className="p-3">
        <div className="flex items-center space-x-4 mb-2">
          <button className="text-gray-700 hover:text-gray-900">♡</button>
          <button className="text-gray-700 hover:text-gray-900">💬</button>
          <button className="text-gray-700 hover:text-gray-900">📤</button>
        </div>
        <p className="text-sm">
          <span className="font-semibold">{publication.name}</span>
          {' '}
          {publication.description || 'Publication Instagram'}
        </p>
        {publication.scheduledAt && (
          <p className="text-xs text-gray-500 mt-1">
            📅 Programmé pour le {new Date(publication.scheduledAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </article>
  );
}

// Composant ProfileFeed - Vue feed détaillée
function ProfileFeed({ posts }: { posts: Publication[] }) {
  return (
    <div className="bg-white">
      {posts.map(post => (
        <Post key={post.id} publication={post} />
      ))}
    </div>
  );
}

export default function PublicationPage() {
  const { user, isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');

  // Récupérer les publications avec TanStack Query
  const { data: publicationsData, isLoading, error } = useQuery({
    queryKey: ['publications'],
    queryFn: fetchPublications,
    enabled: isAuthenticated,
  });

  // Filtrer et trier les publications planifiées
  const scheduledPosts = useMemo(() => {
    if (!publicationsData?.publications) return [];

    return publicationsData.publications
      .filter(p => p.scheduledAt) // Seulement les publications planifiées
      .sort((a, b) => new Date(b.scheduledAt!).getTime() - new Date(a.scheduledAt!).getTime()); // Plus récentes d'abord
  }, [publicationsData]);

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
          <p className="mt-4 text-gray-600">Chargement du simulateur Instagram...</p>
        </div>
      </div>
    );
  }

  if (scheduledPosts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  PMP - Prévisualisation Instagram
                </h1>
              </div>
            </div>
          </div>
        </header>

        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Aucune publication planifiée
            </h2>
            <p className="text-gray-600 mb-8">
              Utilisez l'onglet "Calendrier" pour planifier des publications, puis revenez ici pour voir comment elles apparaîtront sur Instagram.
            </p>
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Comment utiliser le simulateur ?
              </h3>
              <ol className="text-left text-blue-800 space-y-2">
                <li>1. Allez dans l'onglet "Calendrier"</li>
                <li>2. Planifiez vos publications avec des dates</li>
                <li>3. Revenez ici pour voir la prévisualisation Instagram</li>
                <li>4. Basculez entre "Grille" et "Feed" pour voir différents aspects</li>
              </ol>
            </div>
          </div>
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
                PMP - Prévisualisation Instagram
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {scheduledPosts.length} publication{scheduledPosts.length > 1 ? 's' : ''} planifiée{scheduledPosts.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Simulateur Instagram */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto">
          <PhoneMockup>
            {/* Header du profil Instagram */}
            <ProfileHeader user={user} postCount={scheduledPosts.length} />

            {/* Toggle de vue */}
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

            {/* Contenu selon le mode */}
            {viewMode === 'grid' ? (
              <ProfileGrid posts={scheduledPosts} />
            ) : (
              <ProfileFeed posts={scheduledPosts} />
            )}
          </PhoneMockup>
        </div>
      </div>
    </div>
  );
}
