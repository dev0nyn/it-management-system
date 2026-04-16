import { test as base, Page } from "@playwright/test";

export const ADMIN = {
  email: "admin@itms.local",
  password: "Admin1234!",
};

/** Log in via the UI and return once the dashboard is visible. */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("admin@example.com").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

/** Log out via clearing localStorage and navigating to /login */
export async function logout(page: Page) {
  // Clear session storage (the app uses localStorage via api-client)
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login");
}

// Extended test fixture with pre-authenticated admin context
export const test = base.extend<{ adminPage: Page }>({
  adminPage: async ({ page }, use) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await use(page);
    await logout(page);
  },
});

export { expect } from "@playwright/test";
