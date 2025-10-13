import React from 'react';
import { Skeleton, SkeletonCard, SkeletonText, SkeletonButton } from '@/components/ui/Skeleton';

/**
 * Skeleton pour la page des paramètres
 * Donne une impression de rapidité en montrant la structure du contenu à venir
 */
export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <header className="bg-white shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content skeleton */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Profil utilisateur skeleton */}
          <SkeletonCard className="p-6 mb-8">
            <SkeletonText lines={1} className="mb-4" />
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="flex justify-between pt-4">
                <SkeletonButton width={180} />
              </div>
            </div>
          </SkeletonCard>

          {/* Informations du compte skeleton */}
          <SkeletonCard className="p-6 mb-8">
            <SkeletonText lines={1} className="mb-4" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </SkeletonCard>

          {/* Préférences de l'application skeleton */}
          <SkeletonCard className="p-6">
            <SkeletonText lines={1} className="mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1">
                    <SkeletonText lines={1} className="mb-1" />
                    <SkeletonText lines={1} className="text-sm" />
                  </div>
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}
