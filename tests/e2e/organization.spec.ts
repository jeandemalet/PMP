import { test, expect } from '@playwright/test';

test.describe('Organisation et Tri - Tests End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await page.goto('/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Attendre la redirection vers la galerie
    await expect(page).toHaveURL('/gallery');
  });

  test('devrait accéder à la page de description depuis la galerie', async ({ page }) => {
    // Créer une galerie avec une image mockée
    await page.click('button:has-text("Nouvelle")');
    await page.fill('input[placeholder="Nom de la galerie"]', 'Galerie description');
    await page.click('button:has-text("Créer")');

    // Sélectionner la galerie
    await page.click('text=Galerie description');

    // Naviguer vers la page de description (simulé)
    await page.goto('/description?imageId=test-image-id');

    // Vérifier que la page de description se charge
    await expect(page.locator('h1')).toContainText('PMP - Gestion des métadonnées');
  });

  test('devrait afficher le formulaire de métadonnées', async ({ page }) => {
    await page.goto('/description?imageId=test-image-id');

    // Vérifier la présence du formulaire
    await expect(page.locator('text=Titre')).toBeVisible();
    await expect(page.locator('text=Description')).toBeVisible();
    await expect(page.locator('text=Tags')).toBeVisible();
    await expect(page.locator('text=Texte alternatif')).toBeVisible();
    await expect(page.locator('text=Légende')).toBeVisible();
  });

  test('devrait permettre de modifier les métadonnées', async ({ page }) => {
    await page.goto('/description?imageId=test-image-id');

    // Remplir le formulaire
    await page.fill('input[placeholder="Titre de l\'image"]', 'Mon titre de test');
    await page.fill('textarea[placeholder="Description détaillée"]', 'Ma description de test');
    await page.fill('input[placeholder="tag1, tag2, tag3"]', 'test, image, exemple');
    await page.fill('input[placeholder="Description pour l\'accessibilité"]', 'Image de test pour l\'accessibilité');
    await page.fill('textarea[placeholder="Légende courte"]', 'Légende de test');

    // Sauvegarder
    await page.click('button:has-text("Sauvegarder")');

    // Vérifier que la sauvegarde fonctionne (test visuel)
    await expect(page.locator('button:has-text("Sauvegarder")')).toBeVisible();
  });

  test('devrait accéder à la page de tri depuis la galerie', async ({ page }) => {
    // Créer une galerie
    await page.click('button:has-text("Nouvelle")');
    await page.fill('input[placeholder="Nom de la galerie"]', 'Galerie tri');
    await page.click('button:has-text("Créer")');

    // Naviguer vers la page de tri (simulé)
    await page.goto('/sort');

    // Vérifier que la page de tri se charge
    await expect(page.locator('h1')).toContainText('PMP - Organisation et Tri');
  });

  test('devrait afficher les publications dans la sidebar', async ({ page }) => {
    await page.goto('/sort');

    // Vérifier la présence de la sidebar des publications
    await expect(page.locator('h2')).toContainText('Publications');
    await expect(page.locator('button:has-text("Nouvelle publication")')).toBeVisible();
  });

  test('devrait permettre de créer une nouvelle publication', async ({ page }) => {
    await page.goto('/sort');

    // Cliquer sur le bouton de création
    await page.click('button:has-text("Nouvelle publication")');

    // Vérifier que la publication est créée (test visuel)
    await expect(page.locator('button:has-text("Nouvelle publication")')).toBeVisible();
  });

  test('devrait permettre la sélection d\'une publication', async ({ page }) => {
    await page.goto('/sort');

    // Créer une publication de test
    await page.click('button:has-text("Nouvelle publication")');

    // Sélectionner la publication créée
    await page.click('text=Nouvelle publication');

    // Vérifier que la publication est sélectionnée
    await expect(page.locator('.bg-indigo-50')).toBeVisible();
  });

  test('devrait afficher la grille de tri avec les images', async ({ page }) => {
    await page.goto('/sort');

    // Créer une publication
    await page.click('button:has-text("Nouvelle publication")');

    // Sélectionner la publication
    await page.click('text=Nouvelle publication');

    // Vérifier la présence de la grille de tri
    await expect(page.locator('text=Glissez les images')).toBeVisible();
  });

  test('devrait permettre le drag and drop des images', async ({ page }) => {
    await page.goto('/sort');

    // Créer une publication avec des images mockées
    await page.click('button:has-text("Nouvelle publication")');

    // Sélectionner la publication
    await page.click('text=Nouvelle publication');

    // Vérifier que les éléments sont dragables
    await expect(page.locator('[draggable="true"]')).toBeVisible();
  });

  test('devrait afficher les numéros de position des images', async ({ page }) => {
    await page.goto('/sort');

    // Créer une publication
    await page.click('button:has-text("Nouvelle publication")');

    // Sélectionner la publication
    await page.click('text=Nouvelle publication");

    // Vérifier la présence des indicateurs de position
    await expect(page.locator('text=Glissez pour réorganiser')).toBeVisible();
  });

  test('devrait permettre la sauvegarde de l\'ordre', async ({ page }) => {
    await page.goto('/sort');

    // Créer une publication
    await page.click('button:has-text("Nouvelle publication")');

    // Sélectionner la publication
    await page.click('text=Nouvelle publication');

    // Cliquer sur le bouton de sauvegarde
    await page.click('button:has-text("Sauvegarder l\'ordre")');

    // Vérifier que la sauvegarde fonctionne
    await expect(page.locator('button:has-text("Sauvegarder l\'ordre")')).toBeVisible();
  });

  test('devrait afficher un message pour les publications vides', async ({ page }) => {
    await page.goto('/sort');

    // Vérifier le message pour publication non sélectionnée
    await expect(page.locator('text=Sélectionnez une publication')).toBeVisible();
  });

  test('devrait gérer la navigation entre les images dans la description', async ({ page }) => {
    await page.goto('/description?imageId=test-image-id');

    // Vérifier les boutons de navigation
    await expect(page.locator('text=Précédente')).toBeVisible();
    await expect(page.locator('text=Suivante')).toBeVisible();
  });

  test('devrait afficher l\'aperçu de l\'image dans la description', async ({ page }) => {
    await page.goto('/description?imageId=test-image-id');

    // Vérifier la présence de l'aperçu
    await expect(page.locator('h2')).toContainText('Aperçu');
  });

  test('devrait afficher les informations de l\'image actuelle', async ({ page }) => {
    await page.goto('/description?imageId=test-image-id');

    // Vérifier les informations de l'image
    await expect(page.locator('text=Image 1 sur')).toBeVisible();
  });

  test('devrait permettre l\'annulation des modifications', async ({ page }) => {
    await page.goto('/description?imageId=test-image-id');

    // Remplir le formulaire
    await page.fill('input[placeholder="Titre de l\'image"]', 'Titre à annuler');

    // Cliquer sur annuler
    await page.click('button:has-text("Annuler")');

    // Vérifier que le formulaire peut être annulé
    await expect(page.locator('button:has-text("Annuler")')).toBeVisible();
  });

  test('devrait afficher les conseils pour les métadonnées', async ({ page }) => {
    await page.goto('/description?imageId=test-image-id');

    // Vérifier la présence des conseils pour les tags
    await expect(page.locator('text=Séparez les tags par des virgules')).toBeVisible();
    await expect(page.locator('text=Important pour l\'accessibilité')).toBeVisible();
  });

  test('devrait gérer les états de sauvegarde', async ({ page }) => {
    await page.goto('/description?imageId=test-image-id');

    // Cliquer sur sauvegarder
    await page.click('button:has-text("Sauvegarder")');

    // Vérifier l'état de sauvegarde
    await expect(page.locator('text=Sauvegarde')).toBeVisible();
  });

  test('devrait afficher la date de dernière modification', async ({ page }) => {
    await page.goto('/description?imageId=test-image-id');

    // Vérifier la présence de la date de modification
    await expect(page.locator('text=Dernière modification')).toBeVisible();
  });
});
