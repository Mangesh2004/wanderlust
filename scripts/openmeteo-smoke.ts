/**
 * Verifies Open-Meteo parsing. Run from repo root:
 *   pnpm weather:smoke
 */
import "dotenv/config";
import { runOpenMeteoSmokeTest } from "../lib/ai/tools/weather";

runOpenMeteoSmokeTest()
  .then((r) => {
    console.log("Open-Meteo smoke OK:", JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error("Open-Meteo smoke failed:", e);
    process.exit(1);
  });
