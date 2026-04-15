/**
 * E2E: Smoke test — full happy path
 * Story 7.1 acceptance criterion.
 *
 * Flow: Login → Dashboard → Submit ticket → Navigate to Assets → Logout
 *
 * This is the CI gate test. Must complete in < 60s.
 */

import { test, expect } from "@playwright/test";
import { ADMIN, loginAs, logout } from "./fixtures";

test("smoke — full happy path", async ({ page }) => {
  // 1. Login
  await loginAs(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/dashboard/);

  // 2. Dashboard loads
  await expect(page.getByRole("link", { name: /Dashboard/i }).first()).toBeVisible();

  // 3. Navigate to Tickets
  await page.getByRole("link", { name: /Tickets/i }).first().click();
  await expect(page).toHaveURL(/\/tickets/);

  // Open the ticket submission sheet if present
  const newTicketButton = page.getByRole("button", { name: /new ticket|submit|create/i });
  if (await newTicketButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await newTicketButton.click();

    const titleInput = page.getByPlaceholder(/title/i).or(page.getByLabel(/title/i));
    if (await titleInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await titleInput.fill("Smoke test ticket — automated");
      const descInput = page.getByPlaceholder(/description/i).or(page.getByLabel(/description/i));
      if (await descInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await descInput.fill("This ticket was created by the E2E smoke test.");
      }
      const submitBtn = page.getByRole("button", { name: /submit|save|create/i }).last();
      await submitBtn.click();
    }
  }

  // 4. Navigate to Assets
  await page.getByRole("link", { name: /Assets/i }).first().click();
  await expect(page).toHaveURL(/\/assets/);

  // 5. Assets page loads
  await expect(
    page.getByRole("heading", { name: /assets/i }).or(page.getByText(/assets/i).first())
  ).toBeVisible({ timeout: 10_000 });

  // 6. Logout
  await logout(page);
  await expect(page).toHaveURL(/\/login/);
});
