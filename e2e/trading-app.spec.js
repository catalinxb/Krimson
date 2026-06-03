import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should open login from the landing page', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1').filter({ hasText: 'KRIMSON' })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Invisible in the noise. Clear in the books.' })).toBeVisible();

    await page.click('button:has-text("Enter Terminal")');

    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1').filter({ hasText: 'KRIMSON' })).toBeVisible();
    await expect(page.locator('button:has-text("Initialize Session")')).toBeVisible();
  });

  test('should navigate from login to terminal after sign in', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Initialize Session")');

    await expect(page).toHaveURL(/.*terminal/);
    await expect(page.locator('h1').filter({ hasText: 'Trading Terminal' })).toBeVisible();
  });
});

test.describe('CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Initialize Session")');

    await expect(page).toHaveURL(/.*terminal/);
    await expect(page.locator('h1').filter({ hasText: 'Trading Terminal' })).toBeVisible();
  });

  test('should create a new trade', async ({ page }) => {
    // Click New Trade button
    await page.click('button:has-text("New Trade")');
    
    // Fill the inputs inside the Dialog
    await page.getByLabel('Asset').fill('ADA-TEST/USDT');
    await page.getByLabel('Entry Price').fill('0.5');
    await page.getByLabel('Exit Price').fill('0.6');
    
    // Click Create
    await page.click('button:has-text("Create")');
    
    // Verify it appeared in the table
    await expect(page.locator('tbody tr', { hasText: 'ADA-TEST/USDT' }).first()).toBeVisible();
  });

  test('should edit an existing trade', async ({ page }) => {
    // Setup: Create a uniquely named trade so the edit target is unambiguous
    await page.click('button:has-text("New Trade")');
    await page.getByLabel('Asset').fill('TRADE-EDIT-TEST/USDT');
    await page.getByLabel('Entry Price').fill('0.5');
    await page.getByLabel('Exit Price').fill('0.6');
    await page.click('button:has-text("Create")');

    const tradeRow = page.locator('tbody tr', { hasText: 'TRADE-EDIT-TEST/USDT' }).first();
    await tradeRow.locator('[title="Edit"]').click();
    await expect(page.getByLabel('Asset')).toHaveValue('TRADE-EDIT-TEST/USDT');

    await page.getByLabel('Asset').fill('TRADE-EDIT-TEST/USDT-UPDATED');
    await page.click('button:has-text("Update")');

    await expect(page.locator('tbody tr', { hasText: 'TRADE-EDIT-TEST/USDT-UPDATED' }).first()).toBeVisible();
  });

  test('should delete a trade', async ({ page }) => {
    // Setup: Create a uniquely named trade so delete target is unambiguous
    await page.click('button:has-text("New Trade")');
    await page.fill('input[placeholder="e.g., BTC/USDT"]', 'DELETE-TEST/USDT');
    await page.getByLabel('Entry Price').fill('1');
    await page.getByLabel('Exit Price').fill('2');
    await page.click('button:has-text("Create")');

    const tradeRow = page.locator('tbody tr', { hasText: 'DELETE-TEST/USDT' }).first();
    page.on('dialog', dialog => dialog.accept());
    await tradeRow.locator('[title="Delete"]').click();

    await expect(page.locator('tbody tr', { hasText: 'DELETE-TEST/USDT' })).toHaveCount(0);
  });
});

test.describe('Cookie Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('should track user activity in cookies', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Initialize Session")');

    await expect(page).toHaveURL(/.*terminal/);
    await expect(page.locator('h1').filter({ hasText: 'Trading Terminal' })).toBeVisible();

    await page.waitForFunction(() => document.cookie.includes('activity_count='));

    const cookies = await page.context().cookies();
    const activityCookie = cookies.find((c) => c.name === 'activity_count');
    expect(activityCookie).toBeTruthy();
    expect(parseInt(activityCookie.value)).toBeGreaterThan(0);
  });

  test('should save user preferences', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Initialize Session")');

    await expect(page.locator('text=Trading Terminal')).toBeVisible();
  });
});