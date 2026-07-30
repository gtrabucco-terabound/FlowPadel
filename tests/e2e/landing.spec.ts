import { test, expect } from "@playwright/test";

// Landing comercial para clubes: carga y el formulario de demo funciona de
// punta a punta (inserta en demo_requests en DEV).
test("landing de clubes: solicita una demo", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Gestioná tu club de pádel/ })
  ).toBeVisible();
  await expect(page.getByText("Programa Fundadores").first()).toBeVisible();

  await page.locator('input[name="club_name"]').fill("Club E2E");
  await page.locator('input[name="contact_name"]').fill("QA Tester");
  await page.locator('input[name="email"]').fill("qa.demo@example.com");
  await page.locator('#demo form button[type="submit"]').click();

  await expect(page.getByText(/Solicitud enviada/i)).toBeVisible({
    timeout: 20_000,
  });
});
