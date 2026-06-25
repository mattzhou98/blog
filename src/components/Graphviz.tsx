import { useEffect, useRef } from 'react';
import { useTheme } from '../lib/useTheme';

// Client island: renders a Graphviz `dot` graph via @viz-js/viz (WASM) from the
// CDN. Default Graphviz ink is black, which vanishes on the dark theme — so we
// inject theme-aware default colors and re-render when the theme toggles.
let vizPromise: Promise<any> | null = null;
function getViz() {
  if (vizPromise) return vizPromise;
  const url = 'https://cdn.jsdelivr.net/npm/@viz-js/viz@3/lib/viz-standalone.mjs';
  vizPromise = import(/* @vite-ignore */ url).then((m) => m.instance());
  return vizPromise;
}

export default function Graphviz({ dot }: { dot: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  useEffect(() => {
    let alive = true;
    const ink = theme === 'dark' ? '#cdd3e0' : '#2b2f38';
    // Inject theme-aware defaults right after the graph body's opening brace so
    // nodes/edges/labels contrast with the current background. Anchored to the
    // graph header so a brace inside a label can't be matched first; a caller that
    // sets its own node/edge defaults later takes over (and owns its contrast).
    const inject = ` bgcolor="transparent"; node [color="${ink}" fontcolor="${ink}"]; edge [color="${ink}" fontcolor="${ink}"];`;
    const themed = dot.replace(/((?:strict\s+)?(?:di)?graph\b[^{]*\{)/i, (m) => m + inject);
    getViz()
      .then((viz) => {
        if (!alive) return;
        const svg = viz.renderSVGElement(themed);
        svg.style.maxWidth = '100%';
        if (ref.current) { ref.current.innerHTML = ''; ref.current.appendChild(svg); }
      })
      .catch((e) => { if (ref.current) ref.current.textContent = String(e); });
    return () => { alive = false; };
  }, [dot, theme]);
  return <div className="island" style={{ textAlign: 'center' }} ref={ref}>rendering…</div>;
}
