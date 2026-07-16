import { test, expect } from "@playwright/test";

const PLAYER = { email: "qa.player@example.com", password: "DevPass123!" };

// Verifica /perfil (migrada a modules/players/repository): ejercita
// ensurePlayerForProfile (crea la ficha si falta), listClubsForSelect y
// listPlayerStandings contra la BD real.
test("perfil del jugador renderiza datos y seguimiento", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(PLAYER.email);
  await page.locator('input[name="password"]').fill(PLAYER.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });

  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Datos de jugador" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mi seguimiento" })
  ).toBeVisible();
});
