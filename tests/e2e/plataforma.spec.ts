import { test, expect } from "@playwright/test";

// qa.admin es superadmin en el seed → puede administrar la plataforma.
const SUPER = { email: "qa.admin@example.com", password: "DevPass123!" };

test("superadmin administra planes y Fundadores", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(SUPER.email);
  await page.locator('input[name="password"]').fill(SUPER.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  await page.goto("/admin/plataforma");
  await expect(page).toHaveURL(/\/admin\/plataforma/);
  await expect(
    page.getByRole("heading", { name: "Plataforma" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Programa Fundadores y ROI" })
  ).toBeVisible();
  // Los 3 planes sembrados aparecen en el ABM.
  await expect(page.getByText("Silver", { exact: true })).toBeVisible();
});
