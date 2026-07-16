// PicSearch Pro — dataset seeder (FR-15). Ingests every image in
// test-dataset/images/ through the REAL pipeline (POST /api/v1/images) so any
// clone can reproduce the benchmark. Idempotent: each image is stored at
// seed/<slug>.<ext>, so re-running updates rather than duplicates.
//
// Usage:
//   pnpm seed
// Configuration comes from the environment (API_URL, SEED_KEY) with a fallback
// to apps/api/.dev.vars, so the same secret configured for the Worker also
// authorizes local seeding (see docs/09-setup-guide.md).

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(HERE, '..', 'test-dataset', 'images');
const DEV_VARS_PATH = join(HERE, '..', 'apps', 'api', '.dev.vars');
const DEFAULT_API_URL = 'http://localhost:8787';

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** Parse a dotenv-style file (`KEY=value` / `KEY="value"`, `#` comments). */
async function readDevVars(path) {
  let content;
  try {
    content = await readFile(path, 'utf8');
  } catch {
    return {};
  }
  const vars = {};
  for (const line of content.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    vars[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return vars;
}

async function resolveConfig() {
  const devVars = await readDevVars(DEV_VARS_PATH);
  return {
    apiUrl: process.env.API_URL ?? devVars.API_URL ?? DEFAULT_API_URL,
    seedKey: process.env.SEED_KEY ?? devVars.SEED_KEY,
  };
}

async function main() {
  const { apiUrl, seedKey } = await resolveConfig();
  if (!seedKey) {
    console.error(
      'SEED_KEY is required. Set it in apps/api/.dev.vars (used by both the Worker and this script), or export it in the environment.',
    );
    process.exit(1);
  }

  let files;
  try {
    files = (await readdir(IMAGES_DIR)).filter((f) => extname(f).toLowerCase() in MIME);
  } catch {
    console.error(
      `No images found in ${IMAGES_DIR}. Add license-safe images named <slug>.<ext> (see test-dataset/sources.md).`,
    );
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(
      `No images in ${IMAGES_DIR}. See test-dataset/sources.md for the expected slugs.`,
    );
    process.exit(1);
  }

  console.log(`Seeding ${files.length} image(s) → ${apiUrl}\n`);
  let ok = 0;
  for (const file of files) {
    const slug = file.slice(0, -extname(file).length);
    const mime = MIME[extname(file).toLowerCase()];
    const bytes = await readFile(join(IMAGES_DIR, file));

    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mime }), file);
    form.append('slug', slug);

    try {
      const res = await fetch(`${apiUrl}/api/v1/images`, {
        method: 'POST',
        headers: { 'x-seed-key': seedKey },
        body: form,
      });
      if (res.ok) {
        ok += 1;
        console.log(`  ✓ ${slug}`);
      } else {
        const detail = await res.text();
        console.error(`  ✗ ${slug} — ${res.status}: ${detail.slice(0, 200)}`);
      }
    } catch (err) {
      console.error(`  ✗ ${slug} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nDone: ${ok}/${files.length} ingested.`);
  if (ok < files.length) process.exit(1);
}

await main();
