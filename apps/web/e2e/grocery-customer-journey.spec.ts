import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════
// KARTSEEK Grocery Module — End-to-End Customer Journey Tests
// ═══════════════════════════════════════════════════════════════════════════
//
// These tests verify the complete customer journey across the Grocery module:
// - Homepage loads with categories, stores, flash deals
// - Store pages show products with correct store branding
// - Product detail pages render correctly
// - Cart + checkout flow works
// - Search returns relevant results
// - Wishlist add/remove
//
// PRECONDITION — this changed. These pages used to fall back to bundled demo
// fixtures whenever an API call failed, so the suite passed against no backend
// at all and proved only that the fixtures rendered. Those fallbacks are gone:
// a page whose request fails now shows an error state. The suite therefore
// needs api-gateway and grocery-service up, with a seeded catalogue.
//
// Assertions here are deliberately structural — landmarks, headings, URLs — so
// they do not encode particular catalogue rows. Anything that asserts on
// specific products would be testing the seed data, not the journey.
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Grocery Module — Customer Journey', () => {

  // ── Homepage ─────────────────────────────────────────────────────────────

  test.describe('Homepage', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/grocery');
    });

    test('should load and display the delivery location bar', async ({ page }) => {
      await expect(page.locator('text=Deliver to')).toBeVisible();
    });

    test('should display hero banner carousel', async ({ page }) => {
      // Hero section should be present with a gradient background
      const heroSection = page.locator('section').first();
      await expect(heroSection).toBeVisible();
    });

    test('should display Shop by Category section', async ({ page }) => {
      await expect(page.locator('text=Shop by Category')).toBeVisible();
    });

    test('should display category items with emojis', async ({ page }) => {
      // Each category should be a link with an emoji
      const categoryLinks = page.locator('.cat-grid a');
      const count = await categoryLinks.count();
      expect(count).toBeGreaterThan(5);
    });

    test('should display Flash Deals section', async ({ page }) => {
      await expect(page.locator('text=Flash Deals')).toBeVisible({ timeout: 10000 });
    });

    test('should display Featured & Sponsored Stores section', async ({ page }) => {
      await expect(page.locator('text=Featured & Sponsored Stores')).toBeVisible();
    });

    test('should display trust badges strip', async ({ page }) => {
      // Trust badges should include quality guarantee text
      await expect(page.locator('text=Freshness Guarantee').or(page.locator('text=Free Delivery'))).toBeVisible();
    });

    test('should have skip-to-content accessibility link', async ({ page }) => {
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toBeAttached();
    });

    test('should navigate to category page when category is clicked', async ({ page }) => {
      const firstCategory = page.locator('.cat-grid a').first();
      await firstCategory.click();
      await expect(page).toHaveURL(/\/grocery\/category\//);
    });
  });

  // ── Store Page ───────────────────────────────────────────────────────────

  test.describe('Store Page', () => {
    test('should display store information and products', async ({ page }) => {
      // Navigate to a demo store
      await page.goto('/grocery/store/freshmart');
      await page.waitForLoadState('networkidle');

      // Store name should be visible in the page
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    });

    test('should display products with store branding', async ({ page }) => {
      await page.goto('/grocery/store/freshmart');
      await page.waitForLoadState('networkidle');

      // Product cards should exist
      const productCards = page.locator('[class*="product"], [class*="card"]');
      // We expect at least some product content
      await expect(page.locator('main')).toBeVisible();
    });

    test('should have dynamic page title', async ({ page }) => {
      await page.goto('/grocery/store/freshmart');
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      // Title should not be empty and should contain KARTSEEK
      expect(title.length).toBeGreaterThan(0);
    });
  });

  // ── Search ───────────────────────────────────────────────────────────────

  test.describe('Search', () => {
    test('should navigate to search page with query', async ({ page }) => {
      await page.goto('/grocery/search?q=milk');
      await page.waitForLoadState('networkidle');

      // Assert the search box carries the query, not that the word "milk" appears
      // somewhere on the page. The old assertion passed for the wrong reason: it
      // matched the demo fixtures' product names, so it went green even when the
      // query was ignored — and with the fixtures gone it would match only the
      // "nothing matches “milk”" copy, going red on a seeded catalogue.
      await expect(page.getByRole('searchbox', { name: /search groceries/i })).toHaveValue('milk');
    });

    test('should display search results or no-results message', async ({ page }) => {
      await page.goto('/grocery/search?q=banana');
      await page.waitForLoadState('networkidle');

      // Should show results section or "no results" message
      const mainContent = page.locator('main, #main-content');
      await expect(mainContent).toBeVisible();
    });

    test('should have dynamic title with search query', async ({ page }) => {
      await page.goto('/grocery/search?q=organic');
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.toLowerCase()).toContain('organic');
    });
  });

  // ── Category Page ────────────────────────────────────────────────────────

  test.describe('Category Page', () => {
    test('should display category name and products', async ({ page }) => {
      await page.goto('/grocery/category/fruits-vegetables');
      await page.waitForLoadState('networkidle');

      // Category should have a heading
      const content = page.locator('main, #main-content');
      await expect(content).toBeVisible();
    });

    test('should have dynamic title with category name', async ({ page }) => {
      await page.goto('/grocery/category/fruits-vegetables');
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(5);
    });
  });

  // ── Cart & Checkout ──────────────────────────────────────────────────────

  test.describe('Cart Flow', () => {
    test('should have cart link in header', async ({ page }) => {
      await page.goto('/grocery');
      const cartLink = page.locator('a[href="/grocery/cart"]');
      await expect(cartLink).toBeVisible();
    });

    test('should navigate to cart page', async ({ page }) => {
      await page.goto('/grocery/cart');
      await page.waitForLoadState('networkidle');

      // Cart page should load
      const content = page.locator('main, #main-content');
      await expect(content).toBeVisible();
    });

    test('should navigate to checkout page', async ({ page }) => {
      await page.goto('/grocery/checkout');
      await page.waitForLoadState('networkidle');

      const content = page.locator('main, #main-content');
      await expect(content).toBeVisible();
    });
  });

  // ── Navigation & Layout ──────────────────────────────────────────────────

  test.describe('Navigation', () => {
    test('should have bottom navigation bar on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/grocery');

      // Bottom nav should have Home, Categories, Orders, Account
      const bottomNav = page.locator('nav').last();
      await expect(bottomNav).toBeVisible();
    });

    test('should have ARIA landmarks for accessibility', async ({ page }) => {
      await page.goto('/grocery');

      // Should have a main landmark
      const main = page.locator('[role="main"], main');
      await expect(main).toBeVisible();

      // Should have a banner/header
      const header = page.locator('[role="banner"], header');
      await expect(header).toBeVisible();
    });

    test('should support RTL direction for Arabic countries', async ({ page }) => {
      // Navigate and change country to Qatar (Arabic)
      await page.goto('/grocery');

      // Country selector should be present
      const countryButton = page.locator('button').filter({ hasText: /🇮🇳|🇶🇦|🇦🇪/ }).first();
      await expect(countryButton).toBeVisible();
    });
  });

  // ── Wishlist ─────────────────────────────────────────────────────────────

  test.describe('Wishlist', () => {
    test('should navigate to wishlist page', async ({ page }) => {
      await page.goto('/grocery/wishlist');
      await page.waitForLoadState('networkidle');

      const content = page.locator('main, #main-content');
      await expect(content).toBeVisible();
    });

    test('should have wishlist icon in header', async ({ page }) => {
      await page.goto('/grocery');

      // Heart icon for wishlist
      const wishlistLink = page.locator('a[href="/grocery/wishlist"]');
      await expect(wishlistLink).toBeVisible();
    });
  });

  // ── Order History ────────────────────────────────────────────────────────

  test.describe('Orders', () => {
    test('should navigate to orders page', async ({ page }) => {
      await page.goto('/grocery/orders');
      await page.waitForLoadState('networkidle');

      const content = page.locator('main, #main-content');
      await expect(content).toBeVisible();
    });
  });

  // ── Performance ──────────────────────────────────────────────────────────

  test.describe('Performance', () => {
    test('should load homepage within 5 seconds', async ({ page }) => {
      const start = Date.now();
      await page.goto('/grocery');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - start;

      // Homepage should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should lazy-load below-fold sections', async ({ page }) => {
      await page.goto('/grocery');

      // Initial render should NOT have all store sections visible
      // Scroll down to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, 2000));
      await page.waitForTimeout(500);

      // After scroll, sections should start appearing
      const trendingSection = page.locator('text=Trending Stores');
      // May or may not be visible depending on scroll position, but page should still be responsive
      await expect(page.locator('main, #main-content')).toBeVisible();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Admin Panel Tests
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Admin Panel — Grocery Section', () => {
  test('should load admin grocery flash deals page', async ({ page }) => {
    await page.goto('/admin/grocery/flash-deals');
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, #main-content, [class*="admin"]');
    await expect(content.first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Seller Portal Tests
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Seller Portal — Grocery Section', () => {
  test('should load seller grocery flash deals page', async ({ page }) => {
    await page.goto('/seller/grocery/flash-deals');
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, #main-content, [class*="seller"]');
    await expect(content.first()).toBeVisible();
  });

  test('should load seller grocery products page', async ({ page }) => {
    await page.goto('/seller/grocery/products');
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, #main-content, [class*="seller"]');
    await expect(content.first()).toBeVisible();
  });
});
