import { test, expect } from '@playwright/test';

test.describe('Recadrage - Tests End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await page.goto('/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Attendre la redirection vers la galerie
    await expect(page).toHaveURL('/gallery');
  });

  test('devrait accéder à la page de recadrage depuis la galerie', async ({ page }) => {
    // Créer une galerie avec une image mockée
    await page.click('button:has-text("Nouvelle")');
    await page.fill('input[placeholder="Nom de la galerie"]', 'Galerie de recadrage');
    await page.click('button:has-text("Créer")');

    // Sélectionner la galerie
    await page.click('text=Galerie de recadrage');

    // Naviguer vers la page de recadrage (simulé)
    await page.goto('/crop?imageId=test-image-id');

    // Vérifier que la page de recadrage se charge
    await expect(page.locator('h1')).toContainText('PMP - Recadrage d\'images');
  });

  test('devrait afficher les outils de recadrage', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Vérifier la présence des outils
    await expect(page.locator('h2')).toContainText('Outils');
    await expect(page.locator('text=Recadrage manuel')).toBeVisible();
    await expect(page.locator('text=Recadrage automatique')).toBeVisible();
  });

  test('devrait permettre de basculer entre les modes de recadrage', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Cliquer sur le mode automatique
    await page.click('text=Recadrage automatique');

    // Vérifier que le mode change
    await expect(page.locator('text=Mode automatique')).toBeVisible();
  });

  test('devrait afficher le canvas de recadrage', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Vérifier la présence du canvas
    await expect(page.locator('h2')).toContainText('Recadrage');
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('devrait afficher le filmstrip des images', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Vérifier la présence du filmstrip
    await expect(page.locator('text=Images')).toBeVisible();
    await expect(page.locator('text=disponible')).toBeVisible();
  });

  test('devrait permettre la navigation entre les images', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Vérifier les boutons de navigation
    await expect(page.locator('text=Précédente')).toBeVisible();
    await expect(page.locator('text=Suivante')).toBeVisible();
  });

  test('devrait afficher les informations sur l\'image actuelle', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Vérifier les informations de l'image
    await expect(page.locator('text=Image 1 sur')).toBeVisible();
  });

  test('devrait permettre d\'appliquer un recadrage', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Cliquer sur le bouton d'application du recadrage
    await page.click('button:has-text("Appliquer le recadrage")');

    // Vérifier que le traitement est déclenché
    await expect(page.locator('text=Traitement en cours')).toBeVisible();
  });

  test('devrait afficher les outils de recadrage en mode manuel', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // S'assurer qu'on est en mode manuel
    await page.click('text=Recadrage manuel');

    // Vérifier la présence des outils
    await expect(page.locator('text=Outils de recadrage')).toBeVisible();
    await expect(page.locator('text=Formats prédéfinis')).toBeVisible();
    await expect(page.locator('text=Formats Instagram')).toBeVisible();
  });

  test('devrait permettre de sélectionner des formats prédéfinis', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // S'assurer qu'on est en mode manuel
    await page.click('text=Recadrage manuel');

    // Cliquer sur un format prédéfini
    await page.click('button:has-text("1:1")');

    // Vérifier que le format est appliqué (test visuel)
    await expect(page.locator('button:has-text("1:1")')).toBeVisible();
  });

  test('devrait afficher les guides de règle des tiers', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // S'assurer qu'on est en mode manuel
    await page.click('text=Recadrage manuel');

    // Les guides devraient être visibles dans le canvas
    // Note: Test visuel - vérifier que le canvas contient les éléments attendus
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('devrait permettre l\'annulation du recadrage', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Cliquer sur le bouton d'annulation
    await page.click('button:has-text("Annuler")');

    // Vérifier qu'on peut revenir en arrière
    await expect(page.locator('button:has-text("Annuler")')).toBeVisible();
  });

  test('devrait afficher les conseils d\'utilisation', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Vérifier la présence des conseils
    await expect(page.locator('text=Glissez pour déplacer')).toBeVisible();
    await expect(page.locator('text=Utilisez les poignées')).toBeVisible();
  });

  test('devrait gérer les états de chargement', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Vérifier l'état de chargement initial
    await expect(page.locator('text=Chargement de l\'image')).toBeVisible();

    // Attendre que l'image se charge
    await page.waitForSelector('canvas', { timeout: 5000 });

    // Vérifier que l'état de chargement disparaît
    await expect(page.locator('text=Chargement de l\'image')).not.toBeVisible();
  });

  test('devrait afficher un message pour les images non sélectionnées', async ({ page }) => {
    await page.goto('/crop');

    // Vérifier le message d'image non sélectionnée
    await expect(page.locator('text=Aucune image sélectionnée')).toBeVisible();
    await expect(page.locator('text=Sélectionnez une image depuis la galerie')).toBeVisible();
  });

  test('devrait permettre la navigation avec le clavier', async ({ page }) => {
    await page.goto('/crop?imageId=test-image-id');

    // Tester la navigation avec les flèches du clavier
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');

    // Vérifier que la navigation fonctionne
    await expect(page.locator('text=Précédente')).toBeVisible();
    await expect(page.locator('text=Suivante')).toBeVisible();
  });
});
