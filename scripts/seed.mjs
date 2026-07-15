// PicSearch Pro — dataset seeder (FR-15). Ingests every image in
// test-dataset/images/ through the REAL pipeline (POST /api/v1/images) so any
// clone can reproduce the benchmark. Idempotent: each image is stored at
// seed/<slug>.<ext>, so re-running updates rather than duplicates.
//
// Usage:
//   API_URL=http://localhost:8787 SEED_KEY=... node scripts/seed.mjs
// (pnpm seed reads API_URL/SEED_KEY from the environment; see docs/09-setup-guide.md)

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(HERE, '..', 'test-dataset', 'images');
const API_URL = process.env.API_URL ?? 'http://localhost:8787';
const SEED_KEY = process.env.SEED_KEY;

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function main() {
  if (!SEED_KEY) {
    console.error(
      'SEED_KEY is required. Set it to the value configured on the Worker (wrangler secret put SEED_KEY).',
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

  console.log(`Seeding ${files.length} image(s) → ${API_URL}\n`);
  let ok = 0;
  for (const file of files) {
    const slug = file.slice(0, -extname(file).length);
    const mime = MIME[extname(file).toLowerCase()];
    const bytes = await readFile(join(IMAGES_DIR, file));

    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mime }), file);
    form.append('slug', slug);

    try {
      const res = await fetch(`${API_URL}/api/v1/images`, {
        method: 'POST',
        headers: { 'x-seed-key': SEED_KEY },
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
