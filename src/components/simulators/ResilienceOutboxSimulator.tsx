import { useState } from 'react';
import { CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react';
import {
  INITIAL_CIRCUIT_SNAPSHOT,
  stepCircuitBreaker,
  type CircuitBreakerSnapshot,
} from '../../utils/simulatorEngine';

export function ResilienceOutboxSimulator() {
  const [cb, setCb] = useState<CircuitBreakerSnapshot>(INITIAL_CIRCUIT_SNAPSHOT);

  const stateBadgeStyle =
    cb.state === 'CLOSED'
      ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/35'
      : cb.state === 'OPEN'
        ? 'text-rose-800 dark:text-rose-300 bg-rose-50/90 dark:bg-rose-950/35'
        : 'text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/35';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCb((s) => stepCircuitBreaker(s, 'success'))}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap shrink-0 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Call Succeeds</span>
          </button>
          <button
            type="button"
            onClick={() => setCb((s) => stepCircuitBreaker(s, 'failure'))}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 whitespace-nowrap shrink-0 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Inject Failure</span>
          </button>
          <button
            type="button"
            onClick={() => setCb((s) => stepCircuitBreaker(s, 'wait_cooldown'))}
            disabled={cb.state !== 'OPEN'}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Wait Cooldown</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCb(stepCircuitBreaker(cb, 'reset'))}
          aria-label="Reset circuit breaker"
          className="inline-flex min-h-[38px] w-fit items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-lg p-4 ${stateBadgeStyle}`}>
          <div className="text-xs font-mono opacity-80">Circuit State</div>
          <div className="mt-1 text-xl font-bold font-mono">{cb.state}</div>
          <div className="mt-2 text-xs">Threshold: 50% over 6-call sliding window</div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Sliding Window (Last 6 Calls)
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {cb.windowResults.map((ok, i) => (
              <span
                key={i}
                className={`inline-flex h-7 w-8 items-center justify-center rounded font-mono text-xs font-semibold ${
                  ok
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {ok ? 'OK' : 'ERR'}
              </span>
            ))}
          </div>
          <div className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
            Failure Rate: {cb.failureRatePercent}%
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Protection Telemetry
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-400">Short-circuited calls</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {cb.blockedCalls}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-400">Fallbacks executed</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {cb.fallbackCalls}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-slate-100">Latest Transition: </span>
        {cb.lastEvent}
      </div>
    </div>
  );
}
