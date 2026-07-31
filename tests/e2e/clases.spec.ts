import { test, expect } from "@playwright/test";

const ADMIN = { email: "qa.admin@example.com", password: "DevPass123!" };

test("gestión de clases: alta de profe y agendar una clase", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  await page.goto("/admin/clases");
  await expect(page.getByRole("heading", { name: "Clases", exact: true })).toBeVisible();

  // Alta de profe.
  await page.locator('input[name="name"]').fill("Profe QA");
  await page.getByRole("button", { name: "Agregar profe" }).click();

  // Agendar una clase (bloquea la cancha en la agenda).
  // selectOption espera a que la opción del profe recién creado exista.
  await page.locator('select[name="coach_id"]').selectOption({ label: "Profe QA" });
  await page.locator('select[name="court_id"]').selectOption({ index: 1 });
  await page.locator('input[name="lesson_date"]').fill("2026-12-15");
  await page.locator('input[name="customer_name"]').fill("Alumno QA");
  await page.getByRole("button", { name: "Agendar clase" }).click();

  await expect(page.getByText("Alumno QA").first()).toBeVisible({ timeout: 20_000 });
});
