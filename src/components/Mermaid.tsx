import { useEffect, useRef } from 'react';

// Client island: renders a Mermaid diagram from a `chart` string. Quarto does
// this natively (```{mermaid}```); in Astro it's a small component loading
// mermaid from the CDN. Same "diagram as code", different plumbing.
let mermaidPromise: Promise<any> | null = null;
function getMermaid() {
  if (mermaidPromise) return mermaidPromise;
  const url = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaidPromise = import(/* @vite-ignore */ url).then((m) => m.default);
  return mermaidPromise;
}

export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    const dark = document.documentElement.dataset.theme === 'dark';
    getMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral' });
        const id = 'm' + Math.abs(chart.length * 2654435761 % 1e8);
        const { svg } = await mermaid.render(id, chart);
        if (alive && ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => { if (ref.current) ref.current.textContent = String(e); });
    return () => { alive = false; };
  }, [chart]);
  return <div className="island" style={{ textAlign: 'center' }} ref={ref}>rendering…</div>;
}
