import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import rehypeKatex from 'rehype-katex';
import remarkCrossref from './src/plugins/remark-crossref.mjs';

// GitHub Pages PROJECT site: the repo is named `blog`, so the site is served at
// https://mattzhou98.github.io/blog/. `base` must match that subpath so every
// emitted route/asset URL is prefixed with /blog/ and lines up with where Pages
// serves the artifact. Astro does NOT rewrite hardcoded link strings, so internal
// links in .astro go through src/lib/paths.ts (import.meta.env.BASE_URL).
export default defineConfig({
  site: 'https://mattzhou98.github.io',
  base: '/blog',
  integrations: [react(), mdx()],
  markdown: {
    // remarkDirective parses :::fig/:::tbl/:::eqn; remarkCrossref numbers them
    // and resolves @refs. remarkMath + rehypeKatex render the LaTeX.
    remarkPlugins: [remarkMath, remarkDirective, remarkCrossref],
    rehypePlugins: [rehypeKatex],
    shikiConfig: { theme: 'github-dark' },
  },
  // Force a single React copy across island chunks — a guard against the silent
  // multi-island hydration failure that appears when two React islands (e.g.
  // GrowthModel + RunPython) share one page.
  vite: { resolve: { dedupe: ['react', 'react-dom'] } },
});
