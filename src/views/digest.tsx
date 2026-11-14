import type { DigestRow } from '../digest/types.js';

function ownerCell(owner: string | null) {
  return owner ?? '—';
}

function rowClass(row: DigestRow) {
  if (row.lastStatus === 'fail') return 'warn';
  if (row.retries >= 3) return 'warn';
  return '';
}

export function DigestPage({ night, rows, badLines }: { night: string; rows: DigestRow[]; badLines: number }) {
  if (rows.length === 0) {
    return (
      <>
        <h1>digest · {night}</h1>
        <p class="mute">nothing ran</p>
      </>
    );
  }
  return (
    <>
      <h1>digest · {night}</h1>
      {badLines > 0 ? <p class="mute">{badLines} malformed line(s) skipped</p> : null}
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last</th>
            <th>error</th>
            <th>first</th>
            <th>last at</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr class={rowClass(r)}>
              <td>{r.job}</td>
              <td>{ownerCell(r.owner)}</td>
              <td>{r.runs}</td>
              <td>{r.retries}</td>
              <td class={r.lastStatus === 'fail' ? 'warn' : ''}>{r.lastStatus}</td>
              <td>{r.lastError ?? '—'}</td>
              <td>{r.firstAt}</td>
              <td>{r.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}