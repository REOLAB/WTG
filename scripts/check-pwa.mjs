import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const requiredShellFiles = ["index.html", "config.js", "styles.css", "app.js", "manifest.json", "sw.js", "assets/icon.svg"];

function fail(message) {
  console.error(`PWA check failed: ${message}`);
  process.exitCode = 1;
}

const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const sw = await readFile(join(root, "sw.js"), "utf8");
const index = await readFile(join(root, "index.html"), "utf8");

if (!manifest.name || !manifest.short_name) fail("manifest name and short_name are required");
if (manifest.display !== "standalone") fail("manifest display should be standalone");
if (!manifest.start_url) fail("manifest start_url is required");
if (!manifest.theme_color || !manifest.background_color) fail("manifest colors are required");
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) fail("manifest should include at least one icon");
if (!index.includes('rel="manifest"')) fail("index.html should link the manifest");
if (!index.includes("serviceWorker")) fail("index.html should register the service worker");
if (!index.includes("config.local.js")) fail("index.html should support local API key overrides");

for (const file of requiredShellFiles) {
  const escaped = file.replaceAll("\\", "/");
  if (!sw.includes(`"./${escaped}"`)) {
    fail(`service worker APP_SHELL is missing ./${escaped}`);
  }
}

if (!sw.includes("skipWaiting")) fail("service worker should activate updates promptly");
if (!sw.includes("clients.claim")) fail("service worker should claim clients after activation");
if (!sw.includes('event.request.mode === "navigate"')) fail("service worker should handle navigation offline fallback");

if (!process.exitCode) {
  console.log("PWA check passed");
}
