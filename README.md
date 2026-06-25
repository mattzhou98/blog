# matthew.zhou — Field Notes

Personal blog ("Field Notes") — *code × data × AI*. Built with **Astro** (React
islands), deployed to **GitHub Pages** at <https://mattzhou98.github.io/blog/>.

Migrated from Quarto in June 2026; same design system, same URL.

## Stack

- **Astro 7** static site, **React 19** islands (`client:visible`).
- Content Collections + Markdown/MDX with Zod-typed frontmatter (`src/content.config.ts`).
- `remark-crossref` for numbered `:::fig`/`:::tbl`/`:::eqn` + `@`-refs; KaTeX math.
- Interactive widgets: `GrowthModel` (stateful chart), `RunPython` / `PyNotebook`
  (Pyodide in a Web Worker), `Mermaid` / `Graphviz`. A Service Worker
  (`public/pyodide-sw.js`) caches the Pyodide runtime so it downloads once.
- Google Analytics 4 (`G-C3DGYCXYP5`, IP anonymized) with an implied-consent notice.

## Project base path

This is a GitHub Pages **project** site, so it's served under `/blog`
(`base: '/blog'` in `astro.config.mjs`). Astro does **not** rewrite hardcoded
links — every internal link/asset goes through `u()` in `src/lib/paths.ts`.

## Develop

```sh
npm install
npm run dev        # http://localhost:4321/blog/
npm run build      # -> dist/
npm run preview    # serve the production build
```

> On Windows under an AI agent, `astro dev` can fail to spawn; use
> `ASTRO_DEV_BACKGROUND=1 npm run dev` to force the foreground server.

Adding a post: drop a `.md`/`.mdx` file in `src/content/blog/`. The filename is
the slug — it publishes at `/blog/posts/<slug>/`. For interactive content use
`.mdx` and import components (e.g. `<RunPython client:visible />`).

Build-time figures (optional, not required by the build): `npm run figs` runs
`scripts/make_figs.py` (needs Python + numpy/matplotlib).

## Deploy

Push to `main` → `.github/workflows/deploy.yml` builds and publishes to GitHub
Pages automatically (Node-only; no build-time Python needed).
