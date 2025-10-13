import React from 'react';
import { Skeleton, SkeletonCard, SkeletonText, SkeletonButton } from '@/components/ui/Skeleton';

/**
 * Skeleton pour la page d'administration
 * Donne une impression de rapidité en montrant la structure du contenu à venir
 */
export function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <header className="bg-white shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Skeleton className="h-6 w-64" />
            </div>

            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-48" />
              <SkeletonButton width={150} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content skeleton */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs skeleton */}
        <div className="mb-8">
          <div className="flex space-x-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
        </div>

        {/* Stats Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="p-6">
              <div className="flex items-center">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="ml-4 flex-1">
                  <SkeletonText lines={1} className="mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </SkeletonCard>
          ))}
        </div>

        {/* Recent Activity skeleton */}
        <SkeletonCard>
          <div className="p-6 border-b">
            <SkeletonText lines={1} />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

/**
 * Skeleton pour la section utilisateurs de l'admin
 */
export function AdminUsersSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard>
        <div className="p-6 border-b">
          <SkeletonText lines={1} />
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Skeleton className="w-3 h-3 rounded-full" />
                    <SkeletonText lines={1} />
                  </div>
                  <SkeletonText lines={1} className="text-sm" />
                  <div className="mt-2 flex space-x-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-2" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <SkeletonButton width={140} />
                  <SkeletonButton width={100} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}

/**
 * Skeleton pour la section système de l'admin
 */
export function AdminSystemSkeleton() {
  return (
    <div className="space-y-6">
      {/* System Health skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="p-6">
            <SkeletonText lines={1} className="mb-2" />
            <div className="flex items-center space-x-2">
              <Skeleton className="flex-1 h-2 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* System Info skeleton */}
      <SkeletonCard className="p-6">
        <SkeletonText lines={1} className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SkeletonText lines={1} className="mb-2" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <SkeletonText lines={1} className="mb-2" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-48" />
              ))}
            </div>
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
