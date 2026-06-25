import { useEffect, useState } from 'react';

// Track the active site theme (the [data-theme] attribute on <html>, toggled by
// BaseLayout) and update when it changes — so theme-aware islands (diagrams) can
// re-render live when the reader flips the toggle.
export function useTheme(): 'light' | 'dark' {
  // Lazy-init from the DOM so the first client render already matches the active
  // theme (the islands are client:visible, so this runs client-side only) — avoids
  // a light→dark flash on a dark-theme load. The effect keeps it live on toggle.
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setTheme(el.dataset.theme === 'dark' ? 'dark' : 'light');
    read(); // sync to the real theme after hydration
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}
