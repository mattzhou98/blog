import { useMemo, useState } from 'react';

/**
 * A stateful, reusable island (props + state + derived render) — the thing
 * a Quarto raw-HTML block can't give you ergonomically. Drag the inputs and
 * the projection + SVG chart recompute live. Reusable: pass different props.
 */

type RowProps = {
  label: string;
  val: number;
  suffix?: string;
  min: number;
  max: number;
  step: number;
  on: (n: number) => void;
};

// IMPORTANT: defined at MODULE scope, not inside GrowthModel. If it lived inside
// the component, every state change would create a new component identity and
// React would remount the <input> each render — which drops the in-progress
// drag after a single tick. Hoisting keeps the DOM node stable across renders.
function Row({ label, val, suffix = '', min, max, step, on }: RowProps) {
  return (
    <label style={{ display: 'block', margin: '0.55rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fn-mono)', fontSize: '0.78rem', color: 'var(--fn-ink-muted)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--fn-accent-ink)' }}>{val}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={val}
        onChange={(e) => on(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--fn-accent)' }}
      />
    </label>
  );
}

export default function GrowthModel({
  title = 'compounding: posts → cumulative views',
  weeks = 26,
}: { title?: string; weeks?: number }) {
  const [perPost, setPerPost] = useState(120); // avg views in week 1
  const [growth, setGrowth] = useState(6); // % weekly compounding (backlog keeps earning)
  const [cadence, setCadence] = useState(1); // posts per week

  const series = useMemo(() => {
    const g = 1 + growth / 100;
    const pts: number[] = [];
    let cumulative = 0;
    const live: number[] = []; // each post's current weekly views
    for (let w = 0; w < weeks; w++) {
      for (let p = 0; p < cadence; p++) live.push(perPost);
      for (let i = 0; i < live.length; i++) live[i] *= g; // every post compounds
      cumulative += live.reduce((a, b) => a + b, 0);
      pts.push(Math.round(cumulative));
    }
    return pts;
  }, [perPost, growth, cadence, weeks]);

  const total = series[series.length - 1] ?? 0;
  const max = Math.max(...series, 1);
  const W = 520, H = 150, pad = 4;
  const path = series
    .map((v, i) => {
      const x = pad + (i / (series.length - 1)) * (W - 2 * pad);
      const y = H - pad - (v / max) * (H - 2 * pad);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="island">
      <p className="k">{title}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.2rem' }}>
        <Row label="views / new post" val={perPost} min={20} max={500} step={10} on={setPerPost} />
        <Row label="weekly growth" val={growth} suffix="%" min={0} max={15} step={1} on={setGrowth} />
        <Row label="posts / week" val={cadence} min={1} max={5} step={1} on={setCadence} />
        <div style={{ alignSelf: 'end', textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--fn-display)', fontWeight: 700, fontSize: '1.7rem', letterSpacing: '-0.02em' }}>
            {total.toLocaleString('en-US')}
          </div>
          <div style={{ fontFamily: 'var(--fn-mono)', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fn-ink-muted)' }}>
            cumulative views · {weeks}w
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 150, marginTop: '0.6rem', display: 'block' }} preserveAspectRatio="none">
        <path d={`${path} L${W - pad} ${H - pad} L${pad} ${H - pad} Z`} fill="var(--fn-accent)" opacity="0.12" />
        <path d={path} fill="none" stroke="var(--fn-accent)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
