import { useEffect, useRef } from 'react';

// Client island: renders a Graphviz `dot` graph via @viz-js/viz (WASM) from the
// CDN — the Astro equivalent of Quarto's native ```{dot}``` block.
let vizPromise: Promise<any> | null = null;
function getViz() {
  if (vizPromise) return vizPromise;
  const url = 'https://cdn.jsdelivr.net/npm/@viz-js/viz@3/lib/viz-standalone.mjs';
  vizPromise = import(/* @vite-ignore */ url).then((m) => m.instance());
  return vizPromise;
}

export default function Graphviz({ dot }: { dot: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    getViz()
      .then((viz) => {
        const svg = viz.renderSVGElement(dot);
        svg.style.maxWidth = '100%';
        if (alive && ref.current) { ref.current.innerHTML = ''; ref.current.appendChild(svg); }
      })
      .catch((e) => { if (ref.current) ref.current.textContent = String(e); });
    return () => { alive = false; };
  }, [dot]);
  return <div className="island" style={{ textAlign: 'center' }} ref={ref}>rendering…</div>;
}
