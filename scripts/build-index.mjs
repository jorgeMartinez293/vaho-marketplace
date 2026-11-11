#!/usr/bin/env node
// Walks themes/ and modes/ and writes index.json — the catalog vaho fetches.
// Run by the GitHub Action on every push; safe to run locally too (`node scripts/build-index.mjs`).

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
// Public base URL of this repo's Pages site (bundles are linked absolutely so the app can
// download them straight from the index).
const BASE = process.env.PAGES_BASE_URL || "https://jorgeMartinez293.github.io/vaho-marketplace";

// Dates go out WITHOUT fractional seconds: the app decodes them with JSONDecoder's
// .iso8601 strategy, which is ISO8601DateFormatter with .withInternetDateTime only — it
// returns nil for "…:58.049Z", and a nil for the non-optional-decode `updatedAt` throws
// away the whole catalog ("Couldn't reach the store"). Newer Foundation tolerates the
// fraction, older ones (macOS 13-15) do not, so it must never be emitted.
function iso(value) {
  if (!value) return undefined;
  return String(value).replace(/\.\d+(?=(Z|[+-]\d{2}:?\d{2})$)/, "");
}

function entries(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(name => statSync(join(dir, name)).isDirectory() && existsSync(join(dir, name, "manifest.json")))
    .map(name => ({ id: name, meta: JSON.parse(readFileSync(join(dir, name, "manifest.json"), "utf8")) }));
}

// Sources the app can apply (ThemeSource in the app). Anything else a manifest still lists
// — bruma, Finder, third-party app configs from vaho 2.x — is not advertised.
const THEME_SOURCES = ["wallpaper", "neowall", "widgets", "appearance", "dock", "appSettings", "vidrio", "sereno", "sider"];
const FAMILY_APPS = {
  vidrio: "vidrio", sereno: "vidrio", neowall: "neowall", sider: "sider"
};

const themes = entries(join(root, "themes")).map(({ id, meta }) => {
  const declared = new Set((meta.sources || []).map(s => (s === "pokefetch" ? "sereno" : s)));
  const sources = THEME_SOURCES.filter(s => declared.has(s));
  const required = new Set();
  return {
    id,
    name: meta.name,
    author: meta.author,
    description: meta.description || undefined,
    sources,
    previewURL: existsSync(join(root, "themes", id, "preview.jpg")) ? `${BASE}/themes/${id}/preview.jpg` : undefined,
    downloadURL: `${BASE}/themes/${id}/bundle.vahotheme`,
    sizeBytes: meta.sizeBytes,
    sha256: meta.sha256 || undefined,
    revision: meta.revision || 1,
    createdAt: iso(meta.createdAt),
    updatedAt: iso(meta.updatedAt || meta.createdAt),
    widgetApps: meta.widgetApps || undefined,
    tags: meta.tags || undefined,
    requires: sources.flatMap(source => {
      const app = FAMILY_APPS[source];
      if (!app || required.has(app)) return [];
      required.add(app);
      return [{ source, name: app, downloadURL: `https://github.com/jorgeMartinez293/${app}-releases/releases/latest/download/${app}.dmg` }];
    })
  };
}).filter(theme => theme.sources.length > 0)
  .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

const modes = entries(join(root, "modes")).map(({ id, meta }) => ({
  id,
  name: meta.name,
  summary: meta.summary || "",
  description: meta.description || undefined,
  author: meta.author,
  category: meta.category || "other",
  icon: meta.icon || "puzzlepiece.extension.fill",
  kind: "web",
  version: meta.version,
  downloadURL: `${BASE}/modes/${id}/bundle.zip`,
  sizeBytes: meta.sizeBytes,
  permissions: meta.permissions || [],
  screenshots: (meta.screenshots || []).map(s => `${BASE}/modes/${id}/${s}`),
  createdAt: iso(meta.createdAt),
  minVahoVersion: meta.minVahoVersion || undefined,
  tags: meta.tags || undefined
})).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

// Built-in modes can be described here too (copy/screenshots override the app's bundled
// catalog without an app release). Keep them in builtin-modes.json, optional.
let builtin = [];
if (existsSync(join(root, "builtin-modes.json"))) {
  builtin = JSON.parse(readFileSync(join(root, "builtin-modes.json"), "utf8"));
}

const index = {
  version: 1,
  updatedAt: iso(new Date().toISOString()),
  modes: [...builtin, ...modes],
  themes
};
writeFileSync(join(root, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`index.json: ${modes.length} community modes, ${builtin.length} built-in entries, ${themes.length} themes`);
