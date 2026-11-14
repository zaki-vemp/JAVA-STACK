import { SimulatorKind } from '../../types/curriculum';
import { JvmVirtualThreadsSimulator } from './JvmVirtualThreadsSimulator';
import { KotlinCoroutinesSimulator } from './KotlinCoroutinesSimulator';
import { PostgresIndexSimulator } from './PostgresIndexSimulator';
import { PostgresMvccSimulator } from './PostgresMvccSimulator';
import { ResilienceOutboxSimulator } from './ResilienceOutboxSimulator';
import { SpringProxySimulator } from './SpringProxySimulator';

interface SimulatorHostProps {
  kind: SimulatorKind;
  title: string;
  summary: string;
}

export function SimulatorHost({ kind, title, summary }: SimulatorHostProps) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/70 space-y-5"
    >
      <div className="space-y-1.5">
        <div className="text-xs font-mono font-semibold text-sky-700 dark:text-sky-400">
          Interactive Runtime Visual
        </div>
        <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-slate-50">
          {title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          {summary}
        </p>
      </div>

      <div>
        {kind === SimulatorKind.SpringProxy && <SpringProxySimulator />}
        {kind === SimulatorKind.PostgresMvcc && <PostgresMvccSimulator />}
        {kind === SimulatorKind.JvmVirtualThreads && <JvmVirtualThreadsSimulator />}
        {kind === SimulatorKind.PostgresIndexes && <PostgresIndexSimulator />}
        {kind === SimulatorKind.KotlinCoroutines && <KotlinCoroutinesSimulator />}
        {kind === SimulatorKind.ResilienceOutbox && <ResilienceOutboxSimulator />}
      </div>
    </section>
  );
}
