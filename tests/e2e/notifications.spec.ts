import { test, expect } from "@playwright/test";

const PLAYER = { email: "qa.player@example.com", password: "DevPass123!" };

// Verifica que /notificaciones (migrada a modules/notifications/repository)
// funciona de punta a punta con un jugador autenticado.
test("jugador ve su página de notificaciones", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(PLAYER.email);
  await page.locator('input[name="password"]').fill(PLAYER.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });

  await page.goto("/notificaciones");
  await expect(page).toHaveURL(/\/notificaciones/);
  await expect(
    page.getByRole("heading", { name: "Notificaciones" })
  ).toBeVisible();
});
