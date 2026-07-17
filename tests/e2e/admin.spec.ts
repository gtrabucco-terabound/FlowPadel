import { test, expect } from "@playwright/test";

// Admin del Club Demo DEV (ver supabase/seed/dev_users.sql).
const ADMIN = { email: "qa.admin@example.com", password: "DevPass123!" };

test("admin ingresa al panel y ve la agenda del club", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.locator('form button[type="submit"]').click();

  // El miembro de club es redirigido al panel.
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  // La agenda carga y muestra las canchas del club demo.
  await page.goto("/admin/agenda");
  await expect(page).toHaveURL(/\/admin\/agenda/);
  await expect(page.getByText("Cancha 1").first()).toBeVisible();

  // Turnos fijos carga (ejercita modules/reservations/fixed-repository).
  await page.goto("/admin/turnos-fijos");
  await expect(page).toHaveURL(/\/admin\/turnos-fijos/);
  await expect(
    page.getByRole("heading", { name: "Turnos fijos", exact: true })
  ).toBeVisible();
});
