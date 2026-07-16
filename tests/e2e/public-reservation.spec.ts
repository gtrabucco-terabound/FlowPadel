import { test, expect } from "@playwright/test";

// Club sembrado en DEV con pay-at-club activado, así la reserva confirma
// directo sin pasar por Mercado Pago (edge function no desplegada en DEV).
test("reserva pública de cancha (pay-at-club) de punta a punta", async ({
  page,
}) => {
  await page.goto("/reservar");
  await expect(page.getByText("Club Demo DEV")).toBeVisible();

  await page.goto("/reservar/club-demo-dev");
  await expect(page.getByRole("heading", { name: "Club Demo DEV" })).toBeVisible();

  // Elegir el primer turno libre disponible.
  await page.getByRole("button", { name: /Libre/ }).first().click();

  // Barra de reserva: cargar datos como anónimo y confirmar.
  await page.getByPlaceholder("Tu nombre").fill("QA Tester");
  await page.getByPlaceholder(/teléfono/i).fill("1122334455");
  await page.getByRole("button", { name: "Reservar", exact: true }).click();

  // Confirmación pay-at-club.
  await expect(page.getByText(/Turno reservado/i)).toBeVisible({
    timeout: 20_000,
  });
});
