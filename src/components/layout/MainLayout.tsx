'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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

  // Navigation principale selon le cahier des charges
  const navigationItems = [
    { name: 'Galerie', href: '/gallery', icon: '🖼️' },
    { name: 'Tri', href: '/sort', icon: '🔄' },
    { name: 'Recadrage', href: '/crop', icon: '✂️' },
    { name: 'Description', href: '/description', icon: '📝' },
    { name: 'Calendrier', href: '/calendar', icon: '📅' },
    { name: 'Publication', href: '/publication', icon: '🚀' },
  ];

  // Si pas authentifié, afficher seulement les enfants (pour les pages publiques comme login)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header principal selon le cahier des charges */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Gauche */}
            <div className="flex items-center">
              <Link href="/gallery" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PMP</span>
                </div>
                <span className="font-semibold text-gray-900">Photo Management</span>
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
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Profil et paramètres - Droite */}
            <div className="flex items-center space-x-4">
              {/* Menu profil */}
              <div className="relative">
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
                        ⚙️ Paramètres
                      </Button>
                      {user?.role === 'ADMIN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700"
                          onClick={handleAdmin}
                        >
                          👑 Admin
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
                    <span>{item.icon}</span>
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
