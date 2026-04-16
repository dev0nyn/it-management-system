import { Page } from "@playwright/test";
import { loginAs } from "./fixtures";

/** Delegate to fixtures.loginAs using the seeded credentials. */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin@itms.local", "Admin1234!");
}

export async function loginAsItStaff(page: Page) {
  await loginAs(page, "staff@itms.local", "Staff1234!");
}

export async function loginAsEndUser(page: Page) {
  await loginAs(page, "user@itms.local", "User1234!");
}
