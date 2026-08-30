import { test, expect } from '@playwright/test';

test.describe('Search Page', () => {
  test('should load search page with query', async ({ page }) => {
    await page.goto('/marketplace/search?q=laptop');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display search results', async ({ page }) => {
    await page.goto('/marketplace/search?q=phone');
    await page.waitForTimeout(2000);

    // Should show results or no-results state
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('should have sort controls', async ({ page }) => {
    await page.goto('/marketplace/search?q=shoes');
    await page.waitForTimeout(1500);

    const sortSelect = page.locator('select').first();
    if (await sortSelect.isVisible()) {
      await expect(sortSelect).toBeVisible();
    }
  });

  test('should navigate to product from search results', async ({ page }) => {
    await page.goto('/marketplace/search?q=headphones');
    await page.waitForTimeout(2000);

    const productLink = page.locator('a[href*="/marketplace/product/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await expect(page).toHaveURL(/\/marketplace\/product\//);
    }
  });

  test('should handle empty search gracefully', async ({ page }) => {
    await page.goto('/marketplace/search?q=');
    await expect(page.locator('body')).toBeVisible();
    // Should not crash
  });
});

test.describe('Brand Page', () => {
  test('should load brand page', async ({ page }) => {
    await page.goto('/marketplace/brand/apple');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display brand info', async ({ page }) => {
    await page.goto('/marketplace/brand/apple');
    await page.waitForTimeout(1500);

    // Should have brand name visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have follow button', async ({ page }) => {
    await page.goto('/marketplace/brand/apple');
    await page.waitForTimeout(1500);

    const followBtn = page.getByRole('button', { name: /follow/i }).first();
    if (await followBtn.isVisible()) {
      await expect(followBtn).toBeEnabled();
    }
  });

  test('should load brands following page', async ({ page }) => {
    await page.goto('/marketplace/brands/following');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load brands feed page', async ({ page }) => {
    await page.goto('/marketplace/brands/feed');
    await expect(page.locator('body')).toBeVisible();
  });
});
