Cahier des charges complet : 

Objectif : Poser tout ce qu’il faut décider/collecter avant la 1ʳᵉ ligne de code. Ce document sert de cahier des charges de référence.

1) Vision & Périmètre

Pitch (1–2 phrases) : …

Objectifs mesurables (OKR/metrics) : ex: MVP fonctionnel, <500 ms TTFB, mise en place de tests unitaires (Vitest) et end-to-end (Playwright) pour les parcours critiques.

Personas & cas d’usage clés :

Utilisateur → importe, trie, recadre et planifie ses publications.

Administrateur → supervise l'ensemble des comptes, accède aux données de n'importe quel utilisateur, monitore l'usage de la plateforme et peut intervenir pour de la maintenance ou de la restauration.

Périmètre MVP :

Inclus : Le workflow complet de la galerie à la publication pour un utilisateur, l'authentification, et le tableau de bord administrateur (visualisation et accès aux données).

Exclus : Pas de gestion de vidéos, pas de collaboration en temps réel, pas d'interface UI spécifiquement optimisée pour mobile (l'architecture doit cependant le permettre).

Contraintes (tech/légales/business) : RGPD, multi-utilisateur avec cloisonnement strict des données, hébergement auto-géré via Docker avec une architecture portable vers les plateformes cloud.

2) Structure de l’Interface (UI globale)
🧭 En-tête (Header)

Position : Toujours visible en haut de l’écran.

Contenu :

Gauche : Logo de l’application.

Centre : Barre d’onglets horizontale représentant les étapes du processus utilisateur.

Droite : Photo de profil, Icône engrenage ⚙️.

📑 Onglets principaux (pour l'Utilisateur)
Étape	Nom de l’onglet	Description courte
1	Galerie	Importation, affichage et sélection des images.
2	Tri	Classement, suppression ou réorganisation des images.
3	Recadrage	Recadrage automatique et manuel des photos.
4	Description	Ajout de titres, tags, légendes, métadonnées.
5	Calendrier	Planification des publications.
6	Publication	Validation et export.
👑 Interface Administrateur

Accessible via une route protégée (/admin), avec une interface distincte.

Tableau de bord de monitoring :

Santé du Système : Utilisation CPU/RAM, état de la file d'attente (jobs en attente/échoués).

Analyse Utilisateurs : Stockage total par utilisateur, nombre d'images, graphiques d'activité.

Gestion Utilisateurs : Liste des utilisateurs, possibilité de se "connecter en tant que" pour le support.

⚡ États de l'Interface & Feedback

Chargement : Des squelettes d'interface (skeletons) seront utilisés pour le chargement progressif des galeries.

États Vides : Une vue vide (ex: pas de galeries) affichera un message clair et une action principale (ex: bouton "Ajouter des photos" au centre).

Notifications : Utilisation de "toasts" non bloquants pour les confirmations. Une modale de confirmation est réservée aux actions destructrices (ex: suppression d'une galerie).

3) Stack Technique & Architecture Produit

Front-end : Next.js (App Router), React, Tailwind + shadcn/ui.

Données : Prisma + PostgreSQL.

State management : TanStack Query (requêtes) + Zustand (état global).

Déploiement & DevEx :

Docker Compose pour le développement. Le fichier docker-compose.yml doit permettre de lancer l'intégralité de l'environnement (App, DB, Worker, Redis) avec une seule commande.

Docker pour la production, avec une architecture portable.

Architecture Asynchrone :

Worker Dédié : Un service Node.js séparé pour les tâches longues (traitement d'images, exports ZIP).

File d'attente (Queue) : Redis + BullMQ pour communiquer entre l'application et le worker.

Tests Automatisés : Vitest (unitaire/intégration) et Playwright (end-to-end).

Observabilité : Logs structurés en JSON avec Pino.

🧩 Assets & Icônes (Répertoire Assets/)

La gestion des assets visuels sera centralisée pour assurer la cohérence. Un fichier "registre" (ex: assets.ts) exportera un objet mappant des clés sémantiques aux chemins des fichiers.

Nom du Fichier	Clé Sémantique (suggestion)	Utilisation Prévue
logo.png	logoApp	Logo principal dans le header.
add-button.png	add	Boutons "Ajouter une galerie", "Ajouter des photos".
bin.png	delete	Icône de suppression (poubelle).
confirm.png	confirm	Actions de validation, confirmation.
save.png	save	Bouton de sauvegarde explicite.
download.png	download	Bouton de téléchargement (exports ZIP).
next.png	arrowRight	Flèche de navigation "suivant".
previous.png	arrowLeft	Flèche de navigation "précédent".
settings.png	settings	Icône "Paramètres" (engrenage) dans le header.
profile.png	profile	Icône de profil utilisateur dans le header.
placeholder-missing.svg	placeholder	Image de remplacement si un asset est manquant.
Icônes d'Onglets		
gallery.png	tabGallery	Onglet "Galerie".
tri.png	tabSort	Onglet "Tri".
crop.png	tabCrop	Onglet "Recadrage".
description.png	tabDescription	Onglet "Description".
calendar.png	tabCalendar	Onglet "Calendrier".
publish.png	tabPublish	Onglet "Publication".
Icônes de Recadrage		
recadrageindividuel.png	cropManual	Toggle pour le mode "Recadrage manuel".
ai.png	cropAuto	Toggle pour le mode "Recadrage automatique" (SmartCrop).
barres-blanches.png	cropWhiteBars	Outil "White bars".
split.png	cropSplit	Outil "Split".
turn-around.png	cropRotate	Outil "Rotation".
Icônes de Tri		
chronologique.png	sortChronological	Option de tri "Chronologique".
aleatoire-2.png	sortRandom	Option de tri "Aléatoire".
aleatoire-interlace.png	sortInterlace	Option de tri "Interlacé".
Autres		
instagram.png / .svg	iconInstagram	Représentation de la plateforme cible ou du ratio.
play.png	actionPlay	Démarrer un processus (ex: traitement en lot).
nerienfaire.png	actionCancel	Bouton "Annuler" ou "Ne rien faire".
vuedensemble.png	viewOverview	Action "Vue d'ensemble" ou "Zoom arrière".
🖼️ Spécifications — Onglet « Galerie »

Sidebar gauche redimensionnable : Liste des galeries, avec bouton add et delete.

Vue centrale (grille) :

Performance : Utilisation de virtualisation (ex: TanStack Virtual).

Contrôles : Zoom, sélecteur de Tri (avec icônes sort...).

Bouton “Ajouter des photos” (add) en haut à droite.

Comportement : Galerie vierge avec bouton add central.

✂️ Spécifications — Onglet « Recadrage »

Layout : Toggle Manuel/Auto (cropManual/cropAuto), zone de recadrage, filmstrip.

Mode « Recadrage manuel » :

Contrôles : Outils avec icônes cropWhiteBars, cropSplit, cropRotate.

Sauvegarde : save ou confirm.

Mode « Recadrage automatique » :

Déclenchement : Lance un job asynchrone côté serveur.

Feedback : Barre de progression mise à jour via polling.

Filmstrip : Navigation avec flèches (arrowLeft/arrowRight).

🗄️ Modèle de données

Multi-utilisateur : Toutes les tables principales incluent une relation userId.

Rôles : Le modèle User contient un champ role (USER | ADMIN).

ImageVariant : Entité stockant chaque variante de sortie.

PublicationImage : Référence un imageVariantId et une position.

🔌 API — Spécifications

Sécurité : Routes protégées validant les droits de l'utilisateur (userId).

Contrat pour les Tâches Asynchrones (Jobs) :

Lancement (POST /api/jobs) : Met en file d'attente la tâche et répond avec un jobId.

Suivi (GET /api/jobs/:jobId) : Route de polling pour obtenir le statut et la progression.

🖱️ Drag & Drop — Spécification unifiée

Objectif : Réorganisation fluide des images.

Persistance : Met à jour PublicationImage.position via un appel API.

🗓️ Calendrier & Export

Couleurs par galerie : Palette de couleurs dynamique.

Téléchargement : Bouton (download) pour générer un ZIP via un job asynchrone.

🚀 Mises à Jour & Maintenance (Stratégie Zéro Downtime)

Base de Données : Migrations gérées par prisma migrate deploy.

Déploiement du Code : Architecture permettant un déploiement "blue-green" sans interruption.

Feature Flags : Activation/désactivation de fonctionnalités depuis l'interface admin.

✅ Mini-checklist de clôture (avant dev)

Environnement de dev avec docker-compose (one-command startup) fonctionnel.

Le schéma Prisma intègre multi-utilisateur et rôles.

Le contrat d'API pour les jobs asynchrones est implémenté.

L'architecture pour l'interface Admin est esquissée.

La stratégie de tests (Vitest/Playwright) est définie.

La virtualisation de la grille est confirmée.

Le registre des assets est créé.

La stratégie de mise à jour est validée.






Checklist complète des étapes à suivre (à cocher au fur et à mesure après mise en place)



Absolument. C'est la meilleure façon de procéder pour transformer un cahier des charges aussi complet en un plan d'action concret.

Voici une roadmap de développement et de tests automatiques extrêmement détaillée, sous forme de checklist progressive. Elle est conçue pour construire le projet de manière logique, en s'assurant que chaque brique est solide et testée avant de construire la suivante.

Roadmap de Développement & Tests Automatisés

Cette roadmap est divisée en phases. Idéalement, chaque phase devrait être fonctionnelle et testée avant de passer à la suivante.

Phase 0 : La Fondation (Setup & Plomberie)

Objectif : Mettre en place l'environnement de développement complet et s'assurer que tous les services communiquent.

[ ] 1. Initialisation de l'environnement Docker

Créer le fichier docker-compose.yml définissant les 4 services : app (Next.js), db (PostgreSQL), worker (Node.js), redis (Redis).

Créer le Dockerfile pour le service app.

Créer la structure de base du projet worker/.

Lancer docker-compose up --build et vérifier que tous les conteneurs démarrent sans erreur.

[ ] 2. Connexion à la Base de Données

Créer le fichier prisma/schema.prisma avec un premier modèle simple : User.

Configurer l'URL de la base de données dans les variables d'environnement (.env) pour que Prisma puisse se connecter au conteneur db.

Lancer npx prisma migrate dev pour créer la première migration et vérifier que la table User est bien créée dans la base de données.

Créer le singleton Prisma client dans src/lib/prisma.ts.

[ ] 3. Initialisation du Front-end

Installer shadcn/ui en lançant npx shadcn-ui@latest init et configurer les chemins.

Créer la structure de dossiers de base dans src/ (components, lib, app, etc.).

Nettoyer la page d'accueil par défaut de Next.js (src/app/page.tsx).

[ ] 4. Mise en place des Tests de Base

[ ] Test Automatisé (Playwright) :

Configurer Playwright.

Écrire un premier test "smoke test" (tests/e2e/smoke.spec.ts) qui :

Navigue vers la page d'accueil (/).

Vérifie que la page se charge sans erreur et que le titre est correct.

Phase 1 : Authentification & Gestion des Utilisateurs

Objectif : Permettre aux utilisateurs de s'inscrire, de se connecter et de se déconnecter. Sécuriser les routes de l'application.

[ ] 1. Développement Backend & Données

Étendre le modèle User dans schema.prisma (email, hashedPassword, role).

Lancer une nouvelle migration prisma migrate dev.

Créer les routes API pour signup et login (src/app/api/auth/...).

Implémenter la logique de hachage de mot de passe (ex: avec bcrypt).

Implémenter la logique de création de session/token (ex: avec next-auth ou lucia-auth).

[ ] 2. Développement Front-end

Créer la page de connexion src/app/login/page.tsx avec un formulaire.

Implémenter la logique côté client pour appeler les API de signup/login.

Mettre en place un "Auth Provider" pour gérer l'état de l'utilisateur connecté dans toute l'application.

Mettre en place un middleware (src/middleware.ts) pour protéger les routes de (app)/ et admin/ et rediriger les utilisateurs non connectés vers /login.

[ ] 3. Tests Automatisés

[ ] Test Unitaire (Vitest) :

Tester la fonction de hachage/vérification de mot de passe de manière isolée.

[ ] Test End-to-End (Playwright) :

Créer un fichier de test tests/e2e/auth.spec.ts qui simule le parcours complet :

Tente d'accéder à /gallery et vérifie la redirection vers /login.

S'inscrit avec un nouvel utilisateur.

Se déconnecte.

Se reconnecte avec le nouvel utilisateur.

Vérifie l'accès à /gallery.

Se déconnecte.

Phase 2 : Galerie & Pipeline d'Upload Asynchrone

Objectif : L'utilisateur peut créer des galeries, y uploader des images, et voir les miniatures s'afficher après un traitement en arrière-plan.

[ ] 1. Développement Backend & Données

Ajouter les modèles Gallery et Image dans schema.prisma avec les relations userId.

Migrer la base de données.

Créer les routes API CRUD pour les galeries (GET, POST, DELETE).

Créer la route API pour l'upload de fichiers (POST /api/upload) qui utilise multer pour recevoir le fichier.

Worker :

Configurer BullMQ dans lib/queue.ts et dans le worker/.

Dans la route d'upload, après avoir sauvegardé l'image originale, ajouter un job image:process à la queue avec l'ID de l'image.

Dans le worker, créer un processeur pour le job image:process qui :

Génère un thumbnail (256px) et une preview (1024px).

Met à jour l'entrée de l'image dans la base de données avec les URLs du thumbnail/preview.

[ ] 2. Développement Front-end

Créer le composant GallerySidebar qui affiche la liste des galeries et permet d'en créer/supprimer.

Créer le composant GalleryGrid qui affiche les miniatures des images de la galerie sélectionnée.

Performance : Implémenter la virtualisation de la grille avec TanStack Virtual.

Créer le composant d'upload qui affiche la double barre de progression (Upload puis Traitement). Le statut du traitement sera récupéré via polling sur une API de statut de job.

[ ] 3. Tests Automatisés

[ ] Test d'Intégration (API) :

Tester directement les routes API de la galerie (créer, lister, supprimer).

[ ] Test End-to-End (Playwright) :

Créer tests/e2e/gallery.spec.ts :

Se connecter.

Créer une nouvelle galerie.

Uploader une image.

Vérifier que l'image apparaît dans la grille (attendre que le thumbnail soit généré).

Supprimer l'image.

Supprimer la galerie.

Phase 3 : Recadrage (Manuel & Automatique)

Objectif : Fournir l'interface de recadrage complète, avec la création de variantes d'images non destructives.

[ ] 1. Développement Backend & Données

Ajouter le modèle ImageVariant dans schema.prisma.

Migrer la base de données.

Créer l'API POST /api/crop qui reçoit les paramètres de recadrage.

Worker :

L'API de crop ajoute un job variant:generate à la queue.

Le worker traite ce job : il prend l'image originale, applique les transformations (crop, rotation, white bars, split) et sauvegarde la ou les variantes.

Pour le recadrage auto en lot, l'API créera un job par image.

[ ] 2. Développement Front-end

Construire le layout de la page de recadrage (toggle, canvas, filmstrip).

Développer le composant CropCanvas avec la logique d'interaction (boîte de recadrage, 8 poignées, drag, rotation).

Développer le CropFilmstrip pour la navigation.

Implémenter la logique d'appel à l'API de crop et le polling pour voir la variante apparaître.

[ ] 3. Tests Automatisés

[ ] Test Unitaire (Vitest) :

Tester les fonctions de calcul pur (ex: calcul du ratio de la boîte, contraintes de déplacement).

[ ] Test End-to-End (Playwright) :

Créer tests/e2e/crop.spec.ts :

Se connecter et naviguer vers la page de recadrage pour une image.

Vérifier que la boîte de recadrage est présente.

Cliquer sur le bouton "White bars".

Vérifier que l'API de crop a été appelée et qu'une variante a été créée.

Phase 4 : Organisation (Tri & Description)

Objectif : Permettre à l'utilisateur d'enrichir ses images avec des métadonnées et de les réorganiser.

[ ] 1. Développement Backend & Données

Ajouter les champs de métadonnées (title, description, tags) au modèle Image ou ImageVariant.

Ajouter le modèle Publication et PublicationImage (position) pour gérer les lots et leur ordre.

Migrer la base de données.

Créer les API pour sauvegarder les métadonnées et pour réordonner les images (POST /api/publications/:id/reorder).

[ ] 2. Développement Front-end

Créer la page "Description" avec les formulaires pour les métadonnées.

Créer la page "Tri" avec l'interface de drag-and-drop pour les publications.

Implémenter la logique de drag-and-drop et l'appel à l'API de réorganisation.

[ ] 3. Tests Automatisés

[ ] Test End-to-End (Playwright) :

Créer tests/e2e/organization.spec.ts :

Se connecter, aller sur la page Description.

Remplir le champ "titre" d'une image et sauvegarder.

Recharger la page et vérifier que le titre est toujours là.

Glisser-déposer une image pour changer sa position et vérifier que le changement est persistant.

Phase 5 : Planification & Export (Calendrier & Publication)

Objectif : Finaliser le workflow en permettant la planification et le téléchargement des lots d'images.

[ ] 1. Développement Backend & Données

Ajouter la notion de date de planification au modèle Publication.

Migrer la base de données.

Créer l'API pour l'export ZIP.

Worker : Créer un processeur de job export:zip qui collecte les variantes d'images, crée une archive ZIP et la stocke temporairement.

[ ] 2. Développement Front-end

Construire l'interface du Calendrier.

Implémenter le drag-and-drop des publications sur le calendrier.

Implémenter le bouton de téléchargement qui lance le job d'export et attend le lien de téléchargement.

[ ] 3. Tests Automatisés

[ ] Test End-to-End (Playwright) :

Créer tests/e2e/calendar.spec.ts :

Se connecter, créer une publication.

Glisser la publication sur une date du calendrier.

Vérifier qu'elle apparaît au bon endroit.

Phase 6 : Interface Administrateur

Objectif : Donner aux administrateurs les outils pour superviser et maintenir la plateforme.

[ ] 1. Développement

Mettre en place la protection des routes /admin via le middleware, en vérifiant le rôle de l'utilisateur.

Créer le layout de l'interface admin.

Créer les API sécurisées pour l'admin (ex: GET /api/admin/users, GET /api/admin/stats).

Construire les composants du tableau de bord (graphiques, listes d'utilisateurs).

Implémenter la fonctionnalité "Se connecter en tant que".

[ ] 2. Tests Automatisés

[ ] Test End-to-End (Playwright) :

Créer tests/e2e/admin.spec.ts :

Se connecter en tant qu'utilisateur normal et vérifier que l'accès à /admin est interdit.

Se connecter en tant qu'admin et vérifier que l'accès à /admin est autorisé.

Vérifier que le tableau de bord s'affiche.