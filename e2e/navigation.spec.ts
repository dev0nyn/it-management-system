/**
 * E2E: Dashboard navigation — RBAC nav items and protected routes (Issue #169)
 *
 * Verifies the sidebar shows/hides items by role and protected routes
 * redirect unauthenticated users.
 */

import { test, expect } from "@playwright/test";
import { ADMIN, loginAs, logout } from "./fixtures";

test.describe("Navigation — admin role", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("admin sees all nav items", async ({ page }) => {
    // Main nav
    await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Tickets/i })).toBeVisible();
    // Management nav (admin-only or admin+it_staff)
    await expect(page.getByRole("link", { name: /Users/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Assets/i })).toBeVisible();
    // System nav
    await expect(page.getByRole("link", { name: /Reports/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Monitoring/i })).toBeVisible();
  });

  test("clicking Dashboard navigates to /dashboard", async ({ page }) => {
    await page.getByRole("link", { name: /Dashboard/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("clicking Tickets navigates to /tickets", async ({ page }) => {
    await page.getByRole("link", { name: /Tickets/i }).first().click();
    await expect(page).toHaveURL(/\/tickets/);
  });

  test("clicking Users navigates to /users", async ({ page }) => {
    await page.getByRole("link", { name: /Users/i }).first().click();
    await expect(page).toHaveURL(/\/users/);
  });

  test("clicking Assets navigates to /assets", async ({ page }) => {
    await page.getByRole("link", { name: /Assets/i }).first().click();
    await expect(page).toHaveURL(/\/assets/);
  });
});

test.describe("Protected routes — unauthenticated", () => {
  test("GET /dashboard → redirect to /login", async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /users → redirect to /login", async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto("/users");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /assets → redirect to /login", async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto("/assets");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
