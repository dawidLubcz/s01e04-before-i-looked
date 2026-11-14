import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, NightCounts, NightDigest, RunLogLine } from './types.js';

function parseLine(line: string): RunLogLine | null {
  const t = line.trim();
  if (!t) return null;
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.job !== 'string' || typeof o.status !== 'string') return null;
    if (!['ok', 'retry', 'fail'].includes(o.status)) return null;
    const owner = o.owner === null || o.owner === undefined ? null : String(o.owner);
    const error = typeof o.error === 'string' ? o.error : undefined;
    return {
      at: o.at,
      job: o.job,
      status: o.status as JobStatus,
      owner,
      error,
    };
  } catch {
    return null;
  }
}

function aggregate(events: RunLogLine[]): DigestRow[] {
  const byJob = new Map<string, RunLogLine[]>();
  for (const e of events) {
    byJob.set(e.job, [...(byJob.get(e.job) ?? []), e]);
  }
  const rows: DigestRow[] = [];
  for (const [job, lines] of byJob) {
    const sorted = [...lines].sort((a, b) => a.at.localeCompare(b.at));
    const last = sorted[sorted.length - 1]!;
    rows.push({
      job,
      owner: last.owner,
      runs: lines.length,
      retries: lines.filter((l) => l.status === 'retry').length,
      lastStatus: last.status,
      lastError: last.error ?? null,
      firstAt: sorted[0]!.at,
      lastAt: last.at,
    });
  }
  return rows.sort((a, b) => a.job.localeCompare(b.job));
}

export function readNightFile(path: string, night: string): NightDigest | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  if (raw.length === 0) return { night, rows: [], badLines: 0 };

  const events: RunLogLine[] = [];
  let badLines = 0;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const parsed = parseLine(line);
    if (!parsed) badLines += 1;
    else events.push(parsed);
  }
  events.sort((a, b) => a.at.localeCompare(b.at));
  return { night, rows: aggregate(events), badLines };
}

export function readNight(runsDir: string, night: string): NightDigest | null {
  const path = join(runsDir, `${night}.jsonl`);
  return readNightFile(path, night);
}

export function nightCounts(runsDir: string, night: string): NightCounts | null {
  const digest = readNight(runsDir, night);
  if (!digest) return null;
  const path = join(runsDir, `${night}.jsonl`);
  const raw = readFileSync(path, 'utf8');
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const line of raw.split('\n')) {
    const p = parseLine(line);
    if (p) counts[p.status] += 1;
  }
  return counts;
}