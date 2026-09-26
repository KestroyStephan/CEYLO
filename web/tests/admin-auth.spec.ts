import { test, expect } from '@playwright/test';

test.describe('Admin Portal Authentication', () => {
  
  test.beforeEach(async ({ page }) => {
    // Go to the login page before each test
    await page.goto('http://localhost:5173/login');
  });

  test('should display login form correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/CEYLO/i);
    await expect(page.getByRole('heading', { name: /Login/i })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.getByLabel(/Email/i).fill('invalid@example.com');
    await page.getByLabel(/Password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Assuming the app shows an error message like "Invalid credentials" or similar
    const errorMessage = page.locator('text=invalid').first();
    await expect(errorMessage).toBeVisible();
  });

  test('should login successfully with valid admin credentials', async ({ page }) => {
    // Note: These should be test credentials configured in the environment
    await page.getByLabel(/Email/i).fill('admin@ceylo.com');
    await page.getByLabel(/Password/i).fill('admin123');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Verify successful login by checking for a dashboard element
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  });
});
