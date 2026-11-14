import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export function JvmVirtualThreadsSimulator() {
  const [concurrentRequests, setConcurrentRequests] = useState<number>(1200);
  const [usesSynchronizedPinning, setUsesSynchronizedPinning] = useState<boolean>(false);

  const platformPoolLimit = 200; // Typical Tomcat max-threads
  const carrierCores = 8;

  const platformQueued = Math.max(0, concurrentRequests - platformPoolLimit);
  const platformStackMb = Math.min(concurrentRequests, platformPoolLimit) * 1; // ~1MB per OS thread
  const virtualHeapMb = Math.round((concurrentRequests * 3) / 1024); // ~3KB per parked continuation
  const effectiveThroughput = usesSynchronizedPinning
    ? `${carrierCores} concurrent I/O calls (CARRIER PINNED)`
    : `${concurrentRequests} concurrent I/O calls (Unmounted cleanly)`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <label htmlFor="vt-concurrency-slider" className="font-medium text-slate-700 dark:text-slate-300">
              Concurrent Blocking I/O Requests (200ms JDBC / HTTP wait)
            </label>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
              {concurrentRequests} reqs
            </span>
          </div>
          <input
            id="vt-concurrency-slider"
            type="range"
            min={50}
            max={4000}
            step={50}
            value={concurrentRequests}
            onChange={(e) => setConcurrentRequests(Number(e.target.value))}
            className="w-full accent-sky-600 cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => setUsesSynchronizedPinning((v) => !v)}
          className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
            usesSynchronizedPinning
              ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-200'
              : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Lock Mode: {usesSynchronizedPinning ? 'synchronized (Pinned)' : 'ReentrantLock (Unmounted)'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Platform Threads Panel */}
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Platform Thread Pool (1:1 OS Threads)
            </span>
            <span
              className={`text-xs font-mono font-semibold shrink-0 ${
                platformQueued > 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {platformQueued > 0 ? 'POOL SATURATED' : 'WITHIN POOL'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
              <span>Active Tomcat Worker Threads</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                {Math.min(concurrentRequests, platformPoolLimit)} / {platformPoolLimit}
              </span>
            </div>
            <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
              <span>Requests Stalled in Accept Queue</span>
              <span className="font-mono font-semibold text-rose-700 dark:text-rose-400 tabular-nums shrink-0">
                {platformQueued} queued
              </span>
            </div>
            <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
              <span>Native OS Stack Memory (~1 MB/thread)</span>
              <span className="font-mono text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                ~{platformStackMb} MB native
              </span>
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
            <div
              className={`h-full transition-all ${
                platformQueued > 0 ? 'bg-rose-600' : 'bg-sky-600'
              }`}
              style={{ width: `${Math.min(100, Math.round((concurrentRequests / platformPoolLimit) * 100))}%` }}
            />
          </div>
        </div>

        {/* Virtual Threads Panel */}
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Java 21 Virtual Threads (M:N Loom)
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-mono font-semibold shrink-0 ${
                usesSynchronizedPinning
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {usesSynchronizedPinning ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>PINNED</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>NON-BLOCKING</span>
                </>
              )}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
              <span>OS Carrier Threads (ForkJoinPool)</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                {carrierCores} CPU cores
              </span>
            </div>
            <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
              <span>Heap Continuation Memory (~3 KB/parked)</span>
              <span className="font-mono text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                ~{Math.max(1, virtualHeapMb)} MB heap
              </span>
            </div>
            <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
              <span>Effective Concurrency</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100 text-right">
                {effectiveThroughput}
              </span>
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
            <div
              className={`h-full transition-all ${
                usesSynchronizedPinning ? 'bg-amber-500 w-1/12' : 'bg-emerald-600 w-full'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
