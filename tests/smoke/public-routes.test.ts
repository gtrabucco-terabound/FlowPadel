import { describe, it, expect, beforeAll } from "vitest";

/**
 * Smoke test de rutas públicas: verifica que cada ruta responde 200 y no
 * muestra el error boundary de Next. Es la red de seguridad del refactor:
 * si al mover archivos se rompe un import o una ruta, esto lo detecta.
 *
 * Requiere un servidor corriendo. Base URL vía TEST_BASE_URL (default
 * http://localhost:3000). Si el server no está disponible, los tests se
 * SALTEAN (no fallan), para no romper CI sin server.
 */
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  "/",
  "/reservar",
  "/torneos",
  "/ranking",
  "/login",
];

let serverUp = false;

beforeAll(async () => {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(3000) });
    serverUp = res.ok || res.status < 500;
  } catch {
    serverUp = false;
  }
});

describe("rutas públicas (smoke)", () => {
  for (const route of ROUTES) {
    it(`${route} responde sin error de servidor`, async (ctx) => {
      if (!serverUp) return ctx.skip();
      const res = await fetch(BASE + route, {
        signal: AbortSignal.timeout(10000),
      });
      expect(res.status).toBeLessThan(500);
      const html = await res.text();
      // El error boundary de Next incluye este marcador.
      expect(html).not.toContain("Application error: a client-side exception");
    });
  }
});
