import { useEffect, useRef } from 'react';

/**
 * Hook personnalisé pour détecter les clics en dehors d'un élément
 * @param handler - Fonction à exécuter quand on clique en dehors
 */
export function useOnClickOutside<T extends HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Ne rien faire si on clique sur l'élément référencé ou ses enfants
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    // Ajouter les écouteurs d'événements
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    // Nettoyer les écouteurs d'événements
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler]);

  return ref;
}
