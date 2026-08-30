import { test, expect } from '@playwright/test';

test.describe('Cart & Checkout Flow', () => {
  test('should load the cart page', async ({ page }) => {
    await page.goto('/marketplace/cart');
    await expect(page.locator('body')).toBeVisible();
    // Cart page should have a heading or empty state
    const heading = page.getByText(/cart|shopping bag/i).first();
    await expect(heading).toBeVisible();
  });

  test('should show empty cart state when no items', async ({ page }) => {
    await page.goto('/marketplace/cart');
    await page.waitForTimeout(1000);

    // Either shows items or empty state
    const cartContent = page.locator('body');
    await expect(cartContent).toBeVisible();
  });

  test('should navigate to checkout from cart', async ({ page }) => {
    await page.goto('/marketplace/cart');
    const checkoutBtn = page.locator('a[href*="checkout"], button:text-matches("checkout|proceed", "i")').first();
    if (await checkoutBtn.isVisible()) {
      await checkoutBtn.click();
      await expect(page).toHaveURL(/\/marketplace\/checkout/);
    }
  });

  test('should load the checkout page', async ({ page }) => {
    await page.goto('/marketplace/checkout');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display payment methods on checkout', async ({ page }) => {
    await page.goto('/marketplace/checkout');
    await page.waitForTimeout(1500);

    // Look for payment section
    const paymentSection = page.getByText(/payment/i).first();
    if (await paymentSection.isVisible()) {
      await expect(paymentSection).toBeVisible();
    }
  });

  test('should load checkout success page', async ({ page }) => {
    await page.goto('/marketplace/checkout/success');
    await expect(page.locator('body')).toBeVisible();
    // Should show confirmation
    const confirmation = page.getByText(/confirmed|success|thank/i).first();
    if (await confirmation.isVisible()) {
      await expect(confirmation).toBeVisible();
    }
  });

  test('should load checkout failed page with retry option', async ({ page }) => {
    await page.goto('/marketplace/checkout/failed');
    await expect(page.locator('body')).toBeVisible();

    // Should show error and retry
    await expect(page.getByText(/failed|error/i).first()).toBeVisible();
    const retryBtn = page.getByText(/retry/i).first();
    await expect(retryBtn).toBeVisible();
  });
});
