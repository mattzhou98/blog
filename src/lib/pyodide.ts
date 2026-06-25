// One Pyodide kernel, shared across every Python island on the page. Because
// all cells run in the same interpreter's globals(), variables defined in one
// cell persist into the next — that's what makes the notebook work.
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/';

let pyPromise: Promise<any> | null = null;

export function getPyodide(): Promise<any> {
  if (pyPromise) return pyPromise;
  pyPromise = (async () => {
    if (!(window as any).loadPyodide) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement('script');
        s.src = PYODIDE + 'pyodide.js';
        s.onload = () => res();
        s.onerror = () => rej(new Error('Could not load Pyodide from CDN'));
        document.head.appendChild(s);
      });
    }
    return (window as any).loadPyodide({ indexURL: PYODIDE });
  })();
  return pyPromise;
}

// "Restart kernel": drop the instance so the next getPyodide() boots a fresh one
// with empty globals.
export function resetPyodide() {
  pyPromise = null;
}
