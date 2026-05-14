# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: trading-app.spec.js >> Authentication Flow >> should navigate from landing to terminal
- Location: e2e\trading-app.spec.js:23:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Enter Terminal")')

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Authentication Flow', () => {
  4   |   test('should navigate to landing after login', async ({ page }) => {
  5   |     await page.goto('/');
  6   |     
  7   |     // Check if we're on auth page
  8   |     await expect(page.locator('h1').filter({ hasText: 'KRIMSON' })).toBeVisible();
  9   |     await expect(page.locator('p').filter({ hasText: 'Advanced Trading Terminal' })).toBeVisible();
  10  |     
  11  |     // Fill login form
  12  |     await page.fill('input[type="email"]', 'test@example.com');
  13  |     await page.fill('input[type="password"]', 'password123');
  14  |     
  15  |     // Click login
  16  |     await page.click('button:has-text("Initialize Session")');
  17  |     
  18  |     // Should navigate to landing
  19  |     await expect(page).toHaveURL(/.*landing/);
  20  |     await expect(page.locator('text=KRIMSON')).toBeVisible();
  21  |   });
  22  | 
  23  |   test('should navigate from landing to terminal', async ({ page }) => {
  24  |     await page.goto('/landing');
> 25  |     await page.click('button:has-text("Enter Terminal")');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  26  |     await expect(page).toHaveURL(/.*terminal/);
  27  |     await expect(page.locator('h1').filter({ hasText: 'Trading Terminal' })).toBeVisible();
  28  |   });
  29  | });
  30  | 
  31  | test.describe('CRUD Operations', () => {
  32  |   test.beforeEach(async ({ page }) => {
  33  |     await page.goto('/');
  34  |     await page.fill('input[type="email"]', 'test@example.com');
  35  |     await page.fill('input[type="password"]', 'password123');
  36  |     await page.click('button:has-text("Initialize Session")');
  37  |     await page.click('button:has-text("Enter Terminal")');
  38  |     await expect(page.locator('h1').filter({ hasText: 'Trading Terminal' })).toBeVisible();
  39  |   });
  40  | 
  41  |   test('should create a new trade', async ({ page }) => {
  42  |     // Click New Trade button
  43  |     await page.click('button:has-text("New Trade")');
  44  |     await page.fill('input[placeholder="e.g., BTC/USDT"]', 'ADA/USDT');
  45  |     await page.fill('#entry', '0.5');
  46  |     await page.fill('#exit', '0.6');
  47  |     await page.click('button:has-text("Create")');
  48  |     await expect(page.locator('text=ADA/USDT')).toBeVisible();
  49  |   });
  50  | 
  51  |   test('should edit an existing trade', async ({ page }) => {
  52  |     // Click edit button for first trade
  53  |     await page.locator('[title="Edit"]').first().click();
  54  |     
  55  |     // Change asset name
  56  |     await page.fill('input[value="BTC/USDT"]', 'BTC/USDT-EDITED');
  57  |     
  58  |     // Submit
  59  |     await page.click('button:has-text("Update")');
  60  |     
  61  |     // Check if updated
  62  |     await expect(page.locator('text=BTC/USDT-EDITED')).toBeVisible();
  63  |   });
  64  | 
  65  |   test('should delete a trade', async ({ page }) => {
  66  |     const initialCount = await page.locator('tbody tr').count();
  67  |     
  68  |     // Mock confirm dialog
  69  |     page.on('dialog', dialog => dialog.accept());
  70  |     
  71  |     // Click delete button
  72  |     await page.locator('[title="Delete"]').first().click();
  73  |     
  74  |     // Check if trade was removed
  75  |     await expect(page.locator('tbody tr')).toHaveCount(initialCount - 1);
  76  |   });
  77  | });
  78  | 
  79  | test.describe('Cookie Tracking', () => {
  80  |   test('should track user activity in cookies', async ({ page }) => {
  81  |     await page.goto('/');
  82  |     
  83  |     // Login
  84  |     await page.fill('input[type="email"]', 'test@example.com');
  85  |     await page.fill('input[type="password"]', 'password123');
  86  |     await page.click('button:has-text("Initialize Session")');
  87  |     
  88  |     // Navigate to terminal (charts are now on the same page)
  89  |     await page.click('button:has-text("Enter Terminal")');
  90  |     await expect(page).toHaveURL(/.*terminal/);
  91  |     await expect(page.locator('h1').filter({ hasText: 'Trading Terminal' })).toBeVisible();
  92  |     await page.waitForFunction(() => document.cookie.includes('activity_count='));
  93  | 
  94  |     const cookies = await page.context().cookies();
  95  |     const activityCookie = cookies.find(c => c.name === 'activity_count');
  96  |     expect(activityCookie).toBeTruthy();
  97  |     expect(parseInt(activityCookie.value)).toBeGreaterThan(0);
  98  |   });
  99  | 
  100 |   test('should save user preferences', async ({ page }) => {
  101 |     // This would test the cookie tracker hook, but since it's client-side,
  102 |     // we'll test that the hook is loaded by checking the page loads
  103 |     await page.goto('/terminal');
  104 |     await expect(page.locator('text=Trading Terminal')).toBeVisible();
  105 |   });
  106 | });
```