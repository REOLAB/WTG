import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "www");

const files = [
  "index.html",
  "config.js",
  "config.local.example.js",
  "styles.css",
  "app.js",
  "manifest.json",
  "sw.js",
  "capacitor.config.json",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of files) {
  await cp(join(root, file), join(output, file), { recursive: true });
}

await cp(join(root, "assets"), join(output, "assets"), { recursive: true });

console.log("Static app built to www");
