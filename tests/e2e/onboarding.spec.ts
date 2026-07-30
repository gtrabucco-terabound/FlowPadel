import { test, expect } from "@playwright/test";

// qa.adminb administra "Club Demo B", que en el seed queda SIN canchas, sin
// pagos y sin torneos → el checklist de puesta en marcha debe mostrarse.
const ADMIN_B = { email: "qa.adminb@example.com", password: "DevPass123!" };

test("club nuevo ve el checklist de puesta en marcha", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(ADMIN_B.email);
  await page.locator('input[name="password"]').fill(ADMIN_B.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  await expect(
    page.getByRole("heading", { name: "Puesta en marcha" })
  ).toBeVisible();
  await expect(page.getByText("Cargá tus canchas")).toBeVisible();
  await expect(page.getByText("Creá tu primer torneo")).toBeVisible();
});
