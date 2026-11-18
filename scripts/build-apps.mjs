import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const output = new URL("../build/lib/apps/", import.meta.url);
const shared = new URL("../apps/querido-diario/", import.meta.url);
const [searchForm, searchCss] = await Promise.all([
  readFile(new URL("search.html", shared), "utf8"),
  readFile(new URL("search.css", shared), "utf8"),
]);
await mkdir(output, { recursive: true });

async function buildApp(name, includeGazette = false) {
  const app = new URL(`../apps/${name}/`, import.meta.url);
  const [template, ownCss, bundle] = await Promise.all([
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
  const css = includeGazette ? ownCss + "\n" + searchCss : ownCss;
  const markers = ["<!-- app-style -->", "<!-- app-script -->"];
  if (includeGazette) markers.push("<!-- gazette-search -->");
  if (markers.some((marker) => !template.includes(marker))
    || /<\/script/i.test(script) || /<\/style/i.test(css)) {
    throw new Error(`The ${name} app template and bundle must support inline assets`);
  }
  const html = template
    .replace("<!-- gazette-search -->", () => searchForm)
    .replace("<!-- app-style -->", () => `<style>${css}</style>`)
    .replace("<!-- app-script -->", () => `<script>${script}</script>`);
  await writeFile(new URL(`${name}.html`, output), html);
}
await Promise.all([buildApp("ibge", true), buildApp("querido-diario", true), buildApp("bacen"), buildApp("pncp"), buildApp("cnpj")]);
