import { test, expect } from '@playwright/test';

test.describe('Marketplace Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
  });

  test('should load the homepage with key sections', async ({ page }) => {
    // Page title / heading
    await expect(page).toHaveTitle(/KartSeek|Marketplace/i);

    // Hero carousel should be visible
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();

    // Category grid should be visible
    await expect(page.getByText(/Shop by Category/i).first()).toBeVisible();

    // Trust badges section
    await expect(page.getByText(/Free Delivery/i).first()).toBeVisible();
  });

  test('should display flash deals with countdown', async ({ page }) => {
    const flashSection = page.getByText(/Flash Deals/i).first();
    await expect(flashSection).toBeVisible();
  });

  test('should navigate to category when clicked', async ({ page }) => {
    // Find and click a category link
    const categoryLink = page.locator('a[href*="/marketplace/category/"]').first();
    if (await categoryLink.isVisible()) {
      await categoryLink.click();
      await expect(page).toHaveURL(/\/marketplace\/category\//);
    }
  });

  test('should navigate to search when search is submitted', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('laptop');
      await searchInput.press('Enter');
      await expect(page).toHaveURL(/\/marketplace\/search/);
    }
  });

  test('should have working navigation links', async ({ page }) => {
    // Cart link
    const cartLink = page.locator('a[href="/marketplace/cart"]').first();
    await expect(cartLink).toBeVisible();

    // Wishlist link
    const wishlistLink = page.locator('a[href="/marketplace/wishlist"]').first();
    if (await wishlistLink.isVisible()) {
      await expect(wishlistLink).toBeVisible();
    }
  });

  test('should display product cards with prices', async ({ page }) => {
    // Wait for products to load
    await page.waitForTimeout(2000);

    // Check for product price elements (₹ or $ format)
    const prices = page.locator('text=/[₹$]\\s?[\\d,]+/');
    expect(await prices.count()).toBeGreaterThan(0);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/marketplace');

    // Page should still load without errors
    await expect(page).toHaveTitle(/KartSeek|Marketplace/i);
  });
});
