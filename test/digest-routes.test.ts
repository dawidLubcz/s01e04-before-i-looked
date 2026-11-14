import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const baseConfig = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: 'runs',
};

describe('digest routes', () => {
  it('GET /digest/:night renders 2026-10-28', async () => {
    const res = await createApp(baseConfig).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest · 2026-10-28');
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('malformed line');
  });

  it('GET /api/digest/:night matches page job order', async () => {
    const app = createApp(baseConfig);
    const htmlRes = await app.request('/digest/2026-10-28');
    const jsonRes = await app.request('/api/digest/2026-10-28');
    const digest = (await jsonRes.json()) as { rows: { job: string }[] };
    const html = await htmlRes.text();
    for (const row of digest.rows) {
      expect(html).toContain(row.job);
    }
    const jobsFromJson = digest.rows.map((r) => r.job);
    expect(jobsFromJson).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('404 when the night file is missing', async () => {
    const res = await createApp(baseConfig).request('/digest/2099-01-01');
    expect(res.status).toBe(404);
    const api = await createApp(baseConfig).request('/api/digest/2099-01-01');
    expect(api.status).toBe(404);
  });

  it('empty night file renders nothing ran', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-01-02.jsonl'), '');
    const config = { ...baseConfig, runsDir: dir };
    const res = await createApp(config).request('/digest/2026-01-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('bad line still returns 200', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(
      join(dir, '2026-01-03.jsonl'),
      '{"at":"2026-01-03T00:00:00+01:00","job":"a","status":"ok","owner":"x"}\nnot-json\n',
    );
    const config = { ...baseConfig, runsDir: dir };
    const res = await createApp(config).request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    const json = await createApp(config).request('/api/digest/2026-01-03');
    const body = (await json.json()) as { badLines: number };
    expect(body.badLines).toBe(1);
  });
});