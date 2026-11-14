import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBugSelection, evaluateSyntaxDrill } from './syntaxEvaluator';
import { DifficultyLevel, TechTrack, type SyntaxDrill } from '../types/curriculum';

const sampleDrill: SyntaxDrill = {
  id: 'drill-test-tx',
  track: TechTrack.SpringBoot,
  mode: 'write',
  title: 'Spring Transactional Rollback & Propagation',
  language: 'java',
  level: DifficultyLevel.Senior,
  prompt: 'Annotate a Spring service method to start a new independent transaction and rollback on checked exceptions.',
  starterCode: '',
  solutionCode: '',
  explanation: '',
  checks: [
    {
      id: 'has-tx',
      description: 'Uses @Transactional annotation',
      pattern: '@Transactional',
      required: true,
      errorHint: 'Missing @Transactional annotation.',
    },
    {
      id: 'has-requires-new',
      description: 'Configures Propagation.REQUIRES_NEW',
      pattern: 'propagation\\s*=\\s*Propagation\\.REQUIRES_NEW',
      required: true,
      errorHint: 'Must set propagation = Propagation.REQUIRES_NEW.',
    },
    {
      id: 'has-rollback',
      description: 'Configures rollbackFor for checked exceptions',
      pattern: 'rollbackFor\\s*=\\s*Exception\\.class',
      required: true,
      errorHint: 'Specify rollbackFor = Exception.class so checked exceptions roll back.',
    },
    {
      id: 'no-private',
      description: 'Method is not private (Spring proxy requirement)',
      pattern: '\\bprivate\\b',
      required: false,
      errorHint: 'Do not make @Transactional methods private; Spring AOP proxies cannot intercept them.',
    },
  ],
};

test('evaluateSyntaxDrill rejects empty submissions cleanly', () => {
  const outcome = evaluateSyntaxDrill('   ', sampleDrill);
  assert.equal(outcome.passed, false);
  assert.equal(outcome.scorePercent, 0);
  assert.equal(outcome.passedCount, 0);
});

test('evaluateSyntaxDrill passes valid Spring Boot transactional code', () => {
  const validCode = `
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public void recordAuditEvent(AuditEntry entry) throws IOException {
      auditRepository.save(entry);
    }
  `;
  const outcome = evaluateSyntaxDrill(validCode, sampleDrill);
  assert.equal(outcome.passed, true);
  assert.equal(outcome.scorePercent, 100);
  assert.equal(outcome.passedCount, 4);
});

test('evaluateSyntaxDrill detects private method anti-pattern', () => {
  const buggyCode = `
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    private void recordAuditEvent(AuditEntry entry) {
      auditRepository.save(entry);
    }
  `;
  const outcome = evaluateSyntaxDrill(buggyCode, sampleDrill);
  assert.equal(outcome.passed, false);
  assert.equal(outcome.passedCount, 3);
  const privateCheck = outcome.results.find((r) => r.id === 'no-private');
  assert.equal(privateCheck?.passed, false);
});

test('evaluateBugSelection returns accurate diagnosis feedback', () => {
  const bugDrill: SyntaxDrill = {
    ...sampleDrill,
    mode: 'spot-bug',
    bugOptions: [
      { id: 'a', label: 'Missing @Bean', isCorrect: false, rationale: 'Not related.' },
      { id: 'b', label: 'Self-invocation bypasses proxy', isCorrect: true, rationale: 'Correct: calling this.method() bypasses CGLIB proxy.' },
    ],
  };

  assert.equal(evaluateBugSelection(bugDrill, null).answered, false);
  assert.equal(evaluateBugSelection(bugDrill, 'a').isCorrect, false);
  assert.equal(evaluateBugSelection(bugDrill, 'b').isCorrect, true);
});
