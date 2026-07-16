import { defineConfig } from "@playwright/test";

/**
 * E2E contra el proyecto Supabase DEV (ixaoldbwjpvwmxddxrra), NUNCA producción.
 * El webServer levanta `next dev` en :3100 con las credenciales DEV inyectadas
 * (la anon key es pública; DEV es un proyecto descartable). Se pueden override
 * por env (E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY) para CI.
 */
const DEV_SUPABASE_URL = "https://ixaoldbwjpvwmxddxrra.supabase.co";
const DEV_SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4YW9sZGJ3anB2d214ZGR4cnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzM1ODEsImV4cCI6MjA5OTcwOTU4MX0.h4-un8rlsysKRxSgp42T1VtNKtcWPfG2WE22FY8U47I";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL ?? DEV_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.E2E_SUPABASE_ANON_KEY ?? DEV_SUPABASE_ANON,
      // Build aislado: no comparte `.next` con un preview corriendo en :3000.
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
