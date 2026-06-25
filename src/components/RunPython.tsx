import { useState } from 'react';
import { runInKernel } from '../lib/pykernel';

const DEFAULT = `# Runs in a Web Worker via WebAssembly (Pyodide) — off the main thread,
# so even an infinite loop here can't freeze the page (it gets terminated).
import statistics as st

weekly_views = [120, 180, 240, 310, 520, 760]
print("posts :", len(weekly_views))
print("total :", sum(weekly_views))
print("mean  :", round(st.mean(weekly_views), 1))
print("stdev :", round(st.pstdev(weekly_views), 1))
print("growth wk1 -> wk6:", round(weekly_views[-1] / weekly_views[0], 2), "x")
`;

export default function RunPython({ code = DEFAULT }: { code?: string }) {
  const [src, setSrc] = useState(code);
  const [out, setOut] = useState('');
  const [status, setStatus] = useState<'idle' | 'booting' | 'running' | 'ready' | 'error'>('idle');

  async function run() {
    setStatus(status === 'idle' ? 'booting' : 'running');
    setOut('');
    const r = await runInKernel(src, { scientific: false, execMs: 15000 });
    if (r.timedOut) {
      setOut('⏱ stopped after 15s — possible infinite loop. The kernel was restarted.');
      setStatus('error');
      return;
    }
    setOut(r.out || '(no output)');
    setStatus(r.error ? 'error' : 'ready');
  }

  const label = status === 'booting' ? 'booting python…' : status === 'running' ? 'running…' : '▶ run';
  const busy = status === 'booting' || status === 'running';

  return (
    <div className="island" style={{ background: '#0e1016', borderColor: '#1c2030' }}>
      <p className="k" style={{ color: '#8b93a7' }}>python · web worker</p>
      <textarea
        value={src}
        spellCheck={false}
        onChange={(e) => setSrc(e.target.value)}
        rows={Math.min(16, src.split('\n').length + 1)}
        style={{
          width: '100%', background: 'transparent', color: '#cdd3e0', border: '1px solid #1c2030',
          borderRadius: 8, padding: '0.7rem 0.8rem', fontFamily: 'var(--fn-mono)', fontSize: '0.82rem',
          lineHeight: 1.6, resize: 'vertical', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.6rem' }}>
        <button
          onClick={run}
          disabled={busy}
          style={{
            fontFamily: 'var(--fn-mono)', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 8,
            border: '1px solid color-mix(in srgb, var(--fn-teal) 40%, transparent)',
            background: 'color-mix(in srgb, var(--fn-teal) 16%, transparent)', color: 'var(--fn-teal-ink)',
            padding: '0.36rem 0.9rem',
          }}>
          {label}
        </button>
        <span style={{ fontFamily: 'var(--fn-mono)', fontSize: '0.72rem', color: status === 'error' ? '#ff8585' : '#6b7384' }}>
          {status === 'idle' ? 'off-main-thread · first run downloads ~7MB, then instant' : status === 'error' ? 'stopped' : 'cpython via webassembly'}
        </span>
      </div>
      {out && (
        <pre style={{
          marginTop: '0.7rem', background: '#07090d', border: '1px solid #1c2030', borderRadius: 8,
          padding: '0.7rem 0.8rem', color: status === 'error' ? '#ff9c9c' : '#9af5d0', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap',
        }}>{out}</pre>
      )}
    </div>
  );
}
