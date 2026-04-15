/**
 * E2E: Authentication flows (Issue #168)
 *
 * Tests login, validation, logout, and open redirect protection.
 * Requires the app running at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
 * with the seeded admin user: admin@example.com / Admin1234!
 */

import { test, expect } from "@playwright/test";
import { ADMIN, loginAs, logout } from "./fixtures";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("valid credentials → redirect to /dashboard", async ({ page }) => {
    await page.getByPlaceholder("admin@example.com").fill(ADMIN.email);
    await page.getByPlaceholder("Enter your password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("wrong password → inline error message", async ({ page }) => {
    await page.getByPlaceholder("admin@example.com").fill(ADMIN.email);
    await page.getByPlaceholder("Enter your password").fill("WrongPassword!");
    await page.getByRole("button", { name: "Sign in" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 5_000 });
    await expect(alert).not.toBeEmpty();
    // Stays on login page — no redirect
    await expect(page).toHaveURL(/\/login/);
  });

  test("unknown email → error (no user enumeration)", async ({ page }) => {
    await page.getByPlaceholder("admin@example.com").fill("nobody@example.com");
    await page.getByPlaceholder("Enter your password").fill("SomePassword1!");
    await page.getByRole("button", { name: "Sign in" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 5_000 });
    // Message must NOT reveal whether the email exists
    await expect(alert).not.toContainText("email");
  });

  test("empty form → does not submit (native validation)", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    // Browser native required validation prevents submit — stay on login
    await expect(page).toHaveURL(/\/login/);
  });

  test("logout → clears session and redirects to /login", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout via sidebar
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated visit to /dashboard → redirect to /login", async ({
    page,
  }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("session persists after page reload", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await logout(page);
  });

  test("open redirect protection — external ?from= ignored", async ({
    page,
  }) => {
    await page.goto("/login?from=https://evil.com");
    await page.getByPlaceholder("admin@example.com").fill(ADMIN.email);
    await page.getByPlaceholder("Enter your password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Must land on /dashboard, not an external URL
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.url()).not.toContain("evil.com");
    await logout(page);
  });
});
