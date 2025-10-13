import { test, expect } from '@playwright/test';

// Tests E2E robustes utilisant les sélecteurs data-testid
// Ces tests sont indépendants des changements de style CSS

test.describe('Gallery Management - Tests Robustes', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@pmp.local');
    await page.fill('[data-testid="password-input"]', 'test-password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/gallery');
  });

  test('Création d\'une nouvelle galerie', async ({ page }) => {
    // Cliquer sur le bouton de création de galerie
    await page.getByTestId('create-gallery-button').click();

    // Remplir le formulaire avec les sélecteurs data-testid
    await page.getByTestId('gallery-name-input').fill('Ma galerie de test');
    await page.getByTestId('gallery-description-input').fill('Description de test');

    // Confirmer la création
    await page.getByTestId('confirm-create-gallery-button').click();

    // Vérifier que la galerie apparaît dans la liste avec le texte correct
    await expect(page.getByText('Ma galerie de test')).toBeVisible();
  });

  test('Sélection et tri des images', async ({ page }) => {
    // Sélectionner une galerie existante
    await page.getByTestId(/^gallery-item-/).first().click();

    // Attendre que les images se chargent
    await page.waitForSelector('[data-testid*="gallery-image-"]');

    // Sélectionner quelques images
    const firstImage = page.getByTestId(/gallery-image-/).first();
    await firstImage.click();

    // Vérifier que l'image est sélectionnée
    await expect(firstImage).toHaveAttribute('data-selected', 'true');

    // Changer le tri
    await page.getByTestId('sort-select').selectOption('name-asc');

    // Vérifier que le tri a été appliqué
    await expect(page.getByTestId('sort-select')).toHaveValue('name-asc');
  });

  test('Suppression d\'images sélectionnées', async ({ page }) => {
    // Sélectionner une galerie avec des images
    await page.getByTestId(/^gallery-item-/).first().click();

    // Attendre et sélectionner la première image
    await page.waitForSelector('[data-testid*="gallery-image-"]');
    await page.getByTestId(/gallery-image-/).first().click();

    // Cliquer sur le bouton supprimer (qui apparaît quand des images sont sélectionnées)
    await page.click('[data-testid="delete-selected-button"]');

    // Confirmer la suppression dans la modale
    await page.click('[data-testid="confirm-delete-button"]');

    // Vérifier que l'image a été supprimée
    await expect(page.getByTestId(/gallery-image-/).first()).not.toBeVisible();
  });
});

// Tests d'administration avec sélecteurs robustes
test.describe('Admin Panel - Tests Robustes', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@pmp.local');
    await page.fill('[data-testid="password-input"]', 'test-password');
    await page.click('[data-testid="login-button"]');
    await page.goto('/admin');
  });

  test('Accès à la liste des utilisateurs avec stockage', async ({ page }) => {
    // Naviguer vers la gestion des utilisateurs
    await page.click('[data-testid="admin-users-tab"]');

    // Vérifier que les utilisateurs sont affichés avec leurs métriques
    await expect(page.getByTestId('users-list')).toBeVisible();

    // Vérifier que le stockage est affiché pour chaque utilisateur
    await expect(page.getByTestId('user-storage-info')).toBeVisible();
  });

  test('Fonctionnalité d\'impersonation', async ({ page }) => {
    // Naviguer vers la gestion des utilisateurs
    await page.click('[data-testid="admin-users-tab"]');

    // Cliquer sur le bouton d'impersonation pour le premier utilisateur
    await page.getByTestId('impersonate-user-button').first().click();

    // Vérifier que le bandeau d'avertissement apparaît
    await expect(page.getByText(/Vous naviguez en tant que/)).toBeVisible();

    // Cliquer sur le bouton de retour
    await page.getByText('Retourner à mon compte administrateur').click();

    // Vérifier que le bandeau disparaît
    await expect(page.getByText(/Vous naviguez en tant que/)).not.toBeVisible();
  });
});

// Test de drag & drop avec sélecteurs robustes
test.describe('Drag & Drop Functionality', () => {
  test('Réorganisation des images par glisser-déposer', async ({ page }) => {
    // Se connecter et aller en galerie
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@pmp.local');
    await page.fill('[data-testid="password-input"]', 'test-password');
    await page.click('[data-testid="login-button"]');

    // Sélectionner une galerie
    await page.getByTestId(/^gallery-item-/).first().click();

    // Attendre le chargement des images
    await page.waitForSelector('[data-testid*="gallery-image-"]');

    // Récupérer deux images pour le drag & drop
    const image1 = page.getByTestId(/gallery-image-/).first();
    const image2 = page.getByTestId(/gallery-image-/).nth(1);

    // Simuler le drag & drop avec les méthodes natives de Playwright
    await image1.dragTo(image2);

    // Vérifier que l'ordre a changé (l'API de réorganisation a été appelée)
    // Cette vérification dépend de votre implémentation spécifique
  });
});
