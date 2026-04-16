/**
 * E2E: Smoke test — full happy path
 * Story 7.1 acceptance criterion.
 *
 * Flow: Login → Dashboard → Submit ticket → Navigate to Assets → Logout
 *
 * This is the CI gate test. Must complete in < 60s (headless, no slowMo).
 */

import { test, expect } from "@playwright/test";
import { ADMIN, loginAs, logout } from "./fixtures";

test("smoke — full happy path", async ({ page }) => {
  test.setTimeout(120_000);

  // 1. Login
  await loginAs(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/dashboard/);

  // 2. Dashboard sidebar is visible
  await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();

  // 3. Navigate to Tickets
  await page.getByRole("link", { name: "Tickets" }).first().click();
  await expect(page).toHaveURL(/\/tickets/);

  // 4. Open the ticket submission dialog
  const newTicketBtn = page.getByRole("button", { name: "New Ticket" });
  await expect(newTicketBtn).toBeVisible({ timeout: 10_000 });
  await newTicketBtn.click();

  // 5. Fill the ticket form
  await page.getByPlaceholder("Brief description of the issue").fill("Smoke test ticket — automated");
  await page.getByPlaceholder("Provide details about the issue — steps to reproduce, impact, etc.").fill("Created by the E2E smoke test.");

  // 6. Submit the ticket
  await page.getByRole("button", { name: "Submit Ticket" }).click();

  // 7. Sheet shows success state then close it
  await expect(page.getByText("Ticket submitted!")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Close" }).first().click();

  // 8. Navigate to Assets
  await page.getByRole("link", { name: "Assets" }).first().click();
  await expect(page).toHaveURL(/\/assets/);
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible({ timeout: 10_000 });

  // 9. Logout
  await logout(page);
  await expect(page).toHaveURL(/\/login/);
});
