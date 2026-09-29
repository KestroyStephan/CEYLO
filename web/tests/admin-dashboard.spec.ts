import { test, expect } from '@playwright/test';

test.describe('Admin Portal Navigation and Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    // Assuming the app has a bypass or we login first
    await page.goto('http://localhost:5173/login');
    await page.getByLabel(/Email/i).fill('admin@ceylo.com');
    await page.getByLabel(/Password/i).fill('admin123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL(/.*dashboard/);
  });

  test('should render sidebar navigation correctly', async ({ page }) => {
    // Check if key navigation links are present in the sidebar
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible();
    
    const expectedLinks = ['Dashboard', 'Users', 'Vendors', 'Destinations', 'Cultural Events', 'SOS Alerts'];
    for (const link of expectedLinks) {
      await expect(sidebar.getByText(link, { exact: true })).toBeVisible();
    }
  });

  test('should navigate to Users page and display data grid', async ({ page }) => {
    // Click on the Users link in the sidebar
    await page.locator('nav').getByText('Users', { exact: true }).click();
    
    // Verify the URL changed
    await expect(page).toHaveURL(/.*users/i);
    
    // Verify page header
    await expect(page.getByRole('heading', { name: /Users Management/i })).toBeVisible();
    
    // Verify the data grid (assuming MUI DataGrid is used based on package.json)
    await expect(page.locator('.MuiDataGrid-root')).toBeVisible();
  });

  test('should navigate to SOS Alerts page successfully', async ({ page }) => {
    await page.locator('nav').getByText('SOS Alerts', { exact: true }).click();
    
    await expect(page).toHaveURL(/.*sos-alerts/i);
    await expect(page.getByRole('heading', { name: /SOS Emergency Monitor/i })).toBeVisible();
  });

});
