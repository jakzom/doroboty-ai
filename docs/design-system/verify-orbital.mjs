import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("./orbital/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("source-manifest.json", root), "utf8"));
for (const [name, expected] of Object.entries(manifest.files)) {
  const actual = createHash("sha256")
    .update(await readFile(new URL(name, root)))
    .digest("hex");
  if (actual !== expected) throw new Error(`Changed Orbital source: ${name}`);
}
// All HTML/CSS runtime references must resolve locally, including nested font URLs.
for (const name of Object.keys(manifest.files).filter((n) => /\.(html|css)$/.test(n))) {
  const file = new URL(name, root);
  const source = await readFile(file, "utf8");
  const references = [
    ...source.matchAll(/(?:src|href)=["']([^"']+)["']|url\(["']?([^\s)'";]+)["']?\)/g),
  ];
  for (const match of references) {
    const ref = match[1] || match[2];
    if (/^(#|https?:|mailto:|data:)/.test(ref)) continue;
    const target = new URL(ref, file);
    target.hash = "";
    target.search = "";
    await access(target).catch(() => {
      throw new Error(`Missing Orbital reference: ${name} -> ${ref}`);
    });
  }
}
for (const name of ["Syne.ttf", "Inter.ttf"]) {
  const runtime = await readFile(new URL(`../../src/app/fonts/${name}`, import.meta.url));
  const source = await readFile(new URL(`pairing-fonts/${name}`, root));
  if (!runtime.equals(source)) throw new Error(`Runtime font differs: ${name}`);
}
console.log(
  `Orbital B.02 source integrity: ${Object.keys(manifest.files).length} files; local references and runtime fonts verified.`,
);
