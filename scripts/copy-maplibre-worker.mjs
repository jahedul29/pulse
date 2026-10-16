import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

let workerSource;
try {
  workerSource = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
} catch {
  console.error("copy-maplibre-worker: maplibre-gl/dist/maplibre-gl-worker.mjs was not found. Run npm install, then npm run postinstall.");
  process.exit(1);
}

const targetDirectory = join(projectRoot, "public", "vendor");
if (!existsSync(targetDirectory)) mkdirSync(targetDirectory, { recursive: true });
copyFileSync(workerSource, join(targetDirectory, "maplibre-gl-worker.mjs"));
