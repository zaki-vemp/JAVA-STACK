import { useState } from 'react';
import { ArrowRight, RotateCcw, StepForward } from 'lucide-react';

type CallMode = 'external' | 'self-invocation';
type PropagationMode = 'REQUIRED' | 'REQUIRES_NEW';

export function SpringProxySimulator() {
  const [callMode, setCallMode] = useState<CallMode>('external');
  const [propagation, setPropagation] = useState<PropagationMode>('REQUIRES_NEW');
  const [step, setStep] = useState<number>(2);

  const steps =
    callMode === 'external'
      ? [
          {
            label: '1. Outer Transaction Active',
            detail:
              'OrderPlacementService.placeOrder() entered through CGLIB Proxy. Connection #1 checked out from HikariCP and bound to ThreadLocal.',
            proxyActive: true,
            connectionsHeld: 1,
          },
          {
            label: '2. Collaborator Proxy Intercepted',
            detail:
              propagation === 'REQUIRES_NEW'
                ? 'auditLogService.recordAttempt() hits AuditLogService$$SpringCGLIB. TransactionInterceptor suspends Tx #1.'
                : 'auditLogService.recordAttempt() hits AuditLogService$$SpringCGLIB. Joins existing ThreadLocal Tx #1.',
            proxyActive: true,
            connectionsHeld: propagation === 'REQUIRES_NEW' ? 2 : 1,
          },
          {
            label: '3. Transaction Outcome',
            detail:
              propagation === 'REQUIRES_NEW'
                ? 'Connection #2 commits audit row independently even if outer Order transaction later throws RuntimeException and rolls back Connection #1.'
                : 'Audit and Order share Connection #1. If Order throws RuntimeException, both roll back atomically.',
            proxyActive: true,
            connectionsHeld: propagation === 'REQUIRES_NEW' ? 2 : 1,
          },
        ]
      : [
          {
            label: '1. Outer Transaction Active',
            detail:
              'OrderPlacementService.placeOrder() entered through CGLIB Proxy. Connection #1 bound to ThreadLocal.',
            proxyActive: true,
            connectionsHeld: 1,
          },
          {
            label: '2. Direct this.recordAttempt() Call',
            detail:
              'BYTECODE BYPASS: `this.recordAttempt()` invokes the raw target method directly—completely skipping the Spring CGLIB proxy!',
            proxyActive: false,
            connectionsHeld: 1,
          },
          {
            label: '3. Silent Annotation Failure',
            detail:
              `@Transactional(propagation = ${propagation}) is IGNORED. Audit runs inside Tx #1. If placeOrder() rolls back, the audit log disappears too!`,
            proxyActive: false,
            connectionsHeld: 1,
          },
        ];

  const activeStep = steps[Math.min(step, steps.length - 1)];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Invocation path">
            <button
              type="button"
              onClick={() => {
                setCallMode('external');
                setStep(2);
              }}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                callMode === 'external'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              External Bean Call
            </button>
            <button
              type="button"
              onClick={() => {
                setCallMode('self-invocation');
                setStep(2);
              }}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                callMode === 'self-invocation'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Self-Invocation (this.)
            </button>
          </div>

          <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Transaction propagation">
            {(['REQUIRED', 'REQUIRES_NEW'] as PropagationMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPropagation(mode)}
                className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap shrink-0 transition-colors ${
                  propagation === mode
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) % steps.length)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors"
          >
            <StepForward className="h-3.5 w-3.5" />
            <span>Step ({step + 1}/3)</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            aria-label="Reset proxy simulator"
            className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Call Pipeline (flat surface panels, no nested card borders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60 min-w-0">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">Caller</div>
          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            OrderPlacementService
          </div>
          <div className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-300 break-all">
            {callMode === 'external'
              ? 'auditLogService.recordAttempt()'
              : 'this.recordAttempt()'}
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            ThreadLocal: Conn #1 active
          </div>
        </div>

        <div
          className={`rounded-lg p-4 transition-colors min-w-0 ${
            activeStep.proxyActive
              ? 'bg-emerald-50/80 dark:bg-emerald-950/35'
              : 'bg-rose-50/80 dark:bg-rose-950/35'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-300">CGLIB Proxy</span>
            <span
              className={`font-semibold ${
                activeStep.proxyActive
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {activeStep.proxyActive ? 'INTERCEPTED' : 'BYPASSED'}
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <ArrowRight className="h-4 w-4 shrink-0" />
            <span className="truncate">TransactionInterceptor</span>
          </div>
          <div className="mt-2 text-xs text-slate-700 dark:text-slate-300">
            {activeStep.proxyActive
              ? `Applies @Transactional(${propagation})`
              : 'Direct INVOKEVIRTUAL on raw target instance'}
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60 min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">HikariCP Pool</span>
            <span className="font-semibold text-sky-700 dark:text-sky-400 tabular-nums">
              {activeStep.connectionsHeld} Conn Held
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            PostgreSQL Session
          </div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            {activeStep.connectionsHeld === 2
              ? 'Conn #1 suspended; Conn #2 executing independent INSERT.'
              : 'Single Conn #1 executing both Order and Audit SQL.'}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3.5 dark:border-slate-800">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {activeStep.label}
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {activeStep.detail}
        </p>
      </div>
    </div>
  );
}
