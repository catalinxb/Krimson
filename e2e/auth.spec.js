const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
    test.describe('Login Page', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
        });

        test('should display login form', async ({ page }) => {
            await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
            await expect(page.getByLabel(/email address/i)).toBeVisible();
            await expect(page.getByLabel(/password/i)).toBeVisible();
            await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
        });

        test('should navigate to landing page when clicking back', async ({ page }) => {
            await page.getByRole('link', { name: /back/i }).click();
            await expect(page).toHaveURL('/');
        });

        test('should navigate to register page', async ({ page }) => {
            await page.getByRole('link', { name: /create one/i }).click();
            await expect(page).toHaveURL('/register');
        });

        test('should show validation error for empty fields', async ({ page }) => {
            await page.getByRole('button', { name: /sign in/i }).click();
            // HTML5 validation should prevent submission
            await expect(page).toHaveURL('/login');
        });

        test('should login successfully with valid credentials', async ({ page }) => {
            await page.getByLabel(/email address/i).fill('trader@example.com');
            await page.getByLabel(/password/i).fill('password123');
            await page.getByRole('button', { name: /sign in/i }).click();

            // Should redirect to terminal after successful login
            await expect(page).toHaveURL('/terminal', { timeout: 10000 });
        });

        test('should show error for invalid credentials', async ({ page }) => {
            await page.getByLabel(/email address/i).fill('trader@example.com');
            await page.getByLabel(/password/i).fill('wrongpassword');
            await page.getByRole('button', { name: /sign in/i }).click();

            // Should show error message
            await expect(page.getByText(/invalid email or password/i)).toBeVisible();
        });

        test('should toggle password visibility', async ({ page }) => {
            const passwordInput = page.getByLabel(/password/i);
            await passwordInput.fill('password123');

            // Initially password should be hidden
            await expect(passwordInput).toHaveAttribute('type', 'password');

            // Click show password button
            await page.locator('button[type="button"]').first().click();
            await expect(passwordInput).toHaveAttribute('type', 'text');

            // Click again to hide
            await page.locator('button[type="button"]').first().click();
            await expect(passwordInput).toHaveAttribute('type', 'password');
        });

        test('should show loading state during login', async ({ page }) => {
            await page.getByLabel(/email address/i).fill('trader@example.com');
            await page.getByLabel(/password/i).fill('password123');

            // Click login and check for loading state
            const loginButton = page.getByRole('button', { name: /sign in/i });
            await loginButton.click();

            // Should show loading indicator
            await expect(page.getByText(/signing in/i)).toBeVisible();
        });
    });

    test.describe('Register Page', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/register');
        });

        test('should display registration form', async ({ page }) => {
            await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
            await expect(page.getByLabel(/display name/i)).toBeVisible();
            await expect(page.getByLabel(/email address/i)).toBeVisible();
            await expect(page.getByLabel(/password/i).first()).toBeVisible();
            await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
        });

        test('should navigate to landing page when clicking back', async ({ page }) => {
            await page.getByRole('link', { name: /back/i }).click();
            await expect(page).toHaveURL('/');
        });

        test('should navigate to login page', async ({ page }) => {
            await page.getByRole('link', { name: /sign in/i }).click();
            await expect(page).toHaveURL('/login');
        });

        test('should show password requirements', async ({ page }) => {
            await expect(page.getByText(/password requirements/i)).toBeVisible();
            await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
            await expect(page.getByText(/one uppercase letter/i)).toBeVisible();
            await expect(page.getByText(/one lowercase letter/i)).toBeVisible();
            await expect(page.getByText(/one number/i)).toBeVisible();
        });

        test('should validate password requirements in real-time', async ({ page }) => {
            const passwordInput = page.getByLabel(/password/i).first();

            // Type weak password
            await passwordInput.fill('weak');

            // Check that requirements are shown as not met
            const requirements = page.locator('text=/at least 8 characters/i');
            await expect(requirements).toBeVisible();

            // Type valid password
            await passwordInput.fill('Password123');

            // Check that requirements are shown as met (green color indicates met)
            const greenCheck = page.locator('.text-green-500').first();
            await expect(greenCheck).toBeVisible();
        });

        test('should show error for mismatched passwords', async ({ page }) => {
            await page.getByLabel(/password/i).first().fill('Password123');
            await page.getByLabel(/confirm password/i).fill('DifferentPassword123');

            await expect(page.getByText(/passwords do not match/i)).toBeVisible();
        });

        test('should register successfully with valid data', async ({ page }) => {
            const timestamp = Date.now();
            const email = `test${timestamp}@example.com`;

            await page.getByLabel(/display name/i).fill('Test User');
            await page.getByLabel(/email address/i).fill(email);
            await page.getByLabel(/password/i).first().fill('Password123');
            await page.getByLabel(/confirm password/i).fill('Password123');
            await page.getByRole('button', { name: /create account/i }).click();

            // Should redirect to terminal after successful registration
            await expect(page).toHaveURL('/terminal', { timeout: 10000 });
        });

        test('should show error for duplicate email', async ({ page }) => {
            // First, register a user
            await page.getByLabel(/display name/i).fill('Test User');
            await page.getByLabel(/email address/i).fill('duplicate@example.com');
            await page.getByLabel(/password/i).first().fill('Password123');
            await page.getByLabel(/confirm password/i).fill('Password123');
            await page.getByRole('button', { name: /create account/i }).click();

            // Wait for registration to complete
            await expect(page).toHaveURL('/terminal', { timeout: 10000 });

            // Navigate back to register and try same email
            await page.goto('/register');
            await page.getByLabel(/display name/i).fill('Test User 2');
            await page.getByLabel(/email address/i).fill('duplicate@example.com');
            await page.getByLabel(/password/i).first().fill('Password123');
            await page.getByLabel(/confirm password/i).fill('Password123');
            await page.getByRole('button', { name: /create account/i }).click();

            // Should show error message
            await expect(page.getByText(/email already exists/i)).toBeVisible();
        });

        test('should show error for invalid email format', async ({ page }) => {
            await page.getByLabel(/email address/i).fill('notanemail');
            await page.getByLabel(/password/i).first().fill('Password123');
            await page.getByLabel(/confirm password/i).fill('Password123');
            await page.getByRole('button', { name: /create account/i }).click();

            // Should show error message
            await expect(page.getByText(/invalid email/i)).toBeVisible();
        });

        test('should show error for weak password', async ({ page }) => {
            await page.getByLabel(/email address/i).fill('test@example.com');
            await page.getByLabel(/password/i).first().fill('weak');
            await page.getByLabel(/confirm password/i).fill('weak');
            await page.getByRole('button', { name: /create account/i }).click();

            // Should show error message about password requirements
            await expect(page.getByText(/8 characters/i)).toBeVisible();
        });
    });

    test.describe('Protected Routes', () => {
        test('should redirect to login when accessing protected route without auth', async ({ page }) => {
            await page.goto('/terminal');
            await expect(page).toHaveURL('/login');
        });

        test('should redirect to login when accessing trade detail without auth', async ({ page }) => {
            await page.goto('/trade/123');
            await expect(page).toHaveURL('/login');
        });

        test('should redirect to login when accessing vault without auth', async ({ page }) => {
            await page.goto('/vault');
            await expect(page).toHaveURL('/login');
        });

        test('should redirect to terminal when accessing login while authenticated', async ({ page }) => {
            // First login
            await page.goto('/login');
            await page.getByLabel(/email address/i).fill('trader@example.com');
            await page.getByLabel(/password/i).fill('password123');
            await page.getByRole('button', { name: /sign in/i }).click();
            await expect(page).toHaveURL('/terminal', { timeout: 10000 });

            // Try to access login page again
            await page.goto('/login');
            await expect(page).toHaveURL('/terminal');
        });

        test('should redirect to terminal when accessing register while authenticated', async ({ page }) => {
            // First login
            await page.goto('/login');
            await page.getByLabel(/email address/i).fill('trader@example.com');
            await page.getByLabel(/password/i).fill('password123');
            await page.getByRole('button', { name: /sign in/i }).click();
            await expect(page).toHaveURL('/terminal', { timeout: 10000 });

            // Try to access register page again
            await page.goto('/register');
            await expect(page).toHaveURL('/terminal');
        });
    });

    test.describe('Session Persistence', () => {
        test('should stay logged in after page refresh', async ({ page }) => {
            // Login
            await page.goto('/login');
            await page.getByLabel(/email address/i).fill('trader@example.com');
            await page.getByLabel(/password/i).fill('password123');
            await page.getByRole('button', { name: /sign in/i }).click();
            await expect(page).toHaveURL('/terminal', { timeout: 10000 });

            // Refresh page
            await page.reload();

            // Should still be on terminal page
            await expect(page).toHaveURL('/terminal');
        });

        test('should redirect to login after logout', async ({ page }) => {
            // Login first
            await page.goto('/login');
            await page.getByLabel(/email address/i).fill('trader@example.com');
            await page.getByLabel(/password/i).fill('password123');
            await page.getByRole('button', { name: /sign in/i }).click();
            await expect(page).toHaveURL('/terminal', { timeout: 10000 });

            // Perform logout (assuming there's a logout button in the UI)
            // If logout is not implemented in UI yet, we can clear localStorage
            await page.evaluate(() => {
                localStorage.removeItem('krimson_auth_user');
            });

            // Try to access protected route
            await page.goto('/terminal');
            await expect(page).toHaveURL('/login');
        });
    });
});
