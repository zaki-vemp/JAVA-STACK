import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookCheck,
  CheckCircle2,
  ChevronDown,
  Code2,
  HelpCircle,
  Search,
  X,
} from 'lucide-react';
import { TechTrack, type DocTopic } from '../types/curriculum';
import { filterTopics, TRACK_LABELS } from '../utils/studyProgress';
import { CodeBlock } from './CodeBlock';
import { InlineProse } from './InlineProse';
import { SimulatorHost } from './simulators/SimulatorHost';

interface DocumentationViewProps {
  topics: DocTopic[];
  activeTopicId: string;
  onSelectTopic: (topicId: string) => void;
  completedTopics: string[];
  onToggleTopicComplete: (topicId: string) => void;
  onOpenDrill: (drillId: string) => void;
  onOpenQuestionsForTrack: (track: TechTrack) => void;
}

type StudyLens = 'all' | 'theory' | 'code' | 'pitfalls';

const TRACK_FILTER_OPTIONS: { id: TechTrack | 'all'; label: string }[] = [
  { id: 'all', label: 'All Tracks' },
  { id: TechTrack.SpringBoot, label: 'Spring Boot' },
  { id: TechTrack.PostgreSQL, label: 'PostgreSQL' },
  { id: TechTrack.Java, label: 'Java & JVM' },
  { id: TechTrack.Kotlin, label: 'Kotlin' },
  { id: TechTrack.FullStack, label: 'Full-Stack' },
];

const STUDY_LENSES: { id: StudyLens; label: string }[] = [
  { id: 'all', label: 'Full Guide' },
  { id: 'theory', label: 'Theory & Cues' },
  { id: 'code', label: 'Practical Code' },
  { id: 'pitfalls', label: 'Failure Traps' },
];

export function DocumentationView({
  topics,
  activeTopicId,
  onSelectTopic,
  completedTopics,
  onToggleTopicComplete,
  onOpenDrill,
  onOpenQuestionsForTrack,
}: DocumentationViewProps) {
  const [trackFilter, setTrackFilter] = useState<TechTrack | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [studyLens, setStudyLens] = useState<StudyLens>('all');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const visibleTopics = useMemo(
    () => filterTopics(topics, trackFilter, searchQuery),
    [topics, trackFilter, searchQuery]
  );

  const activeTopic =
    topics.find((t) => t.id === activeTopicId) ?? visibleTopics[0] ?? topics[0];

  const activeIdxInAll = topics.findIndex((t) => t.id === activeTopic.id);
  const prevTopic = activeIdxInAll > 0 ? topics[activeIdxInAll - 1] : null;
  const nextTopic =
    activeIdxInAll >= 0 && activeIdxInAll < topics.length - 1
      ? topics[activeIdxInAll + 1]
      : null;

  const isCompleted = completedTopics.includes(activeTopic.id);
  const examples = activeTopic.practicalImplementation.examples;
  const safeExampleIdx = Math.min(activeExampleIndex, Math.max(0, examples.length - 1));
  const activeExample = examples[safeExampleIdx];

  const handleSelectTopic = (id: string) => {
    setActiveExampleIndex(0);
    onSelectTopic(id);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurriculumControls = (inputId: string) => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <label htmlFor={inputId} className="sr-only">
          Search architecture topics
        </label>
        <input
          id={inputId}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search MVCC, proxy, Loom..."
          className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter topics by stack">
        {TRACK_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTrackFilter(opt.id)}
            className={`min-h-[36px] sm:min-h-[32px] rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              trackFilter === opt.id
                ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 lg:max-h-[580px] lg:overflow-y-auto lg:pr-1">
        {visibleTopics.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No topics match "{searchQuery}".
          </div>
        ) : (
          visibleTopics.map((topic) => {
            const selected = topic.id === activeTopic.id;
            const done = completedTopics.includes(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSelectTopic(topic.id)}
                className={`w-full min-h-[48px] py-3 px-3 text-left transition-colors rounded-lg ${
                  selected
                    ? 'bg-sky-50 text-slate-950 dark:bg-sky-950/45 dark:text-slate-50'
                    : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono tabular-nums">
                    {topic.order}. {TRACK_LABELS[topic.track]}
                  </span>
                  {done && (
                    <CheckCircle2
                      aria-label="Completed"
                      className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                    />
                  )}
                </div>
                <div
                  className={`mt-1 text-sm leading-snug ${
                    selected ? 'font-semibold text-slate-950 dark:text-white' : 'font-medium'
                  }`}
                >
                  {topic.title}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-10 items-start">
      {/* Mobile Compact Topic Switcher (keeps article immediately at top on mobile) */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          aria-expanded={mobileDrawerOpen}
          className="w-full min-h-[48px] flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left dark:border-slate-800 dark:bg-slate-900 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80"
        >
          <div className="min-w-0">
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              Module {activeTopic.order} of {topics.length} · {TRACK_LABELS[activeTopic.track]}
            </div>
            <div className="text-sm font-semibold text-slate-950 dark:text-slate-50 truncate">
              {activeTopic.title}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap shrink-0">
            <span>Topics</span>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </div>

      {/* Mobile Bottom Sheet Curriculum Drawer */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Browse documentation curriculum"
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="max-h-[85vh] flex flex-col rounded-t-3xl border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-2xl">
            <div className="flex flex-col items-center pt-2.5 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <div>
                <h2 className="font-display text-base font-bold text-slate-950 dark:text-slate-50">
                  Curriculum Modules
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {completedTopics.length} of {topics.length} mastered
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close topic browser"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 pb-8">
              {renderCurriculumControls('mobile-doc-topic-search')}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Left Navigation Sidebar (unboxed flat list, zero nested cards) */}
      <aside
        aria-label="Documentation curriculum"
        className="hidden lg:block lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20"
      >
        <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Curriculum</span>
          <span className="font-mono tabular-nums">
            {completedTopics.length}/{topics.length} mastered
          </span>
        </div>
        {renderCurriculumControls('doc-topic-search')}
      </aside>

      {/* Main Documentation Article + Interactive Visual Lab */}
      <article className="lg:col-span-8 xl:col-span-9 space-y-8 min-w-0">
        {/* Hero Header */}
        <header className="space-y-4 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-sky-700 dark:text-sky-400">
                {TRACK_LABELS[activeTopic.track]}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeTopic.level}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{activeTopic.readMinutes} min study</span>
              <span aria-hidden="true">·</span>
              <span>{activeTopic.interviewWeight}</span>
            </div>

            <button
              type="button"
              onClick={() => onToggleTopicComplete(activeTopic.id)}
              className={`inline-flex min-h-[42px] sm:min-h-[36px] w-fit items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isCompleted
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <BookCheck className="h-3.5 w-3.5" />
              <span>{isCompleted ? 'Topic Mastered' : 'Mark Topic Mastered'}</span>
            </button>
          </div>

          <h1
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50 max-w-3xl leading-tight"
            style={{ textWrap: 'balance' }}
          >
            {activeTopic.order}. {activeTopic.title}
          </h1>
          <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            {activeTopic.subtitle}
          </p>
        </header>

        {/* Interactive Visual Simulator (placed immediately after header so users engage visually first) */}
        {activeTopic.simulator && activeTopic.simulatorTitle && activeTopic.simulatorSummary && (
          <SimulatorHost
            kind={activeTopic.simulator}
            title={activeTopic.simulatorTitle}
            summary={activeTopic.simulatorSummary}
          />
        )}

        {/* Study Focus Filter Bar (prevents overwhelming scroll & lets learners isolate sections) */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-3 dark:border-slate-800" role="tablist" aria-label="Study focus lens">
          {STUDY_LENSES.map((lens) => (
            <button
              key={lens.id}
              type="button"
              role="tab"
              aria-selected={studyLens === lens.id}
              onClick={() => setStudyLens(lens.id)}
              className={`min-h-[40px] sm:min-h-[34px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                studyLens === lens.id
                  ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              {lens.label}
            </button>
          ))}
        </div>

        {/* Theoretical Deep Dive + Key Invariants */}
        {(studyLens === 'all' || studyLens === 'theory') && (
          <section className="space-y-6">
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-slate-50">
                {activeTopic.theoreticalDeepDive.heading}
              </h2>
              <div className="space-y-4 text-[15px] sm:text-base text-slate-700 dark:text-slate-300 leading-7 max-w-3xl">
                {activeTopic.theoreticalDeepDive.paragraphs.map((p, idx) => (
                  <p key={idx}><InlineProse text={p} /></p>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60 max-w-3xl">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                Non-Negotiable Engineering Invariants
              </h3>
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                {activeTopic.theoreticalDeepDive.keyInvariants.map((inv, idx) => (
                  <li key={idx} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-400 mt-0.5 tabular-nums shrink-0">
                      0{idx + 1}.
                    </span>
                    <span className="leading-relaxed min-w-0"><InlineProse text={inv} /></span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Visual Mental Cues */}
        {(studyLens === 'all' || studyLens === 'theory') && activeTopic.visualCues.length > 0 && (
          <section className="space-y-4 border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-slate-50">
              Visual & Mental Cues for Recall
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTopic.visualCues.map((cue) => (
                <div
                  key={cue.cueLabel}
                  className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-2 min-w-0"
                >
                  <div className="text-xs font-mono font-semibold text-sky-700 dark:text-sky-400">
                    {cue.cueLabel}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {cue.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <InlineProse text={cue.explanation} />
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Practical Code Implementation */}
        {(studyLens === 'all' || studyLens === 'code') && (
          <section className="space-y-4 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-slate-50">
                  {activeTopic.practicalImplementation.heading}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                  {activeTopic.practicalImplementation.summary}
                </p>
              </div>

              {examples.length > 1 && (
                <div className="inline-flex w-fit rounded-lg bg-slate-100 p-1 dark:bg-slate-800 shrink-0" role="tablist">
                  {examples.map((ex, idx) => (
                    <button
                      key={ex.label}
                      type="button"
                      role="tab"
                      aria-selected={safeExampleIdx === idx}
                      onClick={() => setActiveExampleIndex(idx)}
                      className={`min-h-[38px] sm:min-h-[32px] rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        safeExampleIdx === idx
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {ex.language.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeExample && (
              <CodeBlock
                label={activeExample.label}
                language={activeExample.language}
                code={activeExample.code}
                caption={activeExample.caption}
              />
            )}
          </section>
        )}

        {/* Common Production Pitfalls (single elevation container with hairline dividers) */}
        {(studyLens === 'all' || studyLens === 'pitfalls') && (
          <section className="space-y-4 border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-slate-50">
              Production Failure Modes & Interview Traps
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 divide-y divide-slate-200 dark:divide-slate-800">
              {activeTopic.pitfalls.map((pitfall) => (
                <div key={pitfall.title} className="p-5 sm:p-6 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {pitfall.title}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-[13px] leading-relaxed">
                    <div className="min-w-0">
                      <div className="font-semibold text-rose-700 dark:text-rose-400">Symptom</div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        <InlineProse text={pitfall.symptom} />
                      </p>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-amber-700 dark:text-amber-400">Root Cause</div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        <InlineProse text={pitfall.rootCause} />
                      </p>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400">Production Fix</div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        <InlineProse text={pitfall.fix} />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Practice Action Bar & Sequential Module Continuation */}
        <section className="border-t border-slate-200 pt-6 dark:border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                Lock in syntax & interview recall for this module
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Validate your hand-written code or test yourself on senior follow-up questions.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => onOpenQuestionsForTrack(activeTopic.track)}
                className="inline-flex min-h-[44px] sm:min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0"
              >
                <HelpCircle className="h-4 w-4" />
                <span>View Interview Questions</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDrill(activeTopic.linkedDrillId)}
                className="inline-flex min-h-[44px] sm:min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap shrink-0"
              >
                <Code2 className="h-4 w-4" />
                <span>Practice Syntax Drill</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Previous / Next Module Continuation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prevTopic ? (
              <button
                type="button"
                onClick={() => handleSelectTopic(prevTopic.id)}
                className="min-h-[56px] flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Previous Module
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {prevTopic.order}. {prevTopic.title}
                  </div>
                </div>
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            {nextTopic && (
              <button
                type="button"
                onClick={() => handleSelectTopic(nextTopic.id)}
                className="min-h-[56px] flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-sky-400 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-sky-500 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-sky-700 dark:text-sky-400">
                    Continue Next Module
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {nextTopic.order}. {nextTopic.title}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
              </button>
            )}
          </div>
        </section>
      </article>
    </div>
  );
}
