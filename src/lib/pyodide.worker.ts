// Pyodide runs HERE, off the main thread — so a reader's infinite loop freezes
// only this worker (which the main thread can hard-kill via terminate()), never
// their tab. The kernel persists across messages, so notebook variables persist.
//
// Packages load LAZILY: each cell pulls only what it imports (loadPackagesFrom
// Imports), so a reader who runs only the figure cell never downloads pandas,
// and vice-versa — while matplotlib + pandas stay fully available.
/* eslint-disable */
let pyodide: any = null;
let booted: Promise<any> | null = null;
let bootInit = false;

const PYO = 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/';

// Boot-time setup that needs NO packages: force a non-DOM matplotlib backend via
// env var (so it's chosen whenever matplotlib is later imported, with no DOM in
// the worker), and define a figure-capture helper that lazily imports pyplot.
const BOOT = [
  'import os',
  'os.environ.setdefault("MPLBACKEND", "agg")',
  'import io as __io',
  'def __grab_figs__():',
  '    try:',
  '        import matplotlib.pyplot as plt',
  '    except Exception:',
  '        return []',
  '    out = []',
  '    for __n in plt.get_fignums():',
  '        __b = __io.StringIO(); plt.figure(__n).savefig(__b, format="svg"); out.append(__b.getvalue())',
  '    plt.close("all")',
  '    return out',
].join('\n');

async function boot() {
  if (!booted) {
    booted = (async () => {
      const mod: any = await import(/* @vite-ignore */ PYO + 'pyodide.mjs');
      pyodide = await mod.loadPyodide({ indexURL: PYO });
      return pyodide;
    })();
  }
  return booted;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, code, scientific } = e.data;
  try {
    await boot();
    if (scientific && !bootInit) {
      await pyodide.runPythonAsync(BOOT);   // env + helper only — no package downloads
      bootInit = true;
    }
    await pyodide.loadPackagesFromImports(code);   // lazy: only what THIS cell imports

    // Everything up to here is "loading" (downloads). Tell the main thread we're
    // about to run USER code, so it can start the short infinite-loop timeout.
    (self as any).postMessage({ id, type: 'started' });

    let buf = '', html = '', figs: string[] = [], error = false;
    pyodide.setStdout({ batched: (s: string) => (buf += s + '\n') });
    pyodide.setStderr({ batched: (s: string) => (buf += s + '\n') });
    try {
      const res = await pyodide.runPythonAsync(code);
      if (res != null && (typeof res === 'object' || typeof res === 'function')) {
        try { const rh = res._repr_html_; if (rh) { try { html = rh(); } finally { try { rh.destroy(); } catch (x) {} } } } catch (x) {}
        try { res.destroy && res.destroy(); } catch (x) {}
      }
    } catch (err) {
      buf += (buf ? '\n' : '') + String(err);
      error = true;
    } finally {
      if (scientific) {
        try { const fp = await pyodide.runPythonAsync('__grab_figs__()'); figs = fp.toJs(); fp.destroy(); } catch (x) {}
      }
    }
    (self as any).postMessage({ id, type: 'result', out: buf.replace(/\s+$/, ''), html, figs, error });
  } catch (err) {
    (self as any).postMessage({ id, type: 'result', out: String(err), html: '', figs: [], error: true });
  }
};
