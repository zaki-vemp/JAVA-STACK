import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Code2,
  FileCode2,
  FolderTree,
  HelpCircle,
  Search,
  X,
} from 'lucide-react';
import {
  SPRING_BOOT_ANNOTATIONS,
  SPRING_BOOT_CHAPTERS,
  SPRING_BOOT_PROJECT_TREE,
} from '../data/springBootGuide';
import { TechTrack } from '../types/curriculum';
import {
  filterSpringBootChapters,
  findProjectFileById,
  getJpaQueryComparison,
  type JpaQueryComparison,
} from '../utils/springBootExplorer';
import { CodeBlock } from './CodeBlock';
import { InlineProse } from './InlineProse';

interface SpringBootGuideViewProps {
  onOpenDrill: (drillId: string) => void;
  onOpenSpringQuestions: (track: TechTrack) => void;
}

type SpringBootTab = 'chapters' | 'blueprint' | 'lab';
type ChapterLens = 'all' | 'theory' | 'code' | 'pitfalls';

const CATEGORY_OPTIONS = [
  'all',
  'Core & IoC',
  'Architecture',
  'Web & APIs',
  'Data & Persistence',
  'Transactions & Async',
  'Ops & Config',
  'Testing',
] as const;

export function SpringBootGuideView({
  onOpenDrill,
  onOpenSpringQuestions,
}: SpringBootGuideViewProps) {
  const [activeTab, setActiveTab] = useState<SpringBootTab>('chapters');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(SPRING_BOOT_CHAPTERS[0].id);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chapterLens, setChapterLens] = useState<ChapterLens>('all');
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const [selectedFileId, setSelectedFileId] = useState<string>(SPRING_BOOT_PROJECT_TREE[2].id);
  const [jpaMode, setJpaMode] = useState<JpaQueryComparison['mode']>('naive-n-plus-one');

  const visibleChapters = useMemo(
    () => filterSpringBootChapters(SPRING_BOOT_CHAPTERS, categoryFilter, searchQuery),
    [categoryFilter, searchQuery]
  );

  const activeChapter =
    SPRING_BOOT_CHAPTERS.find((c) => c.id === selectedChapterId) ??
    visibleChapters[0] ??
    SPRING_BOOT_CHAPTERS[0];

  const activeChapterIdx = SPRING_BOOT_CHAPTERS.findIndex((c) => c.id === activeChapter.id);
  const prevChapter = activeChapterIdx > 0 ? SPRING_BOOT_CHAPTERS[activeChapterIdx - 1] : null;
  const nextChapter =
    activeChapterIdx >= 0 && activeChapterIdx < SPRING_BOOT_CHAPTERS.length - 1
      ? SPRING_BOOT_CHAPTERS[activeChapterIdx + 1]
      : null;

  const safeStepIdx = Math.min(activeStepIdx, Math.max(0, activeChapter.lifecycleSteps.length - 1));
  const activeLifecycleStep = activeChapter.lifecycleSteps[safeStepIdx];

  const activeFile = useMemo(
    () => findProjectFileById(SPRING_BOOT_PROJECT_TREE, selectedFileId),
    [selectedFileId]
  );

  const jpaComparison = useMemo(() => getJpaQueryComparison(jpaMode), [jpaMode]);

  const handleSelectChapter = (id: string) => {
    setSelectedChapterId(id);
    setActiveStepIdx(0);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderChapterNav = (searchId: string) => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <label htmlFor={searchId} className="sr-only">
          Search Spring Boot chapters
        </label>
        <input
          id={searchId}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search IoC, JPA, @Transactional..."
          className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter Spring Boot chapters by topic">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`min-h-[36px] sm:min-h-[32px] rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              categoryFilter === cat
                ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {cat === 'all' ? 'All Chapters' : cat}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800 lg:max-h-[580px] lg:overflow-y-auto lg:pr-1">
        {visibleChapters.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No Spring Boot chapters match "{searchQuery}".
          </div>
        ) : (
          visibleChapters.map((ch) => {
            const selected = ch.id === activeChapter.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleSelectChapter(ch.id)}
                className={`w-full min-h-[48px] py-3 px-3 text-left transition-colors rounded-lg ${
                  selected
                    ? 'bg-sky-50 text-slate-950 dark:bg-sky-950/45 dark:text-slate-50'
                    : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {ch.order}. {ch.category}
                </div>
                <div
                  className={`mt-1 text-sm leading-snug ${
                    selected ? 'font-semibold text-slate-950 dark:text-white' : 'font-medium'
                  }`}
                >
                  {ch.title}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Unboxed Section Header + Sub-Mode Switcher */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1
              className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-slate-50"
              style={{ textWrap: 'balance' }}
            >
              Spring Boot Architecture & Practical Guide
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              Complete field guide to Spring Boot 3 & Spring Framework 6: IoC container internals, package-by-feature codebase layout, Web MVC & ProblemDetail APIs, Hibernate/JPA N+1 prevention, transactions, and testing slices.
            </p>
          </div>

          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0"
            role="tablist"
            aria-label="Spring Boot guide views"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chapters'}
              onClick={() => setActiveTab('chapters')}
              className={`min-h-[42px] sm:min-h-[36px] rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'chapters'
                  ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                  : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Deep Guide (7 Chapters)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'blueprint'}
              onClick={() => setActiveTab('blueprint')}
              className={`min-h-[42px] sm:min-h-[36px] rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'blueprint'
                  ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                  : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Project Layout & Code (8 Files)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'lab'}
              onClick={() => setActiveTab('lab')}
              className={`min-h-[42px] sm:min-h-[36px] rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'lab'
                  ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                  : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              JPA SQL Lab & Annotations
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: DEEP SPRING BOOT CHAPTER GUIDE */}
      {activeTab === 'chapters' && (
        <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-10 items-start">
          {/* Mobile Compact Chapter Switcher */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-expanded={mobileDrawerOpen}
              className="w-full min-h-[48px] flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left dark:border-slate-800 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  Chapter {activeChapter.order} of 0{SPRING_BOOT_CHAPTERS.length} · {activeChapter.category}
                </div>
                <div className="text-sm font-semibold text-slate-950 dark:text-slate-50 truncate">
                  {activeChapter.title}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap shrink-0">
                <span>Chapters</span>
                <ChevronDown className="h-4 w-4" />
              </span>
            </button>
          </div>

          {/* Mobile Bottom Sheet Drawer */}
          {mobileDrawerOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Browse Spring Boot chapters"
              className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs"
            >
              <div className="max-h-[85vh] flex flex-col rounded-t-3xl border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-2xl">
                <div className="flex flex-col items-center pt-2.5 pb-1">
                  <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-950 dark:text-slate-50">
                      Spring Boot Chapters
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Core runtime, clean architecture & practical Java code
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    aria-label="Close chapter browser"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="overflow-y-auto p-4 pb-8">
                  {renderChapterNav('mobile-sb-search')}
                </div>
              </div>
            </div>
          )}

          {/* Desktop Unboxed Chapter Rail */}
          <aside
            aria-label="Spring Boot chapter navigation"
            className="hidden lg:block lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20"
          >
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Spring Boot Chapters
              </span>
              <span className="font-mono tabular-nums">{SPRING_BOOT_CHAPTERS.length} guides</span>
            </div>
            {renderChapterNav('desktop-sb-search')}
          </aside>

          {/* Active Chapter Article */}
          <article className="lg:col-span-8 xl:col-span-9 space-y-8 min-w-0">
            <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-sky-700 dark:text-sky-400">
                  Spring Boot 3.x
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeChapter.category}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{activeChapter.readMinutes} min study</span>
              </div>

              <h2
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50 max-w-3xl leading-tight"
                style={{ textWrap: 'balance' }}
              >
                {activeChapter.order}. {activeChapter.title}
              </h2>
              <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                {activeChapter.subtitle}
              </p>

              <p className="rounded-lg bg-slate-100/80 px-4 py-3 text-xs sm:text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-200 max-w-3xl leading-relaxed [overflow-wrap:anywhere]">
                <span className="font-semibold text-sky-700 dark:text-sky-400">Key Mental Model: </span>
                <InlineProse text={activeChapter.summaryTakeaway} />
              </p>
            </header>

            {/* Interactive Lifecycle & Execution Flow Stepper */}
            <section
              aria-label="Spring runtime execution pipeline"
              className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/70 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-mono font-semibold text-sky-700 dark:text-sky-400">
                    Interactive Execution Flow
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-950 dark:text-slate-50">
                    Step Through How Spring Manages This Layer
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  Stage {safeStepIdx + 1} of {activeChapter.lifecycleSteps.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {activeChapter.lifecycleSteps.map((s, idx) => {
                  const selected = idx === safeStepIdx;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setActiveStepIdx(idx)}
                      className={`min-h-[44px] rounded-lg px-3 py-2 text-left text-xs transition-colors min-w-0 ${
                        selected
                          ? 'bg-sky-100 text-sky-950 font-semibold dark:bg-sky-950/60 dark:text-sky-100'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate">{s.step}</div>
                    </button>
                  );
                })}
              </div>

              {activeLifecycleStep && (
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 space-y-1.5">
                  <div className="text-xs font-mono font-semibold text-sky-700 dark:text-sky-400 [overflow-wrap:anywhere]">
                    {activeLifecycleStep.component}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed [overflow-wrap:anywhere]">
                    <InlineProse text={activeLifecycleStep.responsibility} />
                  </p>
                </div>
              )}
            </section>

            {/* Study Lens Filter */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-3 dark:border-slate-800"
              role="tablist"
              aria-label="Chapter reading lens"
            >
              {[
                { id: 'all', label: 'Full Guide' },
                { id: 'theory', label: 'Theory & Rules' },
                { id: 'code', label: 'Practical Code' },
                { id: 'pitfalls', label: 'Failure Traps' },
              ].map((lens) => (
                <button
                  key={lens.id}
                  type="button"
                  role="tab"
                  aria-selected={chapterLens === lens.id}
                  onClick={() => setChapterLens(lens.id as ChapterLens)}
                  className={`min-h-[40px] sm:min-h-[34px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    chapterLens === lens.id
                      ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`}
                >
                  {lens.label}
                </button>
              ))}
            </div>

            {/* Theory & Architecture Rules */}
            {(chapterLens === 'all' || chapterLens === 'theory') && (
              <section className="space-y-6">
                <div className="space-y-4 text-[15px] sm:text-base text-slate-700 dark:text-slate-300 leading-7 max-w-3xl">
                  {activeChapter.theoryParagraphs.map((p, idx) => (
                    <p key={idx}><InlineProse text={p} /></p>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60 max-w-3xl">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                    Spring Boot Architectural Rules
                  </h3>
                  <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                    {activeChapter.architectureRules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-400 mt-0.5 tabular-nums shrink-0">
                          0{idx + 1}.
                        </span>
                        <span className="leading-relaxed min-w-0">
                          <InlineProse text={rule} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Practical Code Examples */}
            {(chapterLens === 'all' || chapterLens === 'code') && (
              <section className="space-y-4 border-t border-slate-200 pt-7 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold text-slate-950 dark:text-slate-50">
                    How the Production Code Looks
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('blueprint')}
                    className="inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
                  >
                    <FolderTree className="h-4 w-4" />
                    <span>Explore Full 8-File Project Structure</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {activeChapter.codeExamples.map((ex) => (
                    <CodeBlock
                      key={ex.label}
                      label={ex.label}
                      language={ex.language}
                      code={ex.code}
                      caption={ex.caption}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Production Failure Modes */}
            {(chapterLens === 'all' || chapterLens === 'pitfalls') && (
              <section className="space-y-4 border-t border-slate-200 pt-7 dark:border-slate-800">
                <h3 className="font-display text-xl font-semibold text-slate-950 dark:text-slate-50">
                  Common Spring Boot Pitfalls & Fixes
                </h3>
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 divide-y divide-slate-200 dark:divide-slate-800">
                  {activeChapter.pitfalls.map((pitfall) => (
                    <div key={pitfall.title} className="p-5 sm:p-6 space-y-3">
                      <h4 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {pitfall.title}
                      </h4>
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

            {/* Practice Actions & Sequential Chapter Continuation */}
            <section className="border-t border-slate-200 pt-6 dark:border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                    Test your Spring Boot mastery
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Practice writing real Spring annotations or review senior Spring Boot interview questions.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenSpringQuestions(TechTrack.SpringBoot)}
                    className="inline-flex min-h-[44px] sm:min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Spring Boot Questions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDrill(activeChapter.linkedDrillId)}
                    className="inline-flex min-h-[44px] sm:min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap shrink-0"
                  >
                    <Code2 className="h-4 w-4" />
                    <span>Practice Syntax Drill</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prevChapter ? (
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(prevChapter.id)}
                    className="min-h-[56px] flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Previous Chapter
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {prevChapter.order}. {prevChapter.title}
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {nextChapter && (
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(nextChapter.id)}
                    className="min-h-[56px] flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-sky-400 dark:border-slate-800 dark:bg-slate-900/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-sky-700 dark:text-sky-400">
                        Continue Next Chapter
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {nextChapter.order}. {nextChapter.title}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  </button>
                )}
              </div>
            </section>
          </article>
        </div>
      )}

      {/* TAB 2: INTERACTIVE PRODUCTION PROJECT LAYOUT & CODE EXPLORER */}
      {activeTab === 'blueprint' && (
        <section
          aria-label="Spring Boot production project structure explorer"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"
        >
          <div className="lg:col-span-5 space-y-3 min-w-0">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold text-slate-950 dark:text-slate-50">
                Production Package-by-Feature Codebase
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Select any file below to see how Spring Boot layers collaborate without leaking entities or circular dependencies.
              </p>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
              {SPRING_BOOT_PROJECT_TREE.map((file) => {
                const selected = file.id === activeFile.id;
                const shortName = file.path.split('/').pop() ?? file.path;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedFileId(file.id)}
                    className={`w-full min-h-[54px] px-4 py-3 text-left transition-colors flex items-start gap-3 ${
                      selected
                        ? 'bg-sky-50/90 text-slate-950 dark:bg-sky-950/45 dark:text-slate-50'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <FileCode2
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        selected ? 'text-sky-700 dark:text-sky-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs sm:text-[13px] font-semibold truncate">
                          {shortName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          {file.layer}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                        {file.path}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4 min-w-0">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-sky-700 dark:text-sky-400">
                  {activeFile.layer}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono break-all">{activeFile.path}</span>
              </div>

              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {activeFile.roleSummary}
              </p>

              <div className="border-t border-slate-200 pt-3 dark:border-slate-800 space-y-1.5 text-xs">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Key Annotations / Settings:{' '}
                  </span>
                  <span className="font-mono text-sky-700 dark:text-sky-400">
                    {activeFile.keyAnnotations.join(' · ')}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Architectural Boundary:{' '}
                  </span>
                  <InlineProse text={activeFile.architecturalRule} />
                </p>
              </div>
            </div>

            <CodeBlock
              label={activeFile.path.split('/').pop() ?? activeFile.path}
              language={activeFile.language}
              code={activeFile.code}
            />
          </div>
        </section>
      )}

      {/* TAB 3: JPA N+1 SQL LAB & ANNOTATION REFERENCE */}
      {activeTab === 'lab' && (
        <div className="space-y-8">
          <section
            aria-label="Spring Data JPA query strategy comparator"
            className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/70 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <div className="text-xs font-mono font-semibold text-sky-700 dark:text-sky-400">
                  Interactive Persistence Visual
                </div>
                <h2 className="font-display text-lg font-bold text-slate-950 dark:text-slate-50">
                  Spring Data JPA: Lazy N+1 vs @EntityGraph vs DTO Projection
                </h2>
              </div>

              <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 w-fit max-w-full" role="group" aria-label="JPA fetch strategy">
                {(
                  [
                    { id: 'naive-n-plus-one', label: 'Lazy Loop (N+1)' },
                    { id: 'entity-graph', label: '@EntityGraph' },
                    { id: 'dto-projection', label: 'DTO Projection' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setJpaMode(opt.id)}
                    className={`min-h-[38px] sm:min-h-[32px] rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      jpaMode === opt.id
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  SQL Statements (50 Orders)
                </div>
                <div
                  className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
                    jpaComparison.sqlCountFor50Orders > 1
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {jpaComparison.sqlCountFor50Orders} {jpaComparison.sqlCountFor50Orders === 1 ? 'query' : 'queries'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Estimated DB Round-Trip Latency
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-slate-950 dark:text-slate-50 tabular-nums">
                  {jpaComparison.estimatedDbTimeMs} ms
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Hibernate Heap Overhead
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {jpaComparison.memoryFootprint}
                </div>
              </div>
            </div>

            <CodeBlock
              label={`Generated PostgreSQL SQL — ${jpaComparison.label}`}
              language="sql"
              code={jpaComparison.sampleSql}
            />

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <InlineProse text={jpaComparison.explanation} />
            </p>
          </section>

          <section aria-label="Core Spring Boot annotations reference" className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-slate-50">
              Essential Spring Boot Annotations & Runtime Mechanics
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 divide-y divide-slate-200 dark:divide-slate-800">
              {SPRING_BOOT_ANNOTATIONS.map((item) => (
                <div
                  key={item.annotation}
                  className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-start"
                >
                  <div className="md:col-span-3 space-y-0.5">
                    <div className="font-mono text-xs sm:text-sm font-semibold text-sky-700 dark:text-sky-400 break-words">
                      {item.annotation}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.stereotypeOrLayer}
                    </div>
                  </div>
                  <div className="md:col-span-5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <InlineProse text={item.runtimeBehavior} />
                  </div>
                  <div className="md:col-span-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Rule: </span>
                    <InlineProse text={item.interviewRule} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
