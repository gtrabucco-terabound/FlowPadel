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
  const lessonForm = page.locator("form", { has: page.locator('input[name="lesson_date"]') });
  await lessonForm.locator('select[name="coach_id"]').selectOption({ label: "Profe QA" });
  await lessonForm.locator('select[name="court_id"]').selectOption({ index: 1 });
  await lessonForm.locator('input[name="lesson_date"]').fill("2026-12-15");
  await lessonForm.locator('input[name="customer_name"]').fill("Alumno QA");
  await lessonForm.getByRole("button", { name: "Agendar clase" }).click();

  await expect(page.getByText("Alumno QA").first()).toBeVisible({ timeout: 20_000 });

  // Crear una sesión grupal y sumar un jugador.
  const groupForm = page.locator("form", { has: page.locator('select[name="num_slots"], input[name="num_slots"]') });
  await groupForm.locator('select[name="coach_id"]').selectOption({ label: "Profe QA" });
  await groupForm.locator('input[name="session_date"]').fill("2026-12-17");
  await groupForm.locator('input[name="capacity"]').fill("4");
  await groupForm.getByRole("button", { name: "Crear grupo" }).click();

  // Aparece la tarjeta del grupo con cupo 0/4 → sumo un jugador.
  await expect(page.getByText("0/4").first()).toBeVisible({ timeout: 20_000 });
  const joinForm = page.locator("form", { hasText: "" }).filter({ has: page.locator('input[name="session_id"]') }).first();
  await joinForm.locator('input[name="customer_name"]').fill("Jugador Grupo");
  await joinForm.getByRole("button", { name: "+ Sumar" }).click();
  await expect(page.getByText("Jugador Grupo").first()).toBeVisible({ timeout: 20_000 });
});
