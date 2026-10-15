#!/usr/bin/env node
/**
 * Nitro rewrites PGLite's `new URL("./pglite.data", import.meta.url)` to the
 * server function's `_libs` folder, but it does not emit the data or wasm
 * files. Without them the first list signup throws ENOENT and the preview
 * process dies on the unhandled PGLite bootstrap rejection.
 */
import { access, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules/@electric-sql/pglite/dist");
const destDir = join(root, ".vercel/output/functions/__server.func/_libs");
const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];

try {
  await access(destDir);
} catch {
  console.log("[pglite] no server function bundle — skipping asset copy");
  process.exit(0);
}

for (const name of files) {
  await copyFile(join(srcDir, name), join(destDir, name));
  console.log(`[pglite] copied ${name}`);
}
