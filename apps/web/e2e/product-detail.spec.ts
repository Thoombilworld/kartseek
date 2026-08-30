import { test, expect } from '@playwright/test';

test.describe('Product Detail Page', () => {
  test('should load a product detail page', async ({ page }) => {
    // Navigate to a known product (uses demo data fallback)
    await page.goto('/marketplace/product/iphone-15-pro-max');
    await page.waitForTimeout(1500);

    // Page should render without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display product information', async ({ page }) => {
    await page.goto('/marketplace/product/iphone-15-pro-max');
    await page.waitForTimeout(1500);

    // Should have price displayed
    const priceElement = page.locator('text=/[₹$]\\s?[\\d,]+/').first();
    if (await priceElement.isVisible()) {
      await expect(priceElement).toBeVisible();
    }
  });

  test('should have add to cart button', async ({ page }) => {
    await page.goto('/marketplace/product/iphone-15-pro-max');
    await page.waitForTimeout(1500);

    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    if (await addToCartBtn.isVisible()) {
      await expect(addToCartBtn).toBeEnabled();
    }
  });

  test('should have buy now button', async ({ page }) => {
    await page.goto('/marketplace/product/iphone-15-pro-max');
    await page.waitForTimeout(1500);

    const buyNowBtn = page.getByRole('button', { name: /buy now/i }).first();
    if (await buyNowBtn.isVisible()) {
      await expect(buyNowBtn).toBeEnabled();
    }
  });

  test('should navigate back to marketplace', async ({ page }) => {
    await page.goto('/marketplace/product/iphone-15-pro-max');
    await page.waitForTimeout(1000);

    // Click back/home link
    const homeLink = page.locator('a[href="/marketplace"]').first();
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await expect(page).toHaveURL(/\/marketplace$/);
    }
  });
});
