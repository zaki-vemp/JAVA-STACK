import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPRING_BOOT_CHAPTERS,
  SPRING_BOOT_PROJECT_TREE,
} from '../data/springBootGuide';
import {
  filterSpringBootChapters,
  findProjectFileById,
  getJpaQueryComparison,
} from './springBootExplorer';

test('filterSpringBootChapters filters by category and search keyword accurately', () => {
  const all = filterSpringBootChapters(SPRING_BOOT_CHAPTERS, 'all', '');
  assert.equal(all.length, SPRING_BOOT_CHAPTERS.length);

  const dataOnly = filterSpringBootChapters(
    SPRING_BOOT_CHAPTERS,
    'Data & Persistence',
    ''
  );
  assert.equal(dataOnly.length, 1);
  assert.equal(dataOnly[0].id, 'sb-data-jpa');

  const queryMatch = filterSpringBootChapters(
    SPRING_BOOT_CHAPTERS,
    'all',
    'ProblemDetail'
  );
  assert.ok(queryMatch.some((c) => c.id === 'sb-web-mvc'));
});

test('findProjectFileById returns requested node or falls back to first file', () => {
  const serviceNode = findProjectFileById(SPRING_BOOT_PROJECT_TREE, 'file-service');
  assert.equal(serviceNode.layer, 'Domain / Service');

  const fallback = findProjectFileById(SPRING_BOOT_PROJECT_TREE, 'non-existent');
  assert.equal(fallback.id, SPRING_BOOT_PROJECT_TREE[0].id);
});

test('getJpaQueryComparison contrasts N+1 vs JOIN FETCH vs DTO Projection', () => {
  const naive = getJpaQueryComparison('naive-n-plus-one');
  const graph = getJpaQueryComparison('entity-graph');
  const dto = getJpaQueryComparison('dto-projection');

  assert.equal(naive.sqlCountFor50Orders, 51);
  assert.equal(graph.sqlCountFor50Orders, 1);
  assert.equal(dto.sqlCountFor50Orders, 1);
  assert.ok(dto.estimatedDbTimeMs < graph.estimatedDbTimeMs);
});
