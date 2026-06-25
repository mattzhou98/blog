"""Prebuild figure + stats generator — the missing Quarto piece, recovered in Astro.

Runs before `astro build` (npm `prebuild` hook). It executes real Python
(numpy + matplotlib) and emits (1) an SVG figure into public/figs/ and (2) the
summary stats into src/data/exec.json. The Astro `executable` post shows the
code below, references the figure inside a numbered `:::fig`, and fills the
table from the JSON — so it mirrors Quarto's "code -> output" cells, just split
across a build step instead of inline.
"""
from pathlib import Path
import json
import numpy as np
import matplotlib
matplotlib.use("svg")
import matplotlib.pyplot as plt

rng = np.random.default_rng(7)
weeks = np.arange(1, 13)
views = np.clip((80 * (1.18 ** weeks) + rng.normal(0, 40, weeks.size)).round(), 0, None).astype(int)

# --- figure ------------------------------------------------------------------
ACCENT = "#4b54ff"
fig, ax = plt.subplots(figsize=(6.4, 3.2))
ax.plot(weeks, views, marker="o", lw=2.2, color=ACCENT)
ax.fill_between(weeks, views, alpha=0.12, color=ACCENT)
ax.set_xlabel("week")
ax.set_ylabel("views")
ax.set_xticks(weeks)
ax.grid(alpha=0.2)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
fig.tight_layout()

svg = Path(__file__).resolve().parent.parent / "public" / "figs" / "exec-views.svg"
svg.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(svg, format="svg", transparent=True)

# --- table stats -------------------------------------------------------------
stats = {
    "total": int(views.sum()),
    "mean": round(float(views.mean()), 1),
    "max": int(views.max()),
    "weeks": int(weeks.size),
}
data = Path(__file__).resolve().parent.parent / "src" / "data" / "exec.json"
data.parent.mkdir(parents=True, exist_ok=True)
data.write_text(json.dumps(stats))

print(f"[make_figs] wrote {svg.name} + exec.json -> {stats}")
