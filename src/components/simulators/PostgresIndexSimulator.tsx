import { useState } from 'react';

interface IndexScenario {
  id: string;
  label: string;
  querySql: string;
  recommendedIndex: string;
  indexType: string;
  scanNode: string;
  buffersHit: string;
  latency: string;
  indexSize: string;
  whyItWins: string;
}

const INDEX_SCENARIOS: IndexScenario[] = [
  {
    id: 'composite-partial',
    label: 'Tenant Active Orders',
    querySql: `SELECT total_cents, currency FROM orders\nWHERE tenant_id = $1 AND status = 'OPEN'\nORDER BY created_at DESC LIMIT 20;`,
    recommendedIndex: `CREATE INDEX CONCURRENTLY idx_orders_open_tenant\nON orders (tenant_id, created_at DESC)\nINCLUDE (total_cents, currency)\nWHERE status = 'OPEN';`,
    indexType: 'Partial + Covering B-Tree',
    scanNode: 'Index Only Scan Backward using idx_orders_open_tenant',
    buffersHit: 'shared hit=4 (0 heap fetches)',
    latency: '0.18 ms',
    indexSize: '14 MB (vs 420 MB full B-Tree)',
    whyItWins: 'Filtering WHERE status = \'OPEN\' shrinks the index by 95%, while INCLUDE(total_cents, currency) satisfies the SELECT list straight from leaf pages.',
  },
  {
    id: 'gin-jsonb',
    label: 'JSONB Containment (@>)',
    querySql: `SELECT id, occurred_at FROM domain_events\nWHERE payload @> '{"payment":{"provider":"stripe"}}';`,
    recommendedIndex: `CREATE INDEX CONCURRENTLY idx_events_payload_gin\nON domain_events USING GIN (payload jsonb_path_ops);`,
    indexType: 'GIN (jsonb_path_ops)',
    scanNode: 'Bitmap Heap Scan -> Bitmap Index Scan on idx_events_payload_gin',
    buffersHit: 'shared hit=28',
    latency: '1.15 ms',
    indexSize: '88 MB',
    whyItWins: 'Standard B-Tree cannot index arbitrary nested JSON keys. `jsonb_path_ops` hashes full key-value paths for fast `@>` containment queries at ~40% smaller footprint than default `jsonb_ops`.',
  },
  {
    id: 'brin-timeseries',
    label: 'Append-Only Audit Logs',
    querySql: `SELECT event_id, actor_id FROM audit_logs\nWHERE created_at >= now() - interval '6 hours';`,
    recommendedIndex: `CREATE INDEX CONCURRENTLY idx_audit_created_brin\nON audit_logs USING BRIN (created_at) WITH (pages_per_range = 64);`,
    indexType: 'BRIN (Block Range Index)',
    scanNode: 'Bitmap Heap Scan -> Bitmap Index Scan on idx_audit_created_brin',
    buffersHit: 'shared hit=190',
    latency: '2.40 ms',
    indexSize: '48 KB (vs 2.1 GB B-Tree)',
    whyItWins: 'Because `audit_logs` is append-only, `created_at` correlates tightly with physical heap page order. BRIN stores only min/max per 64 pages—cutting index RAM & write overhead by 99%.',
  },
];

export function PostgresIndexSimulator() {
  const [selectedId, setSelectedId] = useState<string>(INDEX_SCENARIOS[0].id);
  const active = INDEX_SCENARIOS.find((s) => s.id === selectedId) ?? INDEX_SCENARIOS[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 w-fit max-w-full" role="group" aria-label="PostgreSQL workload selector">
        {INDEX_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => setSelectedId(scenario.id)}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              scenario.id === active.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg bg-slate-950 p-4 text-slate-100 font-mono text-xs space-y-3 min-w-0">
          <div className="text-slate-400 uppercase tracking-wide text-[11px]">Target SQL Workload</div>
          <pre className="whitespace-pre-wrap break-words leading-5 text-sky-200">{active.querySql}</pre>
          <div className="border-t border-slate-800 pt-3 text-slate-400 uppercase tracking-wide text-[11px]">
            Optimal DDL Index
          </div>
          <pre className="whitespace-pre-wrap break-words leading-5 text-emerald-300">{active.recommendedIndex}</pre>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 flex flex-col justify-between space-y-4 min-w-0">
          <div className="space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">Access Method</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">{active.indexType}</span>
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">Planner Node</span>
              <span className="font-mono text-sky-700 dark:text-sky-400 text-right break-words">{active.scanNode}</span>
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">EXPLAIN Buffers</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums text-right">{active.buffersHit}</span>
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">Execution Time (50M rows)</span>
              <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums text-right">
                {active.latency}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">Index Disk Footprint</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums text-right">{active.indexSize}</span>
            </div>
          </div>

          <p className="border-t border-slate-200 pt-3 text-xs text-slate-700 leading-relaxed dark:border-slate-700 dark:text-slate-300">
            {active.whyItWins}
          </p>
        </div>
      </div>
    </div>
  );
}
