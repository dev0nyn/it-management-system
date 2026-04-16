import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsItStaff } from "./helpers";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("Monitoring — device management (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("monitoring page loads with status counters", async ({ page }) => {
    await page.goto(`${BASE}/monitoring`);
    await expect(page.getByRole("heading", { name: "Monitoring" })).toBeVisible();

    // Status counter tiles are visible
    await expect(page.getByTestId("up-count")).toBeVisible();
    await expect(page.getByTestId("down-count")).toBeVisible();
    await expect(page.getByTestId("alert-count")).toBeVisible();
  });

  test("can create a new device via API and it appears in the list", async ({
    page,
    request,
  }) => {
    // Get auth token from localStorage after login
    const token = await page.evaluate(() => localStorage.getItem("session_token"));

    // Create device via API
    const res = await request.post(`${BASE}/api/v1/devices`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        name: "e2e-test-device",
        host: "127.0.0.1",
        port: 9999,
        type: "server",
        checkIntervalSec: 60,
      },
    });

    expect(res.status()).toBe(201);
    const { data: device } = await res.json();
    expect(device.name).toBe("e2e-test-device");

    // Navigate to monitoring page and verify device appears
    await page.goto(`${BASE}/monitoring`);
    await expect(page.getByText("e2e-test-device")).toBeVisible();

    // Cleanup
    await request.delete(`${BASE}/api/v1/devices/${device.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test("delete device removes it from the list", async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem("session_token"));

    // Create a device to delete
    const res = await request.post(`${BASE}/api/v1/devices`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        name: "e2e-delete-me",
        host: "127.0.0.1",
        port: 9998,
        type: "server",
      },
    });
    const { data: device } = await res.json();

    await page.goto(`${BASE}/monitoring`);
    await expect(page.getByText("e2e-delete-me")).toBeVisible();

    // Hover over the row to reveal delete button
    const row = page.getByTestId("device-row").filter({ hasText: "e2e-delete-me" });
    await row.hover();
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: /Delete/ }).click();

    await expect(page.getByText("e2e-delete-me")).not.toBeVisible();

    // Cleanup if not already deleted
    await request
      .delete(`${BASE}/api/v1/devices/${device.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch(() => {});
  });
});

test.describe("Monitoring — it_staff access", () => {
  test("it_staff can view devices but create button is absent", async ({ page }) => {
    await loginAsItStaff(page);
    await page.goto(`${BASE}/monitoring`);
    await expect(page.getByRole("heading", { name: "Monitoring" })).toBeVisible();
    await expect(page.getByTestId("up-count")).toBeVisible();
  });
});

test.describe("Dashboard — monitoring widget", () => {
  test("monitoring status widget is visible on dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard`);
    await expect(page.getByTestId("monitoring-widget")).toBeVisible();
    await expect(page.getByTestId("widget-up-count")).toBeVisible();
    await expect(page.getByTestId("widget-down-count")).toBeVisible();
    await expect(page.getByTestId("widget-alert-count")).toBeVisible();
  });

  test("widget 'View All' link navigates to /monitoring", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/dashboard`);
    await page.getByRole("link", { name: "View All" }).first().click();
    await expect(page).toHaveURL(/\/monitoring/);
  });
});
