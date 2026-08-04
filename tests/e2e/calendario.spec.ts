import { test, expect } from "@playwright/test";

const ADMIN = { email: "qa.admin@example.com", password: "DevPass123!" };

test("calendario unificado carga (torneos + clases + grupos)", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  await page.goto("/admin/calendario");
  await expect(page.getByRole("heading", { name: "Calendario" })).toBeVisible();
  await expect(
    page.getByText("Torneos, clases y entrenamientos del club", { exact: false })
  ).toBeVisible();
});
