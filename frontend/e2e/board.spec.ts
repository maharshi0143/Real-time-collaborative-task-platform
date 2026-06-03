import { test, expect } from '@playwright/test';

test.describe('Board & Task Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('alice@example.com');
    await page.getByPlaceholder('Enter your password').fill('Alice@12345');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  const navigateToProject = async (page: any) => {
    await page.getByText(/Test Workspace/i).click();
    await expect(page).toHaveURL(/\/workspaces\//, { timeout: 10000 });

    const projectLink = page.locator('a[href*="/projects/"]').first();
    await expect(projectLink).toBeVisible({ timeout: 5000 });
    await projectLink.click();
    await expect(page).toHaveURL(/\/projects\//, { timeout: 10000 });
  };

  const navigateToBoard = async (page: any) => {
    await navigateToProject(page);

    const boardLink = page.locator('a[href*="/boards/"]').first();
    await expect(boardLink).toBeVisible({ timeout: 5000 });
    await boardLink.click();
    await expect(page).toHaveURL(/\/boards\//, { timeout: 10000 });
  };

  test('navigate to board and see task cards', async ({ page }) => {
    await navigateToBoard(page);

    await expect(page.getByText(/Kanban/i)).toBeVisible();
  });

  test('task drawer opens when clicking a task', async ({ page }) => {
    await navigateToBoard(page);

    const taskCard = page.getByTestId('task-title').first();
    await expect(taskCard).toBeVisible({ timeout: 10000 });
    await taskCard.click();

    await expect(page.locator('text=Details')).toBeVisible({ timeout: 5000 });
  });

  test('create a new board', async ({ page }) => {
    await navigateToProject(page);

    await page.getByRole('button', { name: /New Board/i }).click();

    const ts = Date.now();
    const boardName = `E2E Board ${ts}`;
    await page.getByPlaceholder('Sprint 1').fill(boardName);
    await page.getByRole('button', { name: /^Create$/ }).click();

    await expect(page.getByText(boardName)).toBeVisible({ timeout: 5000 });
  });

  test('create a task in a board', async ({ page }) => {
    await navigateToBoard(page);

    await page.locator('.kanban-column button').first().click();

    const ts = Date.now();
    const taskTitle = `E2E Task ${ts}`;
    await page.getByPlaceholder('What needs to be done?').fill(taskTitle);
    await page.getByRole('button', { name: /^Create$/ }).click();

    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
  });

  test('delete a board', async ({ page }) => {
    await navigateToProject(page);

    await page.getByRole('button', { name: /New Board/i }).click();
    const ts = Date.now();
    const boardName = `E2E Delete Board ${ts}`;
    await page.getByPlaceholder('Sprint 1').fill(boardName);
    await page.getByRole('button', { name: /^Create$/ }).click();
    await expect(page.getByText(boardName)).toBeVisible({ timeout: 5000 });

    const boardCard = page.locator('div.group').filter({ hasText: boardName });
    await boardCard.hover();
    await boardCard.getByTitle('Delete board').click();
    await boardCard.getByText('Confirm').click();

    await expect(boardCard).not.toBeVisible({ timeout: 5000 });
  });
});
