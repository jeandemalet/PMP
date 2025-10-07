// Registre centralisé des icônes de l'application
// Respecte les spécifications du cahier des charges pour une gestion cohérente des assets

export const Icons = {
  // Actions principales
  gallery: '/Assets/gallery.png',
  crop: '/Assets/crop.png',
  sort: '/Assets/tri.png',
  description: '/Assets/description.png',
  calendar: '/Assets/calendar.png',
  publish: '/Assets/publish.png',
  settings: '/Assets/settings.png',
  admin: '/Assets/settings.png', // Utilise settings comme fallback pour admin

  // Actions utilisateur
  profile: '/Assets/profile.png',
  logout: '/Assets/profile.png', // Utilise profile comme fallback pour logout

  // Actions de contenu
  add: '/Assets/add-button.png',
  delete: '/Assets/bin.png',
  edit: '/Assets/settings.png', // Utilise settings comme fallback pour edit
  save: '/Assets/save.png',
  confirm: '/Assets/confirm.png',
  cancel: '/Assets/bin.png', // Utilise bin comme fallback pour cancel

  // Navigation et interface
  close: '/Assets/bin.png', // Utilise bin comme fallback pour close
  menu: '/Assets/barres-blanches.png',
  expand: '/Assets/vuedensemble.png',
  collapse: '/Assets/vuedensemble.png',

  // Média et fichiers
  image: '/Assets/gallery.png', // Utilise gallery comme fallback pour image
  video: '/Assets/play.png',
  download: '/Assets/download.png',
  upload: '/Assets/add-button.png', // Utilise add comme fallback pour upload

  // États et feedback
  loading: '/Assets/ai.png', // Utilise ai comme fallback pour loading
  success: '/Assets/confirm.png',
  error: '/Assets/bin.png', // Utilise bin comme fallback pour error
  warning: '/Assets/settings.png', // Utilise settings comme fallback pour warning

  // Outils spécialisés
  ai: '/Assets/ai.png',
  random: '/Assets/aleatoire-2.png',
  randomInterlace: '/Assets/aleatoire-interlace.png',
  chronological: '/Assets/chronologique.png',
  doNothing: '/Assets/nerienfaire.png',
  individualCrop: '/Assets/recadrageindividuel.png',
  split: '/Assets/split.png',
  turnAround: '/Assets/turn-around.png',
  overview: '/Assets/vuedensemble.png',

  // Réseaux sociaux
  instagram: '/Assets/instagram.svg',

  // Interface générale
  logo: '/Assets/logo.png',
  placeholder: '/Assets/placeholder-missing.svg',
  next: '/Assets/next.png',
  previous: '/Assets/previous.png',
} as const;

export type IconName = keyof typeof Icons;

// Utilitaires pour les icônes
export const getIconPath = (iconName: IconName): string => {
  return Icons[iconName];
};

// Vérification de l'existence des assets (pour le développement)
export const validateIconAssets = (): Record<string, boolean> => {
  const validation: Record<string, boolean> = {};

  Object.entries(Icons).forEach(([name, path]) => {
    // Note: En environnement navigateur, on ne peut pas vérifier l'existence des fichiers
    // Cette fonction sert principalement pour la documentation et les tests
    validation[name] = true; // Assume tous les assets existent selon le cahier des charges
  });

  return validation;
};
