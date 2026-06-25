import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { u } from '../lib/paths';

// RSS feed at /blog/index.xml — same path the old Quarto site published, so
// existing subscribers keep receiving the weekly posts after the migration.
export async function GET(context) {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );
  // Fully-qualify the channel + item links against the deploy origin so they
  // point at /blog/... (not the bare github.io apex, which has no page).
  const origin = context.site; // https://mattzhou98.github.io
  return rss({
    title: 'matthew.zhou — Field Notes',
    description: 'Code × data × AI — field notes on building for the web, measuring what matters, and applying AI/ML.',
    site: new URL(u(), origin).href, // -> https://mattzhou98.github.io/blog/
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      categories: p.data.categories,
      link: new URL(u(`posts/${p.id}/`), origin).href,
    })),
  });
}
