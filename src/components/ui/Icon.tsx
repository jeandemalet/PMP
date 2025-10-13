import React, { useState } from 'react';
import { Icons, IconName, getIconPath } from '@/lib/icons';

interface IconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  alt?: string;
  fallback?: React.ReactNode;
}

/**
 * Composant Icon centralisé pour l'application
 * Respecte les spécifications du cahier des charges pour une gestion cohérente des assets
 */
export function Icon({ name, size = 16, className = '', alt, fallback }: IconProps) {
  const [hasError, setHasError] = useState(false);
  const iconPath = getIconPath(name);
  const altText = alt || `${name} icon`;

  // Si erreur de chargement et fallback fourni, afficher le fallback
  if (hasError && fallback) {
    return (
      <span
        className={`icon-fallback inline-flex items-center justify-center ${className}`}
        style={{
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
        }}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={iconPath}
      alt={altText}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      className={`inline-block ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
      }}
      onError={() => setHasError(true)}
    />
  );
}

// Composant spécialisé pour les icônes de navigation
export function NavIcon({ name, size = 20, className = '', ...props }: IconProps) {
  return (
    <Icon
      name={name}
      size={size}
      className={`opacity-60 hover:opacity-100 transition-opacity ${className}`}
      {...props}
    />
  );
}

// Composant spécialisé pour les icônes d'action
export function ActionIcon({ name, size = 16, className = '', ...props }: IconProps) {
  return (
    <Icon
      name={name}
      size={size}
      className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      {...props}
    />
  );
}

// Composant spécialisé pour les icônes de statut
export function StatusIcon({ name, size = 16, className = '', ...props }: IconProps) {
  return (
    <Icon
      name={name}
      size={size}
      className={`opacity-80 ${className}`}
      {...props}
    />
  );
}
