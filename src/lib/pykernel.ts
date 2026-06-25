// Main-thread manager for the Pyodide Web Worker. One worker = one kernel =
// persistent globals (notebook variables survive between runs). On a runaway it
// hard-kills the worker with terminate(); the next run boots a fresh kernel.

export type RunResult = { out: string; html: string; figs: string[]; error: boolean; timedOut?: boolean };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (m: any) => void>();

function makeWorker(): Worker {
  const w = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent) => {
    const fn = pending.get(e.data.id);
    if (fn) fn(e.data);
  };
  return w;
}

function ensure(): Worker {
  if (!worker) worker = makeWorker();
  return worker;
}

// Terminate the kernel (kills any infinite loop) and drop pending handlers.
export function resetKernel() {
  if (worker) { worker.terminate(); worker = null; }
  pending.clear();
}

/**
 * Run code in the shared kernel. Two timeouts: a generous LOAD budget for the
 * download/boot phase, then a short EXEC budget once the worker signals it's
 * actually running user code — so a slow first download isn't mistaken for an
 * infinite loop, but a real infinite loop is killed fast.
 */
function _run(
  code: string,
  opts: { scientific?: boolean; execMs?: number; loadMs?: number } = {}
): Promise<RunResult> {
  const w = ensure();
  const id = ++seq;
  const execMs = opts.execMs ?? 15000;
  const loadMs = opts.loadMs ?? 120000;

  return new Promise<RunResult>((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (r: RunResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      pending.delete(id);
      resolve(r);
    };
    const kill = () => {
      resetKernel(); // hard-terminate the worker thread (kills the runaway)
      finish({ out: '', html: '', figs: [], error: true, timedOut: true });
    };

    pending.set(id, (m) => {
      if (m.type === 'started') {
        clearTimeout(timer);           // load phase done — now guard execution
        timer = setTimeout(kill, execMs);
        return;
      }
      if (m.type === 'result') {
        finish({ out: m.out, html: m.html, figs: m.figs, error: m.error });
      }
    });

    timer = setTimeout(kill, loadMs);  // load/boot/download budget
    w.postMessage({ id, code, scientific: !!opts.scientific });
  });
}

// Serialize all runs through the single shared worker — the kernel is
// single-threaded, so overlapping runs (even from different islands) would
// corrupt shared state and interleave stdout.
let chain: Promise<unknown> = Promise.resolve();
export function runInKernel(
  code: string,
  opts: { scientific?: boolean; execMs?: number; loadMs?: number } = {}
): Promise<RunResult> {
  const run = () => _run(code, opts);
  const p = chain.then(run, run);
  chain = p.then(() => {}, () => {});
  return p;
}
