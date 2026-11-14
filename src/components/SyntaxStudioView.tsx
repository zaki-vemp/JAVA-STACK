import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  Play,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import { TechTrack, type SyntaxDrill } from '../types/curriculum';
import { TRACK_LABELS } from '../utils/studyProgress';
import {
  evaluateBugSelection,
  evaluateSyntaxDrill,
  type EvaluationOutcome,
} from '../utils/syntaxEvaluator';
import { CodeBlock } from './CodeBlock';
import { InlineProse } from './InlineProse';

interface SyntaxStudioViewProps {
  drills: SyntaxDrill[];
  activeDrillId: string;
  onSelectDrill: (drillId: string) => void;
  solvedDrills: string[];
  onMarkDrillSolved: (drillId: string) => void;
}

export function SyntaxStudioView({
  drills,
  activeDrillId,
  onSelectDrill,
  solvedDrills,
  onMarkDrillSolved,
}: SyntaxStudioViewProps) {
  const [trackFilter, setTrackFilter] = useState<TechTrack | 'all'>('all');
  const [codeDraft, setCodeDraft] = useState<string>('');
  const [evaluation, setEvaluation] = useState<EvaluationOutcome | null>(null);
  const [selectedBugOption, setSelectedBugOption] = useState<string | null>(null);
  const [bugEvaluated, setBugEvaluated] = useState<boolean>(false);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const filteredDrills = useMemo(() => {
    if (trackFilter === 'all') return drills;
    return drills.filter((d) => d.track === trackFilter);
  }, [drills, trackFilter]);

  const activeDrill =
    drills.find((d) => d.id === activeDrillId) ?? filteredDrills[0] ?? drills[0];

  const activeIdx = drills.findIndex((d) => d.id === activeDrill.id);
  const prevDrill = activeIdx > 0 ? drills[activeIdx - 1] : null;
  const nextDrill = activeIdx >= 0 && activeIdx < drills.length - 1 ? drills[activeIdx + 1] : null;

  useEffect(() => {
    setCodeDraft(activeDrill.starterCode);
    setEvaluation(null);
    setSelectedBugOption(null);
    setBugEvaluated(false);
    setShowSolution(false);
  }, [activeDrill.id, activeDrill.starterCode]);

  const handleSelectDrill = (id: string) => {
    onSelectDrill(id);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleValidate = () => {
    if (activeDrill.mode === 'write') {
      const outcome = evaluateSyntaxDrill(codeDraft, activeDrill);
      setEvaluation(outcome);
      if (outcome.passed) {
        onMarkDrillSolved(activeDrill.id);
      }
    } else {
      setBugEvaluated(true);
      const outcome = evaluateBugSelection(activeDrill, selectedBugOption);
      if (outcome.answered && outcome.isCorrect) {
        onMarkDrillSolved(activeDrill.id);
      }
    }
  };

  const handleLoadSolution = () => {
    setCodeDraft(activeDrill.solutionCode);
    setShowSolution(true);
    setEvaluation(null);
  };

  const handleReset = () => {
    setCodeDraft(activeDrill.starterCode);
    setEvaluation(null);
    setSelectedBugOption(null);
    setBugEvaluated(false);
    setShowSolution(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = codeDraft.substring(0, start) + '    ' + codeDraft.substring(end);
      setCodeDraft(updated);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
  };

  const lineCount = Math.max(8, codeDraft.split('\n').length);
  const bugResult = bugEvaluated
    ? evaluateBugSelection(activeDrill, selectedBugOption)
    : null;
  const isSolved = solvedDrills.includes(activeDrill.id);

  const renderDrillListControls = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter drills by track">
        <button
          type="button"
          onClick={() => setTrackFilter('all')}
          className={`min-h-[36px] sm:min-h-[32px] rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
            trackFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
              : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          All
        </button>
        {Object.values(TechTrack).map((track) => (
          <button
            key={track}
            type="button"
            onClick={() => setTrackFilter(track)}
            className={`min-h-[36px] sm:min-h-[32px] rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              trackFilter === track
                ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {TRACK_LABELS[track]}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 lg:max-h-[580px] lg:overflow-y-auto lg:pr-1">
        {filteredDrills.map((drill) => {
          const selected = drill.id === activeDrill.id;
          const solved = solvedDrills.includes(drill.id);
          return (
            <button
              key={drill.id}
              type="button"
              onClick={() => handleSelectDrill(drill.id)}
              className={`w-full min-h-[48px] rounded-lg px-3 py-3 text-left transition-colors ${
                selected
                  ? 'bg-sky-50 text-slate-950 dark:bg-sky-950/45 dark:text-slate-50'
                  : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {TRACK_LABELS[drill.track]} · {drill.mode === 'write' ? 'Write Syntax' : 'Spot the Bug'}
                </span>
                {solved && (
                  <CheckCircle2
                    aria-label="Solved"
                    className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                  />
                )}
              </div>
              <div className={`mt-1 text-sm ${selected ? 'font-semibold' : 'font-medium'}`}>
                {drill.title}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-10 items-start">
      {/* Mobile Compact Drill Switcher */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          aria-expanded={mobileDrawerOpen}
          className="w-full min-h-[48px] flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left dark:border-slate-800 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80"
        >
          <div className="min-w-0">
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              Drill {activeIdx + 1} of {drills.length} · {solvedDrills.length} solved
            </div>
            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50 truncate">
              {activeDrill.title}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap shrink-0">
            <span>Drills</span>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </div>

      {/* Mobile Bottom Sheet Drill Drawer */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Browse syntax drills"
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="max-h-[85vh] flex flex-col rounded-t-3xl border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-2xl">
            <div className="flex flex-col items-center pt-2.5 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <div>
                <h2 className="font-display text-base font-bold text-slate-950 dark:text-slate-50">
                  Syntax & Code Review Drills
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {solvedDrills.length} of {drills.length} solved
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close drill browser"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 pb-8">
              {renderDrillListControls()}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Unboxed Drill List Sidebar */}
      <aside aria-label="Syntax practice drills" className="hidden lg:block lg:col-span-4 space-y-4 lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-slate-50">
            Syntax & Code Review Drills
          </h2>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {solvedDrills.length}/{drills.length} solved
          </span>
        </div>
        {renderDrillListControls()}
      </aside>

      {/* Active Drill Workspace */}
      <section className="lg:col-span-8 space-y-6 min-w-0">
        <header className="border-b border-slate-200 pb-5 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-sky-700 dark:text-sky-400">
                {TRACK_LABELS[activeDrill.track]}
              </span>
              <span aria-hidden="true">·</span>
              <span className="uppercase font-mono">{activeDrill.language}</span>
              <span aria-hidden="true">·</span>
              <span>{activeDrill.level}</span>
            </div>
            {isSolved && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Verified Solved</span>
              </span>
            )}
          </div>

          <h1
            className="font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-slate-50"
            style={{ textWrap: 'balance' }}
          >
            {activeDrill.title}
          </h1>
          <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            <InlineProse text={activeDrill.prompt} />
          </p>
        </header>

        {/* Editor or Bug Inspection */}
        {activeDrill.mode === 'write' ? (
          <div className="rounded-xl border border-slate-200 bg-slate-950 overflow-hidden dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
              <span className="font-mono text-xs text-slate-300">
                {activeDrill.language.toUpperCase()} Practice Buffer (Tab = 4 spaces)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex min-h-[40px] sm:min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSolution}
                  className="inline-flex min-h-[40px] sm:min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Load Solution</span>
                </button>
                <button
                  type="button"
                  onClick={handleValidate}
                  className="inline-flex min-h-[40px] sm:min-h-[34px] items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400 whitespace-nowrap shrink-0"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Validate Syntax</span>
                </button>
              </div>
            </div>

            <div className="flex font-mono text-[13px] leading-6 overflow-x-auto">
              <div
                aria-hidden="true"
                className="select-none border-r border-slate-800 bg-slate-950 px-3 py-4 text-right text-slate-600 tabular-nums shrink-0"
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <label htmlFor="syntax-code-editor" className="sr-only">
                Code editor for {activeDrill.title}
              </label>
              <textarea
                id="syntax-code-editor"
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                wrap="off"
                rows={Math.max(11, lineCount)}
                className="w-full min-w-0 resize-y overflow-x-auto whitespace-pre bg-slate-950 p-4 text-slate-100 focus:outline-none leading-6 font-mono"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <CodeBlock
              label="Code Under Review"
              language={activeDrill.language}
              code={activeDrill.starterCode}
            />

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/80 space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Select the root cause diagnosis:
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 overflow-hidden">
                {activeDrill.bugOptions?.map((opt) => {
                  const chosen = selectedBugOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedBugOption(opt.id);
                        setBugEvaluated(false);
                      }}
                      className={`w-full min-h-[48px] p-3.5 text-left text-sm transition-colors ${
                        chosen
                          ? 'bg-sky-50 text-slate-950 font-medium dark:bg-sky-950/50 dark:text-slate-100'
                          : 'text-slate-700 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      {opt.label.includes('`') ? <InlineProse text={opt.label} /> : opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleValidate}
                  className="inline-flex min-h-[42px] sm:min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Check Diagnosis</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSolution((s) => !s)}
                  className="inline-flex min-h-[42px] sm:min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{showSolution ? 'Hide Fixed Code' : 'Show Fixed Code'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Evaluation Output Panel (flattened hairline rows inside one surface) */}
        {evaluation && (
          <div
            data-testid="syntax-evaluation-panel"
            className={`rounded-xl border p-4 sm:p-5 space-y-4 ${
              evaluation.passed
                ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30'
                : 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {evaluation.passed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span>{evaluation.summaryMessage}</span>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                {evaluation.passedCount}/{evaluation.totalCount} Checks ({evaluation.scorePercent}%)
              </span>
            </div>

            <ul className="divide-y divide-slate-200/80 dark:divide-slate-800 rounded-lg bg-white/90 dark:bg-slate-900/90 px-4 text-xs">
              {evaluation.results.map((res) => (
                <li
                  key={res.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {res.description}
                    </div>
                    {!res.passed && (
                      <div className="text-rose-700 dark:text-rose-400">
                        <InlineProse text={res.message} />
                      </div>
                    )}
                  </div>
                  <span
                    className={`font-mono font-semibold shrink-0 ${
                      res.passed
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {res.passed ? 'PASS' : 'FAIL'}
                  </span>
                </li>
              ))}
            </ul>

            {evaluation.passed && (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                <span className="font-semibold">Why this matters in interviews: </span>
                <InlineProse text={activeDrill.explanation} />
              </p>
            )}
          </div>
        )}

        {bugResult && bugResult.answered && (
          <div
            data-testid="bug-evaluation-panel"
            className={`rounded-xl border p-4 sm:p-5 space-y-2 ${
              bugResult.isCorrect
                ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30'
                : 'border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {bugResult.isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              )}
              <span>{bugResult.isCorrect ? 'Accurate Root Cause' : 'Not Quite Right'}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <InlineProse text={bugResult.rationale} />
            </p>
          </div>
        )}

        {showSolution && (
          <CodeBlock
            label="Reference Production Solution"
            language={activeDrill.language}
            code={activeDrill.solutionCode}
            caption={activeDrill.explanation}
          />
        )}

        {/* Previous / Next Drill Continuation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          {prevDrill ? (
            <button
              type="button"
              onClick={() => handleSelectDrill(prevDrill.id)}
              className="min-h-[52px] flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <ArrowLeft className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Previous Drill
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {prevDrill.title}
                </div>
              </div>
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          {nextDrill && (
            <button
              type="button"
              onClick={() => handleSelectDrill(nextDrill.id)}
              className="min-h-[52px] flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-sky-400 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-sky-700 dark:text-sky-400">
                  Next Drill
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {nextDrill.title}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
