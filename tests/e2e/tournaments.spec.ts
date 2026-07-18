import { test, expect } from "@playwright/test";

const ADMIN = { email: "qa.admin@example.com", password: "DevPass123!" };

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });
}

// Crea un torneo desde el panel y verifica que abre su página de gestión.
// Ejercita createEvent + el listado de eventos + el detalle events/[id] (lectura
// pesada que se va a migrar al módulo tournaments).
test("admin crea un torneo y abre su gestión", async ({ page }) => {
  await loginAdmin(page);

  await page.goto("/admin/events");
  await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible();

  const name = `E2E Torneo ${Date.now().toString().slice(-6)}`;
  await page.getByRole("button", { name: "Nuevo evento" }).click();
  await page.locator('input[name="name"]').fill(name);
  await page.getByRole("button", { name: "Crear" }).click();

  // createEvent redirige a /admin/events/<id> (página de gestión).
  await expect(page).toHaveURL(/\/admin\/events\/[0-9a-f-]{36}/, {
    timeout: 20_000,
  });
  await expect(page.getByText(name).first()).toBeVisible();
});

// Lecturas públicas de torneo sobre un evento abierto sembrado en DEV
// (ver supabase/seed/dev_users.sql). Protege event/[slug] y register/[slug].
test("evento público y página de inscripción cargan", async ({ page }) => {
  await page.goto("/event/torneo-qa-abierto");
  await expect(page.getByText("Torneo QA Abierto").first()).toBeVisible();

  await page.goto("/register/torneo-qa-abierto");
  await expect(page).toHaveURL(/\/register\/torneo-qa-abierto/);
  // La página de inscripción renderiza el formulario (campo de nombre J1).
  await expect(page.locator('input[name="player_1_name"]')).toBeVisible();
});

