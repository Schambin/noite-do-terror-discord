// Teste com vários "aparelhos" ao mesmo tempo contra um Supabase local
// (npx supabase start). Ver tests/e2e/README.md.
import { defineConfig } from "@playwright/test";

const URL = process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const KEY = process.env.VITE_SUPABASE_KEY || "";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5199",
    channel: process.env.PW_CHANNEL || "msedge",
    headless: true,
  },
  webServer: {
    command: "npx vite --port 5199 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:5199",
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: URL, VITE_SUPABASE_KEY: KEY },
  },
});
