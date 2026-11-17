import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const app = new URL("../apps/ibge/", import.meta.url);
const output = new URL("../build/lib/apps/", import.meta.url);
const [template, css, bundle] = await Promise.all([
  readFile(new URL("index.html", app), "utf8"),
  readFile(new URL("style.css", app), "utf8"),
  build({
    entryPoints: [fileURLToPath(new URL("main.ts", app))],
    platform: "browser",
    format: "iife",
    bundle: true,
    minify: true,
    write: false,
    target: "es2022",
  }),
]);

const script = bundle.outputFiles[0].text;
if (!template.includes("<!-- app-style -->") || !template.includes("<!-- app-script -->")
  || /<\/script/i.test(script) || /<\/style/i.test(css)) {
  throw new Error("The IBGE app template and bundle must support inline assets");
}
const html = template
  .replace("<!-- app-style -->", () => `<style>${css}</style>`)
  .replace("<!-- app-script -->", () => `<script>${script}</script>`);
await mkdir(output, { recursive: true });
await writeFile(new URL("ibge.html", output), html);
