import "@testing-library/jest-dom";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

// So Jest sees env vars from repo root (same as `pnpm weather:smoke`).
loadEnv({ path: resolve(process.cwd(), ".env"), quiet: true });
loadEnv({
  path: resolve(process.cwd(), ".env.local"),
  override: true,
  quiet: true,
});
