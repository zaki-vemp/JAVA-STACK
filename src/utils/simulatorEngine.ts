export type IsolationMode = 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';

export interface MvccTuple {
  ctid: string;
  balance: number;
  xmin: number;
  xmax: number | null;
  status: 'live' | 'dead' | 'uncommitted';
}

export interface MvccStepState {
  stepIndex: number;
  title: string;
  description: string;
  txAReadValue: number | null;
  txBStatus: 'idle' | 'active' | 'committed' | 'aborted';
  anomalyTag: string;
  tuples: MvccTuple[];
}

export function computeMvccTimeline(isolation: IsolationMode): MvccStepState[] {
  const step0: MvccStepState = {
    stepIndex: 0,
    title: 'Initial Heap Page State',
    description:
      'Row exists on Heap Page 0 at ctid (0,1). Transaction 100 inserted it and committed.',
    txAReadValue: null,
    txBStatus: 'idle',
    anomalyTag: 'Steady State',
    tuples: [
      { ctid: '(0,1)', balance: 500, xmin: 100, xmax: null, status: 'live' },
    ],
  };

  const step1: MvccStepState = {
    stepIndex: 1,
    title: 'Tx A (xid 201) Begins & Reads Balance',
    description:
      isolation === 'READ_COMMITTED'
        ? 'Tx A takes a statement-level snapshot (see committed xid <= 200). Reads $500.'
        : 'Tx A takes a transaction-level snapshot at first query (see committed xid <= 200). Reads $500.',
    txAReadValue: 500,
    txBStatus: 'idle',
    anomalyTag: 'Snapshot Captured',
    tuples: [
      { ctid: '(0,1)', balance: 500, xmin: 100, xmax: null, status: 'live' },
    ],
  };

  const step2: MvccStepState = {
    stepIndex: 2,
    title: 'Tx B (xid 202) Updates Balance to $800 (Uncommitted)',
    description:
      'PostgreSQL does NOT overwrite in place. It marks (0,1) xmax=202 and appends a new tuple (0,2) with xmin=202. Tx A still sees $500 (no dirty reads ever in Postgres).',
    txAReadValue: 500,
    txBStatus: 'active',
    anomalyTag: 'No Dirty Read (MVCC Isolation)',
    tuples: [
      { ctid: '(0,1)', balance: 500, xmin: 100, xmax: 202, status: 'live' },
      { ctid: '(0,2)', balance: 800, xmin: 202, xmax: null, status: 'uncommitted' },
    ],
  };

  const step3: MvccStepState = {
    stepIndex: 3,
    title: 'Tx B Commits (xid 202 Committed)',
    description:
      'Commit log (pg_xact) marks xid 202 committed. Tuple (0,1) is now obsolete for future snapshots; (0,2) is the latest committed version.',
    txAReadValue: 500,
    txBStatus: 'committed',
    anomalyTag: 'New Tuple Committed',
    tuples: [
      { ctid: '(0,1)', balance: 500, xmin: 100, xmax: 202, status: 'dead' },
      { ctid: '(0,2)', balance: 800, xmin: 202, xmax: null, status: 'live' },
    ],
  };

  const step4: MvccStepState = {
    stepIndex: 4,
    title: 'Tx A Re-reads the Same Row',
    description:
      isolation === 'READ_COMMITTED'
        ? 'Under READ COMMITTED, Tx A acquires a fresh snapshot for this SELECT. It now sees $800 (Non-Repeatable Read allowed).'
        : isolation === 'REPEATABLE_READ'
          ? 'Under REPEATABLE READ, Tx A reuses its transaction-start snapshot. xid 202 is invisible; Tx A still reads $500 (no non-repeatable read).'
          : 'Under SERIALIZABLE, Tx A reads $500 from its snapshot and SSI tracks SIRead locks. If Tx A attempts to write based on stale read, serialization failure (40001) triggers.',
    txAReadValue: isolation === 'READ_COMMITTED' ? 800 : 500,
    txBStatus: 'committed',
    anomalyTag:
      isolation === 'READ_COMMITTED'
        ? 'Non-Repeatable Read Observed ($500 -> $800)'
        : isolation === 'REPEATABLE_READ'
          ? 'Snapshot Preserved ($500 Consistent)'
          : 'Serializable Snapshot + SIRead Predicate Lock',
    tuples: [
      { ctid: '(0,1)', balance: 500, xmin: 100, xmax: 202, status: 'dead' },
      { ctid: '(0,2)', balance: 800, xmin: 202, xmax: null, status: 'live' },
    ],
  };

  return [step0, step1, step2, step3, step4];
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerSnapshot {
  state: CircuitState;
  windowResults: boolean[]; // true = success, false = failure
  failureRatePercent: number;
  halfOpenTrials: number;
  blockedCalls: number;
  fallbackCalls: number;
  lastEvent: string;
}

export const INITIAL_CIRCUIT_SNAPSHOT: CircuitBreakerSnapshot = {
  state: 'CLOSED',
  windowResults: [true, true, true, true],
  failureRatePercent: 0,
  halfOpenTrials: 0,
  blockedCalls: 0,
  fallbackCalls: 0,
  lastEvent: 'Circuit nominal; routing traffic to downstream PostgreSQL/Payment service.',
};

export function stepCircuitBreaker(
  current: CircuitBreakerSnapshot,
  action: 'success' | 'failure' | 'wait_cooldown' | 'reset',
  thresholdPercent: number = 50,
  windowSize: number = 6
): CircuitBreakerSnapshot {
  if (action === 'reset') {
    return { ...INITIAL_CIRCUIT_SNAPSHOT };
  }

  if (action === 'wait_cooldown') {
    if (current.state !== 'OPEN') {
      return {
        ...current,
        lastEvent: 'Cooldown timer only transitions OPEN circuits to HALF_OPEN.',
      };
    }
    return {
      ...current,
      state: 'HALF_OPEN',
      halfOpenTrials: 0,
      lastEvent: 'Cooldown elapsed. Circuit entered HALF_OPEN to probe downstream recovery.',
    };
  }

  if (current.state === 'OPEN') {
    return {
      ...current,
      blockedCalls: current.blockedCalls + 1,
      fallbackCalls: current.fallbackCalls + 1,
      lastEvent: 'Call short-circuited immediately (OPEN). Executed fallback without hitting downstream.',
    };
  }

  const isSuccess = action === 'success';
  const nextWindow = [...current.windowResults, isSuccess].slice(-windowSize);
  const failures = nextWindow.filter((ok) => !ok).length;
  const failureRatePercent = Math.round((failures / nextWindow.length) * 100);

  if (current.state === 'HALF_OPEN') {
    if (!isSuccess) {
      return {
        ...current,
        state: 'OPEN',
        windowResults: nextWindow,
        failureRatePercent,
        halfOpenTrials: 0,
        fallbackCalls: current.fallbackCalls + 1,
        lastEvent: 'Probe failed in HALF_OPEN -> tripped back to OPEN.',
      };
    }
    const nextTrials = current.halfOpenTrials + 1;
    if (nextTrials >= 2) {
      return {
        ...current,
        state: 'CLOSED',
        windowResults: nextWindow,
        failureRatePercent,
        halfOpenTrials: 0,
        lastEvent: '2 consecutive probes succeeded -> Circuit restored to CLOSED.',
      };
    }
    return {
      ...current,
      halfOpenTrials: nextTrials,
      windowResults: nextWindow,
      failureRatePercent,
      lastEvent: `Probe 1/2 succeeded in HALF_OPEN. One more success restores CLOSED.`,
    };
  }

  // CLOSED state
  if (nextWindow.length >= 4 && failureRatePercent >= thresholdPercent) {
    return {
      ...current,
      state: 'OPEN',
      windowResults: nextWindow,
      failureRatePercent,
      halfOpenTrials: 0,
      fallbackCalls: current.fallbackCalls + 1,
      lastEvent: `Failure rate hit ${failureRatePercent}% (>= ${thresholdPercent}% threshold) -> Circuit tripped OPEN.`,
    };
  }

  return {
    ...current,
    windowResults: nextWindow,
    failureRatePercent,
    lastEvent: isSuccess
      ? `Downstream call succeeded (${failureRatePercent}% window failure rate).`
      : `Downstream call failed (${failureRatePercent}% window failure rate; threshold ${thresholdPercent}%).`,
  };
}
