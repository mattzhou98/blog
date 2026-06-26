import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Conway's Game of Life — a stateful, interactive island.
 *
 * Drop-in replacement for the GrowthModel "views projection". Two reasons it's a
 * better homepage centerpiece for a young blog:
 *   1. It needs zero posts to feel alive (the projection looked thin at N=1).
 *   2. It leans into the same "runnable code right in the page" thesis — click
 *      the cells to draw, and it evolves on its own.
 *
 * Theming: cell + label colors are read from the design-system CSS variables
 * (--fn-accent, --fn-ink-muted) and re-read whenever [data-theme] on <html>
 * flips, so it tracks the light/dark toggle automatically — no props needed.
 *
 * Accessibility: respects prefers-reduced-motion (starts paused), and the
 * controls are real <button>s with aria-labels.
 */

type Props = {
  /** canvas height in CSS px */
  height?: number;
  /** cell edge in CSS px */
  cell?: number;
  /** ms between generations */
  interval?: number;
  /** initial fill probability for a random seed (0–1) */
  density?: number;
};

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function Life({ height = 170, cell = 10, interval = 110, density = 0.26 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<Uint8Array>(new Uint8Array(0));
  const colsRef = useRef(0);
  const rowsRef = useRef(0);
  const genRef = useRef(0);
  const accentRef = useRef('#44e08a');
  const mutedRef = useRef('#828a95');
  const playingRef = useRef(true);
  // control fns are wired up inside the effect (they close over draw/seed/grid)
  const controls = useRef<{ random: () => void; clear: () => void }>({ random: () => {}, clear: () => {} });
  const [playing, setPlaying] = useState(true);

  // keep the loop's ref in sync with React state so the button label drives it
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduceMotion) { playingRef.current = false; setPlaying(false); }

    let cssW = 0;
    const cssH = height;

    const idx = (x: number, y: number) =>
      ((x + colsRef.current) % colsRef.current) + ((y + rowsRef.current) % rowsRef.current) * colsRef.current;

    function refreshColors() {
      accentRef.current = readVar('--fn-accent', '#44e08a');
      mutedRef.current = readVar('--fn-ink-muted', '#828a95');
    }

    function seed() {
      const n = colsRef.current * rowsRef.current;
      const g = new Uint8Array(n);
      for (let i = 0; i < n; i++) g[i] = Math.random() < density ? 1 : 0;
      gridRef.current = g;
      genRef.current = 0;
    }

    function draw() {
      const g = gridRef.current;
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = accentRef.current;
      for (let y = 0; y < rowsRef.current; y++)
        for (let x = 0; x < colsRef.current; x++)
          if (g[idx(x, y)]) ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      let pop = 0;
      for (let i = 0; i < g.length; i++) pop += g[i];
      ctx.fillStyle = mutedRef.current;
      ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
      ctx.globalAlpha = 0.85;
      ctx.fillText(`GEN ${String(genRef.current).padStart(4, '0')}    POP ${pop}`, 8, cssH - 8);
      ctx.globalAlpha = 1;
    }

    function step() {
      const cols = colsRef.current, rows = rowsRef.current;
      const g = gridRef.current;
      const next = new Uint8Array(cols * rows);
      let pop = 0;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              if (dx || dy) n += g[idx(x + dx, y + dy)];
          const a = g[idx(x, y)];
          const live = a ? n === 2 || n === 3 : n === 3;
          next[idx(x, y)] = live ? 1 : 0;
          if (live) pop++;
        }
      gridRef.current = next;
      genRef.current++;
      // sprinkle when it thins out so the board never dies into emptiness
      if (pop < cols * rows * 0.05)
        for (let i = 0; i < next.length; i++) if (Math.random() < 0.1) next[i] = 1;
      draw();
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = canvas.clientWidth || 600;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const newCols = Math.max(1, Math.floor(cssW / cell));
      const newRows = Math.max(1, Math.floor(cssH / cell));
      const changed = newCols !== colsRef.current || newRows !== rowsRef.current;
      colsRef.current = newCols;
      rowsRef.current = newRows;
      // reseed only when the dimensions actually change (or on first run) so an
      // incidental resize (window drag, mobile URL-bar) doesn't wipe the board
      if (changed || gridRef.current.length === 0) seed();
      draw();
    }

    function onClick(e: MouseEvent) {
      const r = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * colsRef.current);
      const y = Math.floor(((e.clientY - r.top) / r.height) * rowsRef.current);
      if (x < 0 || y < 0 || x >= colsRef.current || y >= rowsRef.current) return;
      const i = idx(x, y);
      gridRef.current[i] = gridRef.current[i] ? 0 : 1;
      draw();
    }

    refreshColors();
    resize();

    // pause stepping while the board is scrolled off-screen or the tab is hidden
    // (otherwise the hero keeps simulating ~9 fps forever — wasted CPU/battery)
    let visible = true;
    const timer = window.setInterval(() => {
      if (playingRef.current && visible && !document.hidden) step();
    }, interval);
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true; });
    io.observe(canvas);
    // re-read the palette when the theme toggle flips [data-theme] on <html>
    const mo = new MutationObserver(() => { refreshColors(); draw(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    canvas.addEventListener('click', onClick);

    controls.current = {
      random: () => { seed(); draw(); },
      clear: () => { gridRef.current = new Uint8Array(colsRef.current * rowsRef.current); genRef.current = 0; draw(); },
    };

    return () => {
      window.clearInterval(timer);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      canvas.removeEventListener('click', onClick);
    };
  }, [height, cell, interval, density]);

  return (
    <div className="island">
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="k" style={{ margin: 0 }}>life — click to draw</p>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" onClick={() => setPlaying((p) => !p)} style={btn}>{playing ? '⏸ pause' : '▶ play'}</button>
          <button type="button" onClick={() => controls.current.random()} style={btn}>↻ random</button>
          <button type="button" onClick={() => controls.current.clear()} style={btn}>✦ clear</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Conway's Game of Life — an animated grid of living cells; click to toggle a cell"
        style={{
          display: 'block', width: '100%', height, marginTop: '0.8rem',
          borderRadius: 6, cursor: 'crosshair',
          background: 'color-mix(in srgb, var(--fn-ink) 4%, var(--fn-surface))',
        }}
      />
    </div>
  );
}

const btn: CSSProperties = {
  fontFamily: 'var(--fn-mono)', fontSize: '0.7rem', color: 'var(--fn-ink-muted)',
  background: 'transparent', border: '1px solid var(--fn-line)', borderRadius: 6,
  padding: '0.3rem 0.55rem', cursor: 'pointer', lineHeight: 1,
};
