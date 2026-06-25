import { useEffect, useId, useRef } from 'react';
import { useTheme } from '../lib/useTheme';

// Client island: renders a Mermaid diagram from a `chart` string, loading mermaid
// from the CDN. Picks the mermaid theme from the site theme and re-renders when
// the reader toggles light/dark.
let mermaidPromise: Promise<any> | null = null;
function getMermaid() {
  if (mermaidPromise) return mermaidPromise;
  const url = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaidPromise = import(/* @vite-ignore */ url).then((m) => m.default);
  return mermaidPromise;
}

export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  // Stable per-island id, varied by theme — avoids mermaid's duplicate-id throw
  // across islands and across toggles (don't derive it from chart length).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  useEffect(() => {
    let alive = true;
    getMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'neutral' });
        const id = 'm' + uid + (theme === 'dark' ? 'd' : 'l');
        const { svg } = await mermaid.render(id, chart);
        if (alive && ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => { if (ref.current) ref.current.textContent = String(e); });
    return () => { alive = false; };
  }, [chart, theme, uid]);
  return <div className="island" style={{ textAlign: 'center' }} ref={ref}>rendering…</div>;
}
