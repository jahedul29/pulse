import { getVersion, setWorkerUrl } from "maplibre-gl";

const WORKER_PATH = "/vendor/maplibre-gl-worker.mjs";

let workerConfigured = false;

export function configureMaplibreWorker() {
  if (workerConfigured) return;
  setWorkerUrl(`${WORKER_PATH}?v=${getVersion()}`);
  workerConfigured = true;
}
