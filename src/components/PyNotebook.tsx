import { useEffect, useRef, useState } from 'react';
import { runInKernel, resetKernel } from '../lib/pykernel';

type Cell = { code: string; out: string; html: string; figs: string[]; count: number | null; error: boolean };

/**
 * Jupyter-style notebook island. All cells run in ONE shared Pyodide kernel
 * living in a Web Worker (so variables persist between cells, and a runaway cell
 * can be hard-terminated without freezing the page). With `scientific` the
 * worker loads numpy/matplotlib/pandas and returns figures (SVG) + tables (HTML).
 */
export default function PyNotebook({
  cells: initial, autorun = false, scientific = false,
}: { cells: string[]; autorun?: boolean; scientific?: boolean }) {
  const [cells, setCells] = useState<Cell[]>(() =>
    initial.map((code) => ({ code: code.replace(/\s+$/, ''), out: '', html: '', figs: [], count: null, error: false }))
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'busy' | 'ready' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const countRef = useRef(0);
  const running = useRef(false);     // per-notebook lock
  const epoch = useRef(0);           // bumped on restart to drop stale results
  const sciStarted = useRef(false);
  const started = useRef(false);

  const patch = (i: number, p: Partial<Cell>) =>
    setCells((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...p } : c)));

  async function exec(i: number) {
    const myEpoch = epoch.current;
    const r = await runInKernel(cellsRef.current[i].code, { scientific, execMs: 15000 });
    if (myEpoch !== epoch.current) return;               // restarted mid-run — drop result
    if (r.timedOut) {
      sciStarted.current = false;                         // the worker was killed; it reboots next run
      patch(i, { out: '⏱ stopped after 15s — possible infinite loop. The kernel was restarted.', html: '', figs: [], count: ++countRef.current, error: true });
      return;
    }
    patch(i, {
      out: r.out || (r.html || r.figs.length ? '' : '(no output)'),
      html: r.html, figs: r.figs, count: ++countRef.current, error: r.error,
    });
  }

  async function runMany(idxs: number[]) {
    if (running.current) return;
    running.current = true;
    setMsg('');
    const firstSci = scientific && !sciStarted.current;
    if (scientific) sciStarted.current = true;
    setStatus(firstSci ? 'loading' : 'busy');
    try {
      for (const i of idxs) await exec(i);
      setStatus('ready');
    } catch (e: any) {
      setStatus('error');
      setMsg(String(e?.message ?? e));
    } finally {
      running.current = false;
    }
  }

  const runOne = (i: number) => runMany([i]);
  const runAll = () => runMany(cellsRef.current.map((_, i) => i));

  function restart() {
    epoch.current++;
    resetKernel();
    running.current = false;
    sciStarted.current = false;
    countRef.current = 0;
    setMsg('');
    setStatus('idle');
    setCells((prev) => prev.map((c) => ({ ...c, out: '', html: '', figs: [], count: null, error: false })));
  }

  useEffect(() => {
    if (autorun && !started.current) { started.current = true; runAll(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = status === 'busy' || status === 'loading';
  const statusText =
    status === 'idle' ? (scientific
      ? 'kernel: not started · ▶ run loads Python + only the packages each cell uses (cached after the first time)'
      : 'kernel: not started · ▶ run loads Python on first click') :
    status === 'loading' ? 'kernel: loading Python + packages (first run only — cached afterward)…' :
    status === 'busy' ? 'kernel: running…' :
    status === 'error' ? `kernel: error${msg ? ' — ' + msg : ''}` : 'kernel: ready';

  return (
    <div className="island" style={{ padding: '0.9rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.7rem' }}>
        <p className="k" style={{ margin: 0, flex: 1 }}>python notebook · web worker{scientific ? ' · numpy/mpl/pandas' : ''}</p>
        <button onClick={runAll} disabled={busy} style={btn(true)}>▶▶ run all</button>
        <button onClick={restart} disabled={busy} style={btn(false)}>⟳ restart</button>
      </div>

      {cells.map((c, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '3.2rem 1fr', gap: '0.5rem', marginBottom: '0.55rem' }}>
          <div style={gutter}>In [{c.count ?? ' '}]</div>
          <div>
            <textarea
              value={c.code} spellCheck={false}
              onChange={(e) => patch(i, { code: e.target.value })}
              rows={Math.min(16, c.code.split('\n').length + 1)}
              style={editor}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.3rem' }}>
              <button onClick={() => runOne(i)} disabled={busy} style={btn(true)}>▶ run</button>
            </div>
            {(c.out || c.html || c.figs.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '3.2rem 1fr', gap: '0.5rem', marginTop: '0.15rem' }}>
                <div style={{ ...gutter, color: c.error ? '#ff8585' : 'var(--fn-teal-ink)' }}>Out[{c.count ?? ' '}]</div>
                <div>
                  {c.out && <pre style={{ ...output, color: c.error ? '#ff9c9c' : '#9af5d0' }}>{c.out}</pre>}
                  {c.html && <div className="nb-rich" dangerouslySetInnerHTML={{ __html: c.html }} />}
                  {c.figs.map((s, k) => <div key={k} className="nb-fig" dangerouslySetInnerHTML={{ __html: s }} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      <p style={{ fontFamily: 'var(--fn-mono)', fontSize: '0.7rem', color: status === 'error' ? '#ff8585' : 'var(--fn-ink-muted)', margin: '0.3rem 0 0' }}>
        {statusText} · variables persist between cells
      </p>
    </div>
  );
}

const btn = (accent: boolean): React.CSSProperties => ({
  fontFamily: 'var(--fn-mono)', fontSize: '0.74rem', cursor: 'pointer', borderRadius: 7, padding: '0.26rem 0.6rem',
  border: `1px solid color-mix(in srgb, var(--fn-${accent ? 'teal' : 'ink-muted'}) 40%, transparent)`,
  background: `color-mix(in srgb, var(--fn-${accent ? 'teal' : 'ink-muted'}) 14%, transparent)`,
  color: accent ? 'var(--fn-teal-ink)' : 'var(--fn-ink-muted)',
});
const gutter: React.CSSProperties = {
  fontFamily: 'var(--fn-mono)', fontSize: '0.7rem', color: 'var(--fn-ink-muted)', textAlign: 'right', paddingTop: '0.5rem', whiteSpace: 'nowrap',
};
const editor: React.CSSProperties = {
  width: '100%', background: '#0e1016', color: '#cdd3e0', border: '1px solid #1c2030', borderRadius: 8,
  padding: '0.6rem 0.7rem', fontFamily: 'var(--fn-mono)', fontSize: '0.82rem', lineHeight: 1.6, resize: 'vertical', outline: 'none',
};
const output: React.CSSProperties = {
  margin: 0, background: '#07090d', border: '1px solid #1c2030', borderRadius: 8, padding: '0.55rem 0.7rem',
  fontFamily: 'var(--fn-mono)', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap',
};
