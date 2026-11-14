#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const path = process.argv[2] ?? '/digest/2026-10-28';
const out = process.argv[3];

async function main() {
  const res = await createApp(loadConfig()).request(path);
  const html = await res.text();
  if (res.status !== 200) {
    console.error(`HTTP ${res.status}`);
    process.exit(1);
  }
  if (!out) {
    process.stdout.write(html);
    return;
  }
  writeFileSync(out, html);
  console.error(`wrote ${out} (${html.length} bytes)`);
}

main();