import { Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * Log in as admin via the login form and store the access token in localStorage.
 * Depends on the seeded admin user: admin@example.com / Admin1234!
 */
export async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', "admin@example.com");
  await page.fill('[name="password"], input[type="password"]', "Admin1234!");
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10_000 });
}

export async function loginAsItStaff(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', "staff@example.com");
  await page.fill('[name="password"], input[type="password"]', "Staff1234!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10_000 });
}

export async function loginAsEndUser(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', "user@example.com");
  await page.fill('[name="password"], input[type="password"]', "User1234!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10_000 });
}
