import { useState } from 'react';
import { RotateCcw, Zap } from 'lucide-react';

type ScopeMode = 'coroutineScope' | 'supervisorScope';

export function KotlinCoroutinesSimulator() {
  const [scopeMode, setScopeMode] = useState<ScopeMode>('coroutineScope');
  const [childBFailed, setChildBFailed] = useState<boolean>(false);

  const parentState =
    childBFailed && scopeMode === 'coroutineScope' ? 'FAILED (Propagated)' : 'ACTIVE / AWAITING';
  const childAState =
    childBFailed && scopeMode === 'coroutineScope'
      ? 'CANCELLED (Sibling Aborted)'
      : 'COMPLETED (Profile Loaded)';
  const childBState = childBFailed ? 'FAILED (HttpTimeoutException)' : 'ACTIVE (Fetching Orders)';
  const childCState =
    childBFailed && scopeMode === 'coroutineScope'
      ? 'CANCELLED (Sibling Aborted)'
      : 'COMPLETED (Badges Loaded)';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="inline-flex w-fit rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Kotlin coroutine scope type">
          {(['coroutineScope', 'supervisorScope'] as ScopeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setScopeMode(mode)}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap shrink-0 transition-colors ${
                scopeMode === mode
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setChildBFailed(true)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 whitespace-nowrap shrink-0 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Fail Child B (Orders API)</span>
          </button>
          <button
            type="button"
            onClick={() => setChildBFailed(false)}
            aria-label="Reset coroutine tree"
            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Job Hierarchy Tree (flat surface hierarchy) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
          <div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">Parent Scope</div>
            <div className="text-sm font-semibold font-mono text-slate-900 dark:text-slate-100">
              {scopeMode} ({scopeMode === 'coroutineScope' ? 'Job' : 'SupervisorJob'})
            </div>
          </div>
          <span
            className={`text-xs font-mono font-semibold ${
              parentState.startsWith('FAILED')
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {parentState}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: 'Child A: async { fetchProfile() }', state: childAState },
            { name: 'Child B: async { fetchOrders() }', state: childBState },
            { name: 'Child C: async { fetchBadges() }', state: childCState },
          ].map((child) => {
            const isFailed = child.state.startsWith('FAILED');
            const isCancelled = child.state.startsWith('CANCELLED');
            return (
              <div
                key={child.name}
                className={`rounded-lg p-3.5 text-xs space-y-1.5 min-w-0 ${
                  isFailed
                    ? 'bg-rose-50/80 dark:bg-rose-950/35'
                    : isCancelled
                      ? 'bg-amber-50/80 dark:bg-amber-950/35'
                      : 'bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                <div className="font-mono font-medium text-slate-800 dark:text-slate-200 break-words">{child.name}</div>
                <div
                  className={`font-mono font-semibold ${
                    isFailed
                      ? 'text-rose-700 dark:text-rose-400'
                      : isCancelled
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {child.state}
                </div>
              </div>
            );
          })}
        </div>

        <p className="border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300 leading-relaxed">
          {!childBFailed
            ? 'All three child coroutines run concurrently on Dispatchers.IO. Click "Fail Child B" to compare cancellation propagation.'
            : scopeMode === 'coroutineScope'
              ? 'With standard Job (coroutineScope), Child B failing immediately cancels the parent and aborts Child A & Child C—preventing wasted downstream calls when the whole response cannot succeed.'
              : 'With SupervisorJob (supervisorScope), Child B failure is isolated. Child A and Child C finish normally, allowing graceful partial fallback.'}
        </p>
      </div>
    </div>
  );
}
