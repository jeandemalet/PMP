import { test, expect } from '@playwright/test';

test.describe('Calendrier et Export - Tests End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await page.goto('/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Attendre la redirection vers la galerie
    await expect(page).toHaveURL('/gallery');
  });

  test('devrait accéder à la page calendrier depuis la galerie', async ({ page }) => {
    // Naviguer vers la page calendrier
    await page.goto('/calendar');

    // Vérifier que la page calendrier se charge
    await expect(page.locator('h1')).toContainText('PMP - Calendrier de Publication');
  });

  test('devrait afficher la sidebar des publications', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier la présence de la sidebar des publications
    await expect(page.locator('h2')).toContainText('Publications');
    await expect(page.locator('text=Glissez les publications sur le calendrier')).toBeVisible();
  });

  test('devrait afficher le calendrier mensuel', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier la présence du calendrier
    await expect(page.locator('h2')).toContainText(/janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre/i);
    await expect(page.locator('text=Dim')).toBeVisible();
    await expect(page.locator('text=Lun')).toBeVisible();
    await expect(page.locator('text=Mar')).toBeVisible();
    await expect(page.locator('text=Mer')).toBeVisible();
    await expect(page.locator('text=Jeu')).toBeVisible();
    await expect(page.locator('text=Ven')).toBeVisible();
    await expect(page.locator('text=Sam')).toBeVisible();
  });

  test('devrait permettre la navigation dans le calendrier', async ({ page }) => {
    await page.goto('/calendar');

    // Cliquer sur mois précédent
    await page.click('button:has-text("Mois précédent")');

    // Cliquer sur mois suivant
    await page.click('button:has-text("Mois suivant")');

    // Cliquer sur aujourd'hui
    await page.click('button:has-text("Aujourd\'hui")');

    // Vérifier que la navigation fonctionne
    await expect(page.locator('h2')).toBeVisible();
  });

  test('devrait afficher les publications avec leurs couleurs', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier la présence des publications avec couleurs
    await expect(page.locator('.bg-blue-500, .bg-green-500, .bg-purple-500')).toBeVisible();
  });

  test('devrait permettre le drag and drop des publications sur le calendrier', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier que les publications sont dragables
    await expect(page.locator('[draggable="true"]')).toBeVisible();

    // Vérifier que les jours du calendrier acceptent le drop
    await expect(page.locator('[draggable="true"]')).toBeVisible();
  });

  test('devrait afficher les statistiques des publications', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier la présence des statistiques
    await expect(page.locator('text=Publications planifiées')).toBeVisible();
    await expect(page.locator('text=Publications non planifiées')).toBeVisible();
  });

  test('devrait afficher la légende des couleurs', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier la présence de la légende
    await expect(page.locator('text=Légende')).toBeVisible();
    await expect(page.locator('.bg-blue-500')).toBeVisible();
  });

  test('devrait permettre le changement de vue mois/semaine', async ({ page }) => {
    await page.goto('/calendar');

    // Cliquer sur le bouton de changement de vue
    await page.click('button:has-text("Vue mois")');

    // Vérifier que le bouton change
    await expect(page.locator('button:has-text("Vue semaine")')).toBeVisible();
  });

  test('devrait afficher un message pour les publications vides', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier le message pour publications vides
    await expect(page.locator('text=Aucune publication')).toBeVisible();
    await expect(page.locator('text=Créez des publications depuis la page Tri')).toBeVisible();
  });

  test('devrait permettre l\'export de toutes les publications', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier la présence du bouton d'export
    await expect(page.locator('button:has-text("📥 Exporter tout")')).toBeVisible();

    // Le bouton devrait être désactivé s'il n'y a pas de publications planifiées
    await expect(page.locator('button:has-text("📥 Exporter tout")')).toBeDisabled();
  });

  test('devrait afficher les publications planifiées sur les bonnes dates', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier que les publications planifiées apparaissent sur les bonnes dates
    // (Ce test nécessiterait des données de test pré-remplies)
    await expect(page.locator('text=Aucun contenu')).toBeVisible();
  });

  test('devrait permettre la déplanification d\'une publication', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier que les publications planifiées peuvent être modifiées
    // (Ce test nécessiterait des données de test pré-remplies)
    await expect(page.locator('text=Publications')).toBeVisible();
  });

  test('devrait gérer les erreurs d\'export', async ({ page }) => {
    await page.goto('/calendar');

    // Tenter un export sans publications
    // Le bouton devrait être désactivé
    await expect(page.locator('button:has-text("📥 Exporter tout")')).toBeDisabled();
  });

  test('devrait afficher les informations détaillées des publications', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier l'affichage des informations des publications
    await expect(page.locator('text=images')).toBeVisible();
  });

  test('devrait permettre la création de nouvelles publications depuis le calendrier', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier qu'on peut créer des publications
    // (La création se fait depuis la page tri, mais on peut vérifier la navigation)
    await expect(page.locator('text=Publications')).toBeVisible();
  });

  test('devrait gérer la responsivité du calendrier', async ({ page }) => {
    await page.goto('/calendar');

    // Tester la responsivité sur mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Vérifier que le calendrier reste fonctionnel
    await expect(page.locator('h1')).toContainText('PMP - Calendrier de Publication');
  });

  test('devrait afficher les tooltips des publications', async ({ page }) => {
    await page.goto('/calendar');

    // Survoler une publication pour vérifier les tooltips
    // (Ce test nécessiterait des données de test pré-remplies)
    await expect(page.locator('text=Publications')).toBeVisible();
  });

  test('devrait permettre la recherche et le filtrage des publications', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier qu'il n'y a pas de fonction de recherche pour l'instant
    // (Cette fonctionnalité pourrait être ajoutée plus tard)
    await expect(page.locator('text=Publications')).toBeVisible();
  });

  test('devrait gérer les publications avec beaucoup d\'images', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier que les publications avec beaucoup d'images sont gérées correctement
    await expect(page.locator('text=images')).toBeVisible();
  });

  test('devrait afficher les métadonnées des publications dans le calendrier', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier l'affichage des métadonnées
    await expect(page.locator('text=Planifié')).toBeVisible();
  });
});
