"""Figure generator — emits a LIGHT and a DARK variant of each figure so it stays
readable under either site theme (the page swaps them via CSS on [data-theme]).

Run manually with `npm run figs` (needs Python + numpy + matplotlib). Not part of
the build — the SVGs are committed.
"""
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("svg")
import matplotlib.pyplot as plt

rng = np.random.default_rng(7)
weeks = np.arange(1, 13)
views = np.clip((80 * (1.18 ** weeks) + rng.normal(0, 40, weeks.size)).round(), 0, None).astype(int)

OUT = Path(__file__).resolve().parent.parent / "public" / "figs"
OUT.mkdir(parents=True, exist_ok=True)


def render(name, ink, line):
    """Render one transparent variant. `ink` colors the text/ticks/axes/grid so
    it contrasts with the target theme's background; `line` is the series color."""
    plt.rcParams.update({
        "text.color": ink, "axes.labelcolor": ink, "axes.edgecolor": ink,
        "xtick.color": ink, "ytick.color": ink, "grid.color": ink,
    })
    fig, ax = plt.subplots(figsize=(6.4, 3.2))
    ax.plot(weeks, views, marker="o", lw=2.2, color=line)
    ax.fill_between(weeks, views, alpha=0.12, color=line)
    ax.set_xlabel("week")
    ax.set_ylabel("views")
    ax.set_xticks(weeks)
    ax.grid(alpha=0.3)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout()
    fig.savefig(OUT / name, format="svg", transparent=True)
    plt.close(fig)


# light theme -> dark ink on the light page; dark theme -> light ink on the dark page
render("exec-views-light.svg", ink="#3a3f4b", line="#10a368")
render("exec-views-dark.svg", ink="#cdd3e0", line="#44e08a")
print("[make_figs] wrote exec-views-light.svg + exec-views-dark.svg")
