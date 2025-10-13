import React from 'react';
import { Skeleton, SkeletonCard, SkeletonText, SkeletonButton } from '@/components/ui/Skeleton';

/**
 * Skeleton pour la grille de galerie
 * Donne une impression de rapidité en montrant la structure du contenu à venir
 */
export function GallerySkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header skeleton */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <SkeletonText lines={2} className="mb-2" />
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <SkeletonButton width={140} className="mr-2" />
            <SkeletonButton width={120} />
          </div>
        </div>

        {/* Contrôles skeleton */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-12" />
            <div className="flex items-center space-x-1">
              {[2, 3, 4, 5, 6].map((level) => (
                <Skeleton key={level} className="h-8 w-8 rounded" />
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-8 w-32 rounded" />
          </div>
        </div>
      </div>

      {/* Content skeleton - Grille d'images */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-4 gap-4 h-full">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-2">
              {/* Image skeleton */}
              <Skeleton className="aspect-square rounded-lg" />

              {/* Overlay skeleton */}
              <div className="space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour l'état "Sélectionnez une galerie"
 */
export function GalleryEmptySkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex items-center justify-center">
      <div className="text-center">
        <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
        <SkeletonText lines={2} className="mb-2" />
      </div>
    </div>
  );
}

/**
 * Skeleton pour l'état "Aucune image"
 */
export function GalleryNoImagesSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
        <SkeletonText lines={2} className="mb-2" />
      </div>
    </div>
  );
}
