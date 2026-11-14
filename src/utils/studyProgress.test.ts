import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMvccTimeline, INITIAL_CIRCUIT_SNAPSHOT, stepCircuitBreaker } from './simulatorEngine';
import {
  computeOverallReadiness,
  DEFAULT_PROGRESS_STATE,
  generateMockInterviewSet,
} from './studyProgress';
import { DifficultyLevel, MasteryStatus, TechTrack, type InterviewQuestion } from '../types/curriculum';
import { DOC_TOPICS } from '../data/topics';
import { INTERVIEW_QUESTIONS } from '../data/interviewQuestions';
import { SPRING_BOOT_CHAPTERS } from '../data/springBootGuide';
import { SYNTAX_DRILLS } from '../data/syntaxDrills';
import { evaluateBugSelection, evaluateSyntaxDrill } from './syntaxEvaluator';

test('MVCC timeline diverges at step 4 between READ_COMMITTED and REPEATABLE_READ', () => {
  const rc = computeMvccTimeline('READ_COMMITTED');
  const rr = computeMvccTimeline('REPEATABLE_READ');

  assert.equal(rc[4].txAReadValue, 800);
  assert.equal(rr[4].txAReadValue, 500);
  assert.equal(rc[2].tuples.length, 2);
  assert.equal(rc[2].tuples[1].status, 'uncommitted');
});

test('Circuit breaker trips OPEN on high failure rate and recovers via HALF_OPEN', () => {
  let state = INITIAL_CIRCUIT_SNAPSHOT;
  // Inject 4 failures into window of 6
  state = stepCircuitBreaker(state, 'failure', 50, 6);
  state = stepCircuitBreaker(state, 'failure', 50, 6);
  state = stepCircuitBreaker(state, 'failure', 50, 6);
  assert.equal(state.state, 'OPEN');

  // Calling while OPEN short-circuits
  state = stepCircuitBreaker(state, 'success', 50, 6);
  assert.equal(state.blockedCalls, 1);
  assert.equal(state.state, 'OPEN');

  // Cooldown -> HALF_OPEN -> 2 successes -> CLOSED
  state = stepCircuitBreaker(state, 'wait_cooldown', 50, 6);
  assert.equal(state.state, 'HALF_OPEN');
  state = stepCircuitBreaker(state, 'success', 50, 6);
  assert.equal(state.state, 'HALF_OPEN');
  state = stepCircuitBreaker(state, 'success', 50, 6);
  assert.equal(state.state, 'CLOSED');
});

test('computeOverallReadiness and generateMockInterviewSet compute accurate results', () => {
  const mockQuestions: InterviewQuestion[] = [
    {
      id: 'q1',
      track: TechTrack.Java,
      level: DifficultyLevel.Mid,
      topicTag: 'JVM',
      prompt: 'P1',
      whatTheyTest: 'W1',
      theoreticalAnswer: 'T1',
      practicalAnswer: 'A1',
      followUps: [],
    },
    {
      id: 'q2',
      track: TechTrack.Kotlin,
      level: DifficultyLevel.Senior,
      topicTag: 'Coroutines',
      prompt: 'P2',
      whatTheyTest: 'W2',
      theoreticalAnswer: 'T2',
      practicalAnswer: 'A2',
      followUps: [],
    },
    {
      id: 'q3',
      track: TechTrack.PostgreSQL,
      level: DifficultyLevel.Staff,
      topicTag: 'MVCC',
      prompt: 'P3',
      whatTheyTest: 'W3',
      theoreticalAnswer: 'T3',
      practicalAnswer: 'A3',
      followUps: [],
    },
  ];

  const readiness = computeOverallReadiness([], [], mockQuestions, {
    ...DEFAULT_PROGRESS_STATE,
    questionStatus: { q1: MasteryStatus.Mastered, q2: MasteryStatus.Review },
  });

  assert.equal(readiness.completedCount, 1);
  assert.equal(readiness.totalCount, 3);
  assert.equal(readiness.percent, 33);

  const selected = generateMockInterviewSet(mockQuestions, 'all', 2);
  assert.equal(selected.length, 2);
});

test('All topic and Spring Boot chapter cross-references resolve to real drills and questions', () => {
  const drillIds = new Set(SYNTAX_DRILLS.map((d) => d.id));
  const questionIds = new Set(INTERVIEW_QUESTIONS.map((q) => q.id));

  for (const topic of DOC_TOPICS) {
    assert.ok(drillIds.has(topic.linkedDrillId), `Missing linkedDrillId ${topic.linkedDrillId} on topic ${topic.id}`);
    for (const qid of topic.linkedQuestionIds) {
      assert.ok(questionIds.has(qid), `Missing linkedQuestionId ${qid} on topic ${topic.id}`);
    }
  }

  for (const chapter of SPRING_BOOT_CHAPTERS) {
    assert.ok(
      drillIds.has(chapter.linkedDrillId),
      `Missing linkedDrillId ${chapter.linkedDrillId} on Spring Boot chapter ${chapter.id}`
    );
  }
});

test('Every syntax drill solution passes 100% and every spot-bug drill has exactly one right answer', () => {
  for (const drill of SYNTAX_DRILLS) {
    if (drill.mode === 'write') {
      const solOutcome = evaluateSyntaxDrill(drill.solutionCode, drill);
      assert.equal(
        solOutcome.passed,
        true,
        `Solution failed for drill ${drill.id}: ${solOutcome.results.filter((r) => !r.passed).map((r) => r.id).join(', ')}`
      );
      const starterOutcome = evaluateSyntaxDrill(drill.starterCode, drill);
      assert.equal(
        starterOutcome.passed,
        false,
        `Starter code unexpectedly passed all checks for drill ${drill.id}`
      );
    } else {
      const options = drill.bugOptions ?? [];
      const correct = options.filter((o) => o.isCorrect);
      assert.equal(correct.length, 1, `Spot-bug drill ${drill.id} must have exactly 1 correct option`);
      assert.equal(evaluateBugSelection(drill, correct[0].id).isCorrect, true);
    }
  }
});
