import { test, expect } from '@playwright/test';

test.describe('Workspace', () => {
  test('dashboard shows workspace list', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('alice@example.com');
    await page.getByPlaceholder('Enter your password').fill('Alice@12345');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText(/Test Workspace/i)).toBeVisible({ timeout: 5000 });
  });

  test('navigate to workspace and see project list', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('alice@example.com');
    await page.getByPlaceholder('Enter your password').fill('Alice@12345');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.locator('a[href*="/workspaces/"]').first().click();
    await expect(page).toHaveURL(/\/workspaces\//, { timeout: 10000 });
    await expect(page.locator('a[href*="/projects/"]').first()).toBeVisible({ timeout: 5000 });
  });
});
