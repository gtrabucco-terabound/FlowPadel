import { test, expect } from "@playwright/test";

// Verifica que /ranking (migrada a modules/ranking/repository) renderiza sin
// error contra la BD real, incluida la RPC club_ranking. En DEV el ranking
// puede estar vacío; alcanza con que la página cargue su encabezado y tabs.
test("página de ranking renderiza (jugadores + clubes)", async ({ page }) => {
  await page.goto("/ranking");
  await expect(page.getByRole("heading", { name: "Ranking" })).toBeVisible();
  // Los tabs de la vista de ranking.
  await expect(page.getByText("Jugadores", { exact: true })).toBeVisible();
  await expect(page.getByText("Clubes", { exact: true })).toBeVisible();
});
