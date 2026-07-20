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

  // El sidebar agrupado muestra secciones y el ítem "Inicio".
  await expect(page.getByText("Operación", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Inicio", exact: true })
  ).toBeVisible();

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

  // Ajustes carga (ejercita modules/payments getClubPaymentSettings).
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\/settings/);
  await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();

  // Miembros carga (ejercita modules/clubs: listClubMembers + operator pending).
  await page.goto("/admin/miembros");
  await expect(page).toHaveURL(/\/admin\/miembros/);
  await expect(
    page.getByRole("heading", { name: "Miembros", exact: true })
  ).toBeVisible();

  // Operar clubes carga (ejercita modules/clubs: listOperableClubs).
  await page.goto("/admin/operar");
  await expect(page).toHaveURL(/\/admin\/operar/);
  await expect(
    page.getByRole("heading", { name: "Operar clubes" })
  ).toBeVisible();

  // Calendario carga (ejercita modules/tournaments: listClubCalendarEvents).
  await page.goto("/admin/calendario");
  await expect(page).toHaveURL(/\/admin\/calendario/);
  await expect(
    page.getByRole("heading", { name: "Calendario" })
  ).toBeVisible();

  // Jugadores carga (modules/players: listPlayersDirectory).
  await page.goto("/admin/players");
  await expect(page).toHaveURL(/\/admin\/players/);
  await expect(
    page.getByRole("heading", { name: "Jugadores" })
  ).toBeVisible();

  // Prospectos carga (modules/clubs + tournaments).
  await page.goto("/admin/prospectos");
  await expect(page).toHaveURL(/\/admin\/prospectos/);
  await expect(
    page.getByRole("heading", { name: "Prospectos" })
  ).toBeVisible();

  // Proyección carga (modules/tournaments: proyección + agregados).
  await page.goto("/admin/proyeccion");
  await expect(page).toHaveURL(/\/admin\/proyeccion/);
  await expect(
    page.getByRole("heading", { name: "Proyección anual" })
  ).toBeVisible();
});
