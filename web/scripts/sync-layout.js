#!/usr/bin/env node
/**
 * Header/footer partialak HTML orri guztietan sinkronizatzen ditu.
 *
 * Erabilera:
 *   node scripts/sync-layout.js
 *   node scripts/sync-layout.js --check
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const headerTemplate = fs
  .readFileSync(path.join(root, "partials", "header.html"), "utf8")
  .trimEnd();
const footerTemplate = fs
  .readFileSync(path.join(root, "partials", "footer.html"), "utf8")
  .trimEnd();

const check = process.argv.includes("--check");

const ACTIVE_BY_FILE = {
  "index.html": "HOME",
  "Kargaguneak.html": "STATIONS",
  "puesto-Carga.html": "STATIONS",
  "Erreserbak.html": "RESERVATIONS",
  "Erabiltzailea.html": "ACCOUNT",
};

const NAV_KEYS = ["HOME", "STATIONS", "RESERVATIONS", "ACCOUNT"];

function renderHeader(active) {
  let output = headerTemplate;
  for (const key of NAV_KEYS) {
    const isActive = key === active;
    output = output.replaceAll(`{{${key}_ACTIVE}}`, isActive ? " active" : "");
    output = output.replaceAll(`{{${key}_ARIA}}`, isActive ? ' aria-current="page"' : "");
  }
  return output;
}

function replaceBlock(html, name, block) {
  const pattern = new RegExp(`(<!-- PB-${name}:START -->)[\\s\\S]*?(<!-- PB-${name}:END -->)`);
  if (!pattern.test(html)) return html;
  return html.replace(pattern, (_match, start, end) => `${start}\n${block}\n  ${end}`);
}

let failures = 0;
let updatedFiles = 0;

for (const file of fs.readdirSync(root)) {
  if (!file.endsWith(".html")) continue;

  const filePath = path.join(root, file);
  let html = fs.readFileSync(filePath, "utf8");

  if (!html.includes("<!-- PB-HEADER:START -->")) continue;

  const active = ACTIVE_BY_FILE[file] ?? null;
  let updated = replaceBlock(html, "HEADER", renderHeader(active));
  updated = replaceBlock(updated, "FOOTER", footerTemplate);

  if (updated === html) continue;

  if (check) {
    console.error(`Layout desinkronizatuta: ${file}`);
    failures++;
  } else {
    fs.writeFileSync(filePath, updated, "utf8");
    console.log(`Layout eguneratuta: ${file}`);
    updatedFiles++;
  }
}

if (check) {
  if (failures > 0) process.exit(1);
  console.log("Layout sinkronizatuta dago.");
} else {
  console.log(`${updatedFiles} fitxategi eguneratu dira.`);
}
