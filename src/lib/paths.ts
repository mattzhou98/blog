// Internal-URL helper for the GitHub Pages project base (`/blog`).
//
// Astro serves this site under a base path but does NOT rewrite hardcoded link
// strings — so every in-app link and public/ asset reference must go through
// here. Note: `import.meta.env.BASE_URL` is `/blog` WITHOUT a trailing slash in
// this Astro version (it can be `/blog/` or `/` in others), so we normalize the
// join to exactly one slash regardless.
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, ''); // -> '/blog' (or '' if no base)

/** Join a path onto the site base, e.g. u('posts/welcome/') -> '/blog/posts/welcome/'; u() -> '/blog/'. */
export const u = (path = ''): string => BASE + '/' + String(path).replace(/^\/+/, '');
