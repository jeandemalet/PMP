import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'default' | 'rounded' | 'circular';
}

/**
 * Composant Skeleton de base pour les états de chargement
 * Respecte les spécifications du cahier des charges pour une meilleure UX perçue
 */
export function Skeleton({
  className,
  width,
  height,
  variant = 'default'
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200';

  const variantClasses = {
    default: '',
    rounded: 'rounded-md',
    circular: 'rounded-full'
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  );
}

// Composants spécialisés
export function SkeletonText({
  lines = 1,
  className,
  width
}: {
  lines?: number;
  className?: string;
  width?: string | number;
}) {
  if (lines === 1) {
    return <Skeleton className={cn('h-4', className)} width={width} />;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          width={i === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = 40,
  className
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  );
}

export function SkeletonButton({
  className,
  width = 'auto'
}: {
  className?: string;
  width?: string | number;
}) {
  return (
    <Skeleton
      className={cn('h-10 rounded-md', className)}
      width={width}
    />
  );
}

export function SkeletonCard({
  className,
  children
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('p-4 border rounded-lg bg-white', className)}>
      {children}
    </div>
  );
}
