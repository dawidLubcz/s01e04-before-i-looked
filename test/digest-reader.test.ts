import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const d = readNight('runs', '2026-10-28');
    expect(d).not.toBeNull();
    expect(d!.badLines).toBe(1);
    expect(d!.rows).toHaveLength(5);
    expect(d!.rows.map((r) => r.job).sort()).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    const nullOwner = d!.rows.find((r) => r.job === 'digest/render');
    expect(nullOwner?.owner).toBeNull();
  });

  it('returns null when the night file is missing', () => {
    expect(readNight('runs', '2099-01-01')).toBeNull();
  });

  it('empty file yields no rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    const d = readNight(dir, '2026-01-01');
    expect(d?.rows).toEqual([]);
  });
});