import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const output = path.join(root, "artifacts/hosted-server");
const compilation = spawnSync(
  process.execPath,
  [
    "node_modules/typescript/bin/tsc",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--target",
    "ES2022",
    "--lib",
    "ES2022,DOM",
    "--outDir",
    output,
    "--rootDir",
    ".",
    "--resolveJsonModule",
    "--esModuleInterop",
    "--skipLibCheck",
    "--types",
    "node",
    "api/i02/chat.ts",
    "api/i02/analysis.ts",
  ],
  { cwd: root, stdio: "inherit" },
);
if (compilation.status !== 0) process.exit(compilation.status ?? 1);

// Verify actual Node ESM loading, which Vite/Vitest's resolution can otherwise mask.
process.env.I02_SITE_ORIGIN = "https://hosted-check.example";
process.env.I02_RATE_LIMIT_READY = "disabled";
for (const endpoint of ["chat", "analysis"]) {
  const { default: handler } = await import(
    pathToFileURL(path.join(output, "api/i02", `${endpoint}.js`)).href
  );
  const response = await handler.fetch(
    new Request(`https://hosted-check.example/api/i02/${endpoint}`),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { available: false });
}
console.log("Hosted Node.js ESM endpoints verified; no provider request made.");
