import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from 'react';

/**
 * Gradient descent on a 3-D landscape — an interactive island.
 *
 * A rolling terrain of hills and basins (a sum of Gaussians) drawn as an
 * orbitable wireframe. A dot follows the negative gradient downhill and settles
 * in whichever basin it started above — so where you drop it changes where it
 * ends up (the local-minima story; a nod to the AI/ML pillar).
 *
 *   • drag on the surface  → move the ball (it descends from where you drop it)
 *   • the corner pad       → orbit the camera (drag, or arrow keys)
 *   • η slider / ↻ run     → step size / fresh random start
 *
 * Hand-rolled projection, no 3-D dependency (the wireframe suits the blueprint
 * theme). Colors read from the design tokens and re-read on [data-theme] change.
 * Only redraws while descending or being dragged; respects prefers-reduced-motion,
 * pauses off-screen / when hidden, is DPR-aware, and is aria-labeled.
 */

// terrain: gentle bowl (keeps the ball in) + Gaussians (cx, cy, amp, sigma)
const BOWL = 0.05;
const BUMPS: Array<[number, number, number, number]> = [
  [-1.6, 0.9, -1.4, 1.05],
  [1.8, -1.1, -1.7, 1.05],
  [0.3, -0.6, 1.2, 0.85],
  [-1.8, -1.7, 0.9, 0.8],
  [1.1, 1.7, -1.1, 0.9],
  [-0.2, 1.5, 0.8, 0.85],
];
function lossOf(x: number, y: number): number {
  let s = BOWL * (x * x + y * y);
  for (const [cx, cy, a, sg] of BUMPS) { const dx = x - cx, dy = y - cy; s += a * Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg)); }
  return s;
}
function gradOf(x: number, y: number): [number, number] {
  let gx = 2 * BOWL * x, gy = 2 * BOWL * y;
  for (const [cx, cy, a, sg] of BUMPS) {
    const dx = x - cx, dy = y - cy;
    const e = a * Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg));
    gx += e * (-dx / (sg * sg)); gy += e * (-dy / (sg * sg));
  }
  return [gx, gy];
}

const XR = 3, YR = 3, N = 30;      // landscape extent + grid resolution
const ZS = 0.85;                   // display height scale (relief of the hills)
const EPS = 0.02;                  // |gradient| below this = settled
const MAXSTEP = 0.12;             // cap a single step so big η stays stable
const STEP_CAP = 280;

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function GradientDescent({ height = 320, interval = 90 }: { height?: number; interval?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const accent = useRef('#10a368');
  const muted = useRef('#5a6470');
  const surface = useRef('#ffffff');
  const ink = useRef('#0a7a4c');
  const etaRef = useRef(0.25);
  const az = useRef(-0.7);
  const el = useRef(0.92);
  const px = useRef(-2.2); const py = useRef(2.1);
  const trail = useRef<Array<[number, number]>>([]);
  const stepN = useRef(0);
  const reduce = useRef(false);
  const pad = useRef<{ x: number; y: number } | null>(null);
  const ctrl = useRef<{ rerun: () => void; draw: () => void }>({ rerun: () => {}, draw: () => {} });
  const [eta, setEta] = useState(0.25);

  useEffect(() => { etaRef.current = eta; ctrl.current.rerun(); }, [eta]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let alive = true;
    reduce.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const cssH = height;
    const pad0 = 16, foot = 16;

    const verts: Array<Array<[number, number, number]>> = [];
    for (let j = 0; j <= N; j++) {
      const row: Array<[number, number, number]> = [];
      for (let i = 0; i <= N; i++) {
        const x = -XR + (2 * XR) * (i / N), y = -YR + (2 * YR) * (j / N);
        row.push([x, y, lossOf(x, y)]);
      }
      verts.push(row);
    }

    let view = { scale: 1, offX: 0, offY: 0, minX: 0, maxY: 0 }; // last projection, for picking

    function colors() {
      accent.current = readVar('--fn-accent', '#10a368');
      muted.current = readVar('--fn-ink-muted', '#5a6470');
      surface.current = readVar('--fn-surface', '#ffffff');
      ink.current = readVar('--fn-accent-ink', '#0a7a4c');
    }

    function raw(x: number, y: number, zf: number) {
      const z = zf * ZS;
      const ca = Math.cos(az.current), sa = Math.sin(az.current);
      const x1 = x * ca - y * sa, y1 = x * sa + y * ca;
      const ce = Math.cos(el.current), se = Math.sin(el.current);
      return { rx: x1, ry: z * ce - y1 * se, depth: z * se + y1 * ce };
    }

    function reset() { trail.current = [[px.current, py.current]]; stepN.current = 0; }

    function gdStep(): boolean {
      if (stepN.current >= STEP_CAP) return false;
      const [gx, gy] = gradOf(px.current, py.current);
      if (Math.hypot(gx, gy) < EPS) return false;
      let sxv = etaRef.current * gx, syv = etaRef.current * gy;
      const mag = Math.hypot(sxv, syv);
      if (mag > MAXSTEP) { sxv *= MAXSTEP / mag; syv *= MAXSTEP / mag; }
      px.current = Math.max(-XR, Math.min(XR, px.current - sxv));
      py.current = Math.max(-YR, Math.min(YR, py.current - syv));
      trail.current.push([px.current, py.current]);
      if (trail.current.length > 200) trail.current.shift();
      stepN.current++;
      return true;
    }

    function settle() { let n = 0; while (gdStep() && n++ < STEP_CAP); }

    function newStart() {
      px.current = (Math.random() * 2 - 1) * XR * 0.85;
      py.current = (Math.random() * 2 - 1) * YR * 0.85;
    }

    function draw() {
      const w = canvas.clientWidth || 600;
      const P: Array<Array<{ x: number; y: number; d: number; z: number }>> = [];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let j = 0; j <= N; j++) {
        const r: Array<{ x: number; y: number; d: number; z: number }> = [];
        for (let i = 0; i <= N; i++) {
          const v = verts[j][i]; const { rx, ry, depth } = raw(v[0], v[1], v[2]);
          r.push({ x: rx, y: ry, d: depth, z: v[2] });
          if (rx < minX) minX = rx; if (rx > maxX) maxX = rx;
          if (ry < minY) minY = ry; if (ry > maxY) maxY = ry;
          if (v[2] < minZ) minZ = v[2]; if (v[2] > maxZ) maxZ = v[2];
        }
        P.push(r);
      }
      // include the bounding-box corners in the fit so the axes never clip
      for (const cxv of [-XR, XR]) for (const cyv of [-YR, YR]) for (const czv of [minZ, maxZ]) {
        const { rx, ry } = raw(cxv, cyv, czv);
        if (rx < minX) minX = rx; if (rx > maxX) maxX = rx;
        if (ry < minY) minY = ry; if (ry > maxY) maxY = ry;
      }
      const plotW = w - 2 * pad0, plotH = cssH - 2 * pad0 - foot;
      const usedW = (maxX - minX) || 1, usedH = (maxY - minY) || 1;
      const scale = Math.min(plotW / usedW, plotH / usedH);
      const offX = pad0 + (plotW - usedW * scale) / 2;
      const offY = pad0 + (plotH - usedH * scale) / 2;
      view = { scale, offX, offY, minX, maxY };
      const SX = (rx: number) => offX + (rx - minX) * scale;
      const SY = (ry: number) => offY + (maxY - ry) * scale;
      const zRange = maxZ - minZ || 1;
      const proj = (x: number, y: number, zf: number) => { const r = raw(x, y, zf); return [SX(r.rx), SY(r.ry)] as const; };

      ctx.clearRect(0, 0, w, cssH);

      const drawPoly = (pts: { x: number; y: number; d: number; z: number }[]) => {
        let zsum = 0; for (const p of pts) zsum += p.z;
        const tz = (zsum / pts.length - minZ) / zRange; // 0 = deepest basin, 1 = highest ridge
        ctx.strokeStyle = muted.current; ctx.globalAlpha = 0.46 - 0.30 * tz; ctx.lineWidth = 1; // deeper = brighter
        ctx.beginPath();
        ctx.beginPath();
        pts.forEach((p, i) => { const x = SX(p.x), y = SY(p.y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      };
      for (let j = 0; j <= N; j++) drawPoly(P[j]);
      for (let i = 0; i <= N; i++) drawPoly(P.map((r) => r[i]));
      ctx.globalAlpha = 1;

      // ---- labeled axes: a corner gnomon (θ₁, θ₂ along the floor; loss vertical) ----
      {
        const O = proj(-XR, -YR, minZ);
        const ends = [
          { E: proj(XR, -YR, minZ), t: 'θ₁', c: muted.current },
          { E: proj(-XR, YR, minZ), t: 'θ₂', c: muted.current },
          { E: proj(-XR, -YR, maxZ), t: 'loss', c: accent.current },
        ];
        ctx.lineWidth = 1.2; ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const { E, t, c } of ends) {
          const dx = E[0] - O[0], dy = E[1] - O[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
          ctx.globalAlpha = 0.6; ctx.strokeStyle = muted.current;
          ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(E[0], E[1]); ctx.stroke();
          ctx.fillStyle = muted.current;
          ctx.beginPath(); ctx.moveTo(E[0], E[1]);
          ctx.lineTo(E[0] - ux * 7 - uy * 3, E[1] - uy * 7 + ux * 3);
          ctx.lineTo(E[0] - ux * 7 + uy * 3, E[1] - uy * 7 - ux * 3);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 0.95; ctx.fillStyle = c;
          ctx.fillText(t, E[0] + ux * 14, E[1] + uy * 14);
        }
        ctx.globalAlpha = 1; ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
      }

      // ball footprint: shadow on the base + stem up to the surface
      const [gx0, gy0] = proj(px.current, py.current, 0);
      const fz = lossOf(px.current, py.current);
      const [bx, by] = proj(px.current, py.current, fz);
      ctx.strokeStyle = muted.current; ctx.globalAlpha = 0.5; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(gx0, gy0, 4, 2, 0, 0, Math.PI * 2); ctx.fillStyle = muted.current; ctx.fill();
      ctx.globalAlpha = 1;

      // descent path — a background-colored outline under the accent so it reads
      // clearly over the wireframe
      const tr = trail.current;
      const pathPts = tr.map(([x, y]) => proj(x, y, lossOf(x, y)));
      const strokePath = () => { ctx.beginPath(); pathPts.forEach(([sx, sy], i) => { i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke(); };
      ctx.globalAlpha = 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = surface.current; ctx.lineWidth = 5; strokePath();
      ctx.strokeStyle = accent.current; ctx.lineWidth = 2.5; strokePath();
      // ball — halo cutout + accent fill + bright ring (pops over the wireframe)
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fillStyle = surface.current; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, 6.5, 0, Math.PI * 2); ctx.fillStyle = accent.current; ctx.fill();
      ctx.strokeStyle = ink.current; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bx, by, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      // readout
      ctx.fillStyle = muted.current; ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace"; ctx.globalAlpha = 0.85;
      ctx.fillText(`step ${String(stepN.current).padStart(3, '0')}    loss ${lossOf(px.current, py.current).toFixed(3)}`, 8, cssH - 6);
      ctx.globalAlpha = 1;
    }

    function rerun() { reset(); if (reduce.current) settle(); draw(); }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 600;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    // ---- drag on the surface moves the ball (screen -> ground (x,y), z=0 plane) ----
    let ballDrag = false, rafPending = false;
    const requestDraw = () => { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; if (alive) draw(); }); };
    function pick(clientX: number, clientY: number) {
      const r = canvas.getBoundingClientRect();
      const rawX = (clientX - r.left - view.offX) / view.scale + view.minX;
      const rawY = view.maxY - (clientY - r.top - view.offY) / view.scale;
      const ca = Math.cos(az.current), sa = Math.sin(az.current), se = Math.sin(el.current) || 0.001;
      const t = -rawY / se;
      px.current = Math.max(-XR, Math.min(XR, ca * rawX + sa * t));
      py.current = Math.max(-YR, Math.min(YR, -sa * rawX + ca * t));
      trail.current = [[px.current, py.current]]; stepN.current = 0;
    }
    const onDown = (e: PointerEvent) => { ballDrag = true; canvas.setPointerCapture?.(e.pointerId); pick(e.clientX, e.clientY); draw(); };
    const onMove = (e: PointerEvent) => { if (ballDrag) { pick(e.clientX, e.clientY); requestDraw(); } };
    const onUp = () => { ballDrag = false; };

    colors();
    reset();
    resize();
    if (reduce.current) settle();
    draw();

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    let visible = true;
    const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? true; });
    io.observe(canvas);
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    const mo = new MutationObserver(() => { colors(); draw(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const timer = window.setInterval(() => {
      // keep descending even while orbiting the camera (pad.current) — only pause
      // when off-screen, tab-hidden, reduced-motion, or dragging the ball itself
      if (reduce.current || !visible || document.hidden || ballDrag) return;
      if (gdStep()) draw();
    }, interval);

    ctrl.current = { rerun: () => { newStart(); rerun(); }, draw: () => requestDraw() };

    return () => {
      alive = false;
      window.clearInterval(timer);
      io.disconnect(); ro.disconnect(); mo.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [height, interval]);

  // ---- corner orbit pad (drag or arrow keys) ----
  const onPadDown = (e: RPointerEvent) => { pad.current = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onPadMove = (e: RPointerEvent) => {
    if (!pad.current) return;
    az.current += (e.clientX - pad.current.x) * 0.014;
    el.current = Math.max(0.25, Math.min(1.45, el.current - (e.clientY - pad.current.y) * 0.014));
    pad.current = { x: e.clientX, y: e.clientY };
    ctrl.current.draw();
  };
  const onPadUp = () => { pad.current = null; };
  const onPadKey = (e: RKeyboardEvent) => {
    let h = 0, v = 0;
    if (e.key === 'ArrowLeft') h = -1; else if (e.key === 'ArrowRight') h = 1;
    else if (e.key === 'ArrowUp') v = -1; else if (e.key === 'ArrowDown') v = 1; else return;
    e.preventDefault();
    az.current += h * 0.14; el.current = Math.max(0.25, Math.min(1.45, el.current + v * 0.14));
    ctrl.current.draw();
  };

  return (
    <div className="island">
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <p className="k" style={{ margin: 0 }}>gradient descent — drag to move the ball</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--fn-mono)', fontSize: '0.72rem', color: 'var(--fn-ink-muted)' }}>
            <span>step η</span>
            <input
              type="range" min={0.05} max={0.6} step={0.05} value={eta}
              onChange={(e) => setEta(Number(e.target.value))}
              aria-label="Gradient descent step size (learning rate)"
              style={{ accentColor: 'var(--fn-accent)', width: 80 }}
            />
            <span style={{ color: 'var(--fn-accent-ink)', minWidth: '2.6ch' }}>{eta.toFixed(2)}</span>
          </label>
          <button type="button" onClick={() => ctrl.current.rerun()} style={btn}>↻ run</button>
        </div>
      </div>
      <div style={{ position: 'relative', marginTop: '0.8rem' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="A 3-D landscape of hills and basins with a dot performing gradient descent into a basin; drag on the surface to move the dot, and use the corner pad (or arrow keys) to orbit the camera."
          style={{
            display: 'block', width: '100%', height, borderRadius: 6, cursor: 'crosshair', touchAction: 'none',
            background: 'color-mix(in srgb, var(--fn-ink) 4%, var(--fn-surface))',
          }}
        />
        <div
          role="button" tabIndex={0} aria-label="Orbit the camera — drag, or use arrow keys"
          onPointerDown={onPadDown} onPointerMove={onPadMove} onPointerUp={onPadUp} onKeyDown={onPadKey}
          title="drag to orbit"
          style={{
            position: 'absolute', right: 10, bottom: 10, width: 52, height: 52,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
            border: '1px solid var(--fn-line)', borderRadius: 9, cursor: 'grab', touchAction: 'none', userSelect: 'none',
            background: 'color-mix(in srgb, var(--fn-surface) 78%, transparent)', backdropFilter: 'blur(3px)',
            fontFamily: 'var(--fn-mono)', color: 'var(--fn-ink-muted)',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '1.05rem', lineHeight: 1, color: 'var(--fn-accent-ink)' }}>✥</span>
          <span aria-hidden="true" style={{ fontSize: '0.56rem', letterSpacing: '0.08em' }}>orbit</span>
        </div>
      </div>
    </div>
  );
}

const btn: CSSProperties = {
  fontFamily: 'var(--fn-mono)', fontSize: '0.7rem', color: 'var(--fn-ink-muted)',
  background: 'transparent', border: '1px solid var(--fn-line)', borderRadius: 6,
  padding: '0.3rem 0.55rem', cursor: 'pointer', lineHeight: 1,
};
