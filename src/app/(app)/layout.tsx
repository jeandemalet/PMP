'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/auth';
import { useOnClickOutside } from '@/lib/hooks/useOnClickOutside';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { authLogger } from '@/lib/logger';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Hook pour fermer le menu profil au clic extérieur
  const profileMenuRef = useOnClickOutside<HTMLDivElement>(() => {
    setIsProfileMenuOpen(false);
  });

  // Gestionnaire pour la déconnexion
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Déconnexion locale même en cas d'erreur serveur
      logout();
      router.push('/login');
    }
  };

  // Gestionnaire pour accéder aux paramètres
  const handleSettings = () => {
    setIsProfileMenuOpen(false);
    router.push('/settings');
  };

  // Gestionnaire pour accéder à l'admin
  const handleAdmin = () => {
    setIsProfileMenuOpen(false);
    router.push('/admin');
  };

  // Gestionnaire pour revenir de l'impersonation
  const handleRevertImpersonation = async () => {
    try {
      const response = await fetch('/api/admin/impersonate/revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        authLogger.info({
          userId: user?.id,
          email: user?.email,
        }, 'User reverted impersonation session');

        // Recharger la page pour que le nouveau cookie soit pris en compte
        window.location.href = '/admin';
      } else {
        console.error('Erreur lors du retour d\'impersonation');
      }
    } catch (error) {
      console.error('Erreur réseau lors du retour d\'impersonation:', error);
    }
  };

  // Navigation principale selon le cahier des charges
  const navigationItems = [
    { name: 'Galerie', href: '/gallery', iconName: 'gallery' as const },
    { name: 'Tri', href: '/sort', iconName: 'sort' as const },
    { name: 'Recadrage', href: '/crop', iconName: 'crop' as const },
    { name: 'Description', href: '/description', iconName: 'description' as const },
    { name: 'Calendrier', href: '/calendar', iconName: 'calendar' as const },
    { name: 'Publication', href: '/publication', iconName: 'publish' as const },
  ];

  // Si pas authentifié et pas en cours de chargement, rediriger vers la page de connexion
  if (!isAuthenticated && !isLoading) {
    // Utiliser useEffect pour éviter les appels à router.push dans le corps du composant
    React.useEffect(() => {
      router.push('/login');
    }, [router]);
    return null;
  }

  // Si en cours de chargement, afficher un indicateur de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Détecter si la session est une impersonation
  const isImpersonating = user && (user as any).impersonated;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bandeau d'avertissement pour l'impersonation */}
      {isImpersonating && (
        <div className="bg-yellow-400 text-black text-center p-2 font-bold sticky top-0 z-50">
          ⚠️ Vous naviguez en tant que {user.email}.{' '}
          <button
            onClick={handleRevertImpersonation}
            className="underline font-bold hover:text-blue-700 transition-colors"
          >
            Retourner à mon compte administrateur
          </button>
        </div>
      )}

      {/* Header principal selon le cahier des charges */}
      <header className={`bg-white shadow-sm border-b ${isImpersonating ? 'sticky top-12' : 'sticky top-0'} z-40`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Gauche */}
            <div className="flex items-center">
              <Link href="/gallery">
                <img
                  src="/Assets/logo.png"
                  alt="PMP Logo"
                  className="w-12 h-12"
                />
              </Link>
            </div>

            {/* Barre d'onglets centrale - Centre */}
            <nav className="hidden md:flex space-x-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/gallery' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon name={item.iconName} size={16} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Profil et paramètres - Droite */}
            <div className="flex items-center space-x-4">
              {/* Menu profil */}
              <div className="relative" ref={profileMenuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2"
                >
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 hidden sm:block">
                    {user?.name || user?.email}
                  </span>
                </Button>

                {/* Dropdown menu profil */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-3 border-b">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.name || 'Utilisateur'}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-gray-700"
                        onClick={handleSettings}
                      >
                        <Icon name="settings" size={16} className="mr-2" />
                        Paramètres
                      </Button>
                      {user?.role === 'ADMIN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700"
                          onClick={handleAdmin}
                        >
                          <Icon name="admin" size={16} className="mr-2" />
                          Admin
                        </Button>
                      )}
                    </div>
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-red-600"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                      >
                        Déconnexion
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation mobile */}
          <div className="md:hidden border-t">
            <nav className="flex space-x-1 p-2 overflow-x-auto">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/gallery' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon name={item.iconName} size={14} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
