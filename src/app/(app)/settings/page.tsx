'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/auth';
import { Button } from '@/components/ui/button';
import { notifications } from '@/lib/notifications';
import { SettingsSkeleton } from '@/components/ui/skeletons/SettingsSkeleton';
import { Icon } from '@/components/ui/Icon';

// Interface pour les préférences utilisateur depuis l'API
interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: 'fr' | 'en' | 'es' | 'de';
  notifications?: boolean;
  autoSave?: boolean;
  itemsPerPage?: number;
  timezone?: string;
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12h' | '24h';
}

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'auto',
    language: 'fr',
    notifications: true,
  });

  useEffect(() => {
    const loadPreferences = async () => {
      if (isAuthenticated && user) {
        try {
          // Récupérer les préférences depuis l'API dédiée
          const response = await fetch('/api/me/preferences');
          if (response.ok) {
            const data = await response.json();
            setPreferences(data.preferences || {
              theme: 'light',
              language: 'fr',
              notifications: true,
            });
          } else {
            console.warn('Impossible de charger les préférences, utilisation des valeurs par défaut');
            setPreferences({
              theme: 'light',
              language: 'fr',
              notifications: true,
            });
          }
        } catch (error) {
          console.error('Erreur lors du chargement des préférences:', error);
          setPreferences({
            theme: 'light',
            language: 'fr',
            notifications: true,
          });
        }

        setFormData({
          name: user.name || '',
          email: user.email || '',
        });
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [isAuthenticated, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Mettre à jour le profil utilisateur (nom, email) via l'API auth/me
      if (formData.name || formData.email) {
        const profileResponse = await fetch('/api/auth/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!profileResponse.ok) {
          const error = await profileResponse.json();
          notifications.error(`Erreur lors de la mise à jour du profil: ${error.error}`);
          setIsSaving(false);
          return;
        }
      }

      // Mettre à jour les préférences utilisateur
      const preferencesResponse = await fetch('/api/me/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!preferencesResponse.ok) {
        const error = await preferencesResponse.json();
        notifications.error(`Erreur lors de la mise à jour des préférences: ${error.error}`);
        setIsSaving(false);
        return;
      }

      notifications.success('Profil et paramètres mis à jour avec succès !');
      // Recharger les données utilisateur de manière propre
      window.location.reload();
    } catch (error) {
      console.error('Erreur de connexion:', error);
      notifications.error('Erreur de connexion lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = (key: string, value: string | boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
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
    return <SettingsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                PMP - Paramètres
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Profil utilisateur */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informations du profil
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d'affichage
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Votre nom"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="votre.email@example.com"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
                </Button>
              </div>
            </form>
          </div>

          {/* Informations du compte */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informations du compte
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Rôle:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user?.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  <Icon name={user?.role === 'ADMIN' ? 'admin' : 'profile'} size={12} className="mr-1" />
                  {user?.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Membre depuis:</span>
                <span className="text-sm text-gray-900">
                  {user ? new Date(user.createdAt).toLocaleDateString('fr-FR') : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Préférences de l'application */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Préférences de l'application
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Thème</h3>
                  <p className="text-sm text-gray-600">
                    Choisissez l'apparence de l'application
                  </p>
                </div>
                <select
                  value={preferences.theme}
                  onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                  <option value="auto">Automatique</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                  <p className="text-sm text-gray-600">
                    Recevoir des notifications sur l'activité
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.notifications}
                    onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Langue</h3>
                  <p className="text-sm text-gray-600">
                    Langue d'affichage de l'interface
                  </p>
                </div>
                <select
                  value={preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
