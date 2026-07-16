import { test, expect } from "@playwright/test";

// Usuario sembrado en DEV (ver supabase/seed/dev_users.sql).
const PLAYER = { email: "qa.player@example.com", password: "DevPass123!" };

test("login de jugador y acceso a /perfil", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(PLAYER.email);
  await page.locator('input[name="password"]').fill(PLAYER.password);
  await page.locator('form button[type="submit"]').click();

  // El jugador es redirigido fuera de /login.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });

  // Con sesión, /perfil no redirige a login y muestra el perfil.
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/perfil/);
  await expect(page.getByText(/perfil|seguimiento/i).first()).toBeVisible();
});
