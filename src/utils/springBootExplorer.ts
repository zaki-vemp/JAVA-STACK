import type { SpringBootChapter, SpringBootFileNode } from '../types/curriculum';

export interface JpaQueryComparison {
  mode: 'naive-n-plus-one' | 'entity-graph' | 'dto-projection';
  label: string;
  sqlCountFor50Orders: number;
  estimatedDbTimeMs: number;
  memoryFootprint: string;
  sampleSql: string;
  explanation: string;
}

export function filterSpringBootChapters(
  chapters: SpringBootChapter[],
  category: string,
  query: string
): SpringBootChapter[] {
  const normalized = query.trim().toLowerCase();
  return chapters.filter((ch) => {
    if (category !== 'all' && ch.category !== category) return false;
    if (!normalized) return true;
    const haystack = [
      ch.title,
      ch.subtitle,
      ch.category,
      ch.summaryTakeaway,
      ...ch.theoryParagraphs,
      ...ch.architectureRules,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function findProjectFileById(
  files: SpringBootFileNode[],
  fileId: string
): SpringBootFileNode {
  return files.find((f) => f.id === fileId) ?? files[0];
}

export function getJpaQueryComparison(
  mode: JpaQueryComparison['mode']
): JpaQueryComparison {
  if (mode === 'naive-n-plus-one') {
    return {
      mode,
      label: 'Lazy Loop (N+1 Bug)',
      sqlCountFor50Orders: 51,
      estimatedDbTimeMs: 42.5,
      memoryFootprint: 'High (50+ managed entities & snapshots)',
      sampleSql: `-- 1 query for orders, then 50 sequential round-trips:\nSELECT * FROM orders WHERE customer_id = $1 LIMIT 50;\nSELECT * FROM order_items WHERE order_id = $1; -- x50`,
      explanation:
        'Iterating over `order.getLineItems()` inside a loop (or with OSIV enabled during JSON serialization) fires 1 parent query + 50 child round-trips.',
    };
  }
  if (mode === 'entity-graph') {
    return {
      mode,
      label: '@EntityGraph / JOIN FETCH',
      sqlCountFor50Orders: 1,
      estimatedDbTimeMs: 3.2,
      memoryFootprint: 'Medium (full entity graph in PersistenceContext)',
      sampleSql: `SELECT o.*, i.*\nFROM orders o\nLEFT JOIN order_items i ON i.order_id = o.id\nWHERE o.id = $1;`,
      explanation:
        'Ideal when mutating an aggregate inside a `@Transactional` write method: loads parent and children in 1 SQL join with dirty checking intact.',
    };
  }
  return {
    mode,
    label: 'DTO Projection (Read API)',
    sqlCountFor50Orders: 1,
    estimatedDbTimeMs: 1.4,
    memoryFootprint: 'Minimal (0 PersistenceContext snapshots)',
    sampleSql: `SELECT o.id, o.status, o.total_cents\nFROM orders o\nWHERE o.customer_id = $1\nORDER BY o.created_at DESC LIMIT 20;`,
    explanation:
      'Best for read endpoints: selects only required columns directly into lightweight Java records or interfaces, skipping entity hydration completely.',
  };
}
