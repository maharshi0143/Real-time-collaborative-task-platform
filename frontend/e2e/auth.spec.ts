import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login with seed credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    await page.getByPlaceholder('you@example.com').fill('alice@example.com');
    await page.getByPlaceholder('Enter your password').fill('Alice@12345');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText(/Welcome/i)).toBeVisible();
  });

  test('register new user then logout and login', async ({ page }) => {
    const ts = Date.now();
    const email = `e2e${ts}@test.com`;
    const username = `e2e_${ts}`;

    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /Create an account/i })).toBeVisible();

    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('your_username').fill(username);
    await page.getByPlaceholder('Min 8 chars, 1 upper, 1 digit, 1 special').fill('Test1234!');
    await page.getByPlaceholder('Repeat your password').fill('Test1234!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText(/Welcome/i)).toBeVisible();

    await page.getByRole('button', { name: /Logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('show validation errors on login form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page.getByText(/Email is required/i)).toBeVisible();
  });

  test('redirect to login for unauthenticated access', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
