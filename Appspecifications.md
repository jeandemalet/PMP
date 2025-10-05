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