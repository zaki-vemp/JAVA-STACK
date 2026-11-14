import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { computeMvccTimeline, type IsolationMode } from '../../utils/simulatorEngine';

const ISOLATION_OPTIONS: { id: IsolationMode; label: string }[] = [
  { id: 'READ_COMMITTED', label: 'READ COMMITTED' },
  { id: 'REPEATABLE_READ', label: 'REPEATABLE READ' },
  { id: 'SERIALIZABLE', label: 'SERIALIZABLE' },
];

export function PostgresMvccSimulator() {
  const [isolation, setIsolation] = useState<IsolationMode>('READ_COMMITTED');
  const [stepIndex, setStepIndex] = useState<number>(4);

  const timeline = useMemo(() => computeMvccTimeline(isolation), [isolation]);
  const current = timeline[stepIndex];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="PostgreSQL isolation level">
          {ISOLATION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setIsolation(opt.id)}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap shrink-0 transition-colors ${
                isolation === opt.id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            disabled={stepIndex === 0}
            aria-label="Previous MVCC step"
            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Prev</span>
          </button>
          <button
            type="button"
            onClick={() => setStepIndex((s) => Math.min(timeline.length - 1, s + 1))}
            disabled={stepIndex === timeline.length - 1}
            aria-label="Next MVCC step"
            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setStepIndex(0)}
            aria-label="Reset MVCC timeline"
            className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Step selector strip */}
      <div className="grid grid-cols-5 gap-1.5">
        {timeline.map((item) => (
          <button
            key={item.stepIndex}
            type="button"
            onClick={() => setStepIndex(item.stepIndex)}
            className={`min-h-[38px] rounded-lg px-2 py-2 text-center text-xs transition-colors ${
              item.stepIndex === stepIndex
                ? 'bg-sky-100 text-sky-950 font-semibold dark:bg-sky-950/60 dark:text-sky-100'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800/60 dark:text-slate-400'
            }`}
          >
            <div className="font-mono tabular-nums">T{item.stepIndex}</div>
          </button>
        ))}
      </div>

      {/* Heap Page + Transaction Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs mb-3">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Heap Page 0 (accounts table)
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
              {current.tuples.length} physical tuple(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="py-2 pr-3">ctid</th>
                  <th className="py-2 pr-3">xmin</th>
                  <th className="py-2 pr-3">xmax</th>
                  <th className="py-2 pr-3">balance</th>
                  <th className="py-2">Visibility</th>
                </tr>
              </thead>
              <tbody>
                {current.tuples.map((tuple) => (
                  <tr
                    key={tuple.ctid}
                    className="border-b border-slate-200/70 last:border-0 dark:border-slate-700/60"
                  >
                    <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300 tabular-nums">{tuple.ctid}</td>
                    <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300 tabular-nums">{tuple.xmin}</td>
                    <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300 tabular-nums">
                      {tuple.xmax ?? '0 (null)'}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      ${tuple.balance}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`font-sans font-medium ${
                          tuple.status === 'live'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : tuple.status === 'uncommitted'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {tuple.status === 'live'
                          ? 'LIVE TUPLE'
                          : tuple.status === 'uncommitted'
                            ? 'UNCOMMITTED (xid 202)'
                            : 'DEAD (VACUUMABLE)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Concurrent Sessions</span>
            <span className="font-mono text-sky-700 dark:text-sky-400">{isolation}</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="font-mono text-slate-600 dark:text-slate-300">Tx A (xid 201) Read</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums" data-testid="mvcc-txa-read">
                {current.txAReadValue !== null ? `$${current.txAReadValue}` : 'Not read yet'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="font-mono text-slate-600 dark:text-slate-300">Tx B (xid 202) Writer</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 uppercase">
                {current.txBStatus}
              </span>
            </div>
          </div>

          <div className="pt-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Observed Behavior: </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{current.anomalyTag}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3.5 dark:border-slate-800">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          Step {current.stepIndex}: {current.title}
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {current.description}
        </p>
      </div>
    </div>
  );
}
