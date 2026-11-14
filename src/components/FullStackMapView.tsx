import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { FullStackLayerNode } from '../types/curriculum';
import { CodeBlock } from './CodeBlock';
import { InlineProse } from './InlineProse';

interface FullStackMapViewProps {
  layers: FullStackLayerNode[];
  onJumpToDocs: (topicId: string) => void;
}

const LAYER_TO_TOPIC: Record<string, string> = {
  'fs-client': 'fullstack-integration-performance',
  'fs-security': 'spring-security-jwt',
  'fs-controller': 'java-modern-idioms',
  'fs-service-tx': 'spring-transactional-proxies',
  'fs-pool': 'java-jvm-virtual-threads',
  'fs-postgres': 'postgres-mvcc-isolation',
};

export function FullStackMapView({ layers, onJumpToDocs }: FullStackMapViewProps) {
  const [selectedId, setSelectedId] = useState<string>(layers[0].id);
  const active = layers.find((l) => l.id === selectedId) ?? layers[0];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800 space-y-1.5">
        <h1
          className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-slate-50"
          style={{ textWrap: 'balance' }}
        >
          End-to-End Full-Stack Request Architecture
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          Trace a production request from a React/TypeScript client through Spring Security 6, Spring Boot CGLIB proxies, Java 21 Virtual Threads / Kotlin Coroutines, HikariCP, and PostgreSQL MVCC storage.
        </p>
      </div>

      {/* Interactive Request Pipeline Strip (2-col on mobile so all 6 fit compactly above detail) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3" role="tablist" aria-label="Full-stack architectural layers">
        {layers.map((layer) => {
          const isSelected = layer.id === active.id;
          return (
            <button
              key={layer.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedId(layer.id)}
              className={`min-h-[84px] rounded-xl border p-3.5 text-left transition-colors flex flex-col justify-between gap-2 min-w-0 ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/80 text-slate-950 dark:border-sky-400 dark:bg-sky-950/40 dark:text-slate-50'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-xs font-mono">
                <span className="font-semibold text-sky-700 dark:text-sky-400 tabular-nums">
                  {layer.stepNumber}
                </span>
                <span className="text-slate-500 dark:text-slate-400 tabular-nums truncate">
                  {layer.latencyBudget.split(' ')[0]} ms
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-semibold leading-snug">{layer.layerName}</div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {layer.technologies.slice(0, 2).join(' · ')}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Layer Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/80 space-y-5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <div className="text-xs font-mono text-sky-700 dark:text-sky-400">
                Stage {active.stepNumber} · Target Budget: {active.latencyBudget}
              </div>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-950 dark:text-slate-50">
                {active.layerName}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onJumpToDocs(LAYER_TO_TOPIC[active.id] ?? 'spring-transactional-proxies')}
              className="inline-flex min-h-[42px] sm:min-h-[36px] w-fit items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0"
            >
              <span>Deep Dive Module</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Core Technologies:{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {active.technologies.join(' · ')}
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Architectural Responsibility
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <InlineProse text={active.theoreticalRole} />
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Production Checklist
            </h3>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
              {active.practicalResponsibilities.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <span className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-400 mt-0.5 tabular-nums shrink-0">
                    0{idx + 1}.
                  </span>
                  <span className="leading-relaxed min-w-0"><InlineProse text={item} /></span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg bg-rose-50/75 p-4 dark:bg-rose-950/30 space-y-1">
              <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                Common Failure Mode
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <InlineProse text={active.failureMode} />
              </p>
            </div>
            <div className="rounded-lg bg-sky-50/75 p-4 dark:bg-sky-950/30 space-y-1">
              <div className="text-xs font-semibold text-sky-800 dark:text-sky-300">
                Interview Verification Prompt
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <InlineProse text={active.interviewCheck} />
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 min-w-0">
          <CodeBlock
            label={active.codePreview.label}
            language={active.codePreview.language}
            code={active.codePreview.code}
          />
        </div>
      </div>
    </div>
  );
}
