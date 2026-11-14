import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import {
  DifficultyLevel,
  MasteryStatus,
  TechTrack,
  type InterviewQuestion,
  type StudyProgressState,
} from '../types/curriculum';
import { filterInterviewQuestions, TRACK_LABELS } from '../utils/studyProgress';
import { CodeBlock } from './CodeBlock';
import { InlineProse } from './InlineProse';

interface InterviewBankViewProps {
  questions: InterviewQuestion[];
  progress: StudyProgressState;
  initialTrackFilter: TechTrack | 'all';
  onUpdateQuestionStatus: (questionId: string, status: MasteryStatus) => void;
}

export function InterviewBankView({
  questions,
  progress,
  initialTrackFilter,
  onUpdateQuestionStatus,
}: InterviewBankViewProps) {
  const [trackFilter, setTrackFilter] = useState<TechTrack | 'all'>(initialTrackFilter);
  const [levelFilter, setLevelFilter] = useState<DifficultyLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MasteryStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () =>
      filterInterviewQuestions(questions, {
        track: trackFilter,
        level: levelFilter,
        status: statusFilter,
        query: searchQuery,
        progress,
      }),
    [questions, trackFilter, levelFilter, statusFilter, searchQuery, progress]
  );

  const masteredCount = questions.filter(
    (q) => progress.questionStatus[q.id] === MasteryStatus.Mastered
  ).length;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Unboxed Header & Filter Controls */}
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h1
              className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-slate-50"
              style={{ textWrap: 'balance' }}
            >
              Technical Interview Question Bank
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              High-signal questions asked in Java, Kotlin, Spring Boot, PostgreSQL, and Full-Stack interviews—with interviewer intent, theory, practical patterns, and follow-up curveballs.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
            <span className="font-semibold text-slate-950 dark:text-slate-100">{masteredCount}</span> /{' '}
            {questions.length} mastered
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <label htmlFor="interview-search" className="sr-only">
              Search interview questions
            </label>
            <input
              id="interview-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by MVCC, Outbox, Coroutines, N+1..."
              className="w-full min-h-[44px] sm:min-h-[40px] rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="md:col-span-6 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <label htmlFor="level-filter-select" className="sr-only">
              Filter by seniority level
            </label>
            <select
              id="level-filter-select"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as DifficultyLevel | 'all')}
              className="min-h-[44px] sm:min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Levels</option>
              {Object.values(DifficultyLevel).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>

            <label htmlFor="status-filter-select" className="sr-only">
              Filter by mastery status
            </label>
            <select
              id="status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MasteryStatus | 'all')}
              className="min-h-[44px] sm:min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value={MasteryStatus.Unseen}>Unseen</option>
              <option value={MasteryStatus.Review}>Needs Review</option>
              <option value={MasteryStatus.Mastered}>Mastered</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter interview questions by stack">
          <button
            type="button"
            onClick={() => setTrackFilter('all')}
            className={`min-h-[40px] sm:min-h-[34px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              trackFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All Stacks ({questions.length})
          </button>
          {Object.values(TechTrack).map((track) => (
            <button
              key={track}
              type="button"
              onClick={() => setTrackFilter(track)}
              className={`min-h-[40px] sm:min-h-[34px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                trackFilter === track
                  ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                  : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {TRACK_LABELS[track]}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No interview questions match the current filters
          </div>
          <button
            type="button"
            onClick={() => {
              setTrackFilter('all');
              setLevelFilter('all');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="min-h-[44px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => {
            const isOpen = !!expandedIds[q.id];
            const currentStatus = progress.questionStatus[q.id] ?? MasteryStatus.Unseen;

            return (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/80 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-sky-700 dark:text-sky-400">
                      {TRACK_LABELS[q.track]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{q.topicTag}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.level}</span>
                  </div>

                  {/* Self-assessment Status Segmented Control */}
                  <div
                    className="inline-flex w-fit rounded-lg bg-slate-100 p-1 dark:bg-slate-800 shrink-0"
                    role="group"
                    aria-label={`Mastery status for ${q.topicTag}`}
                  >
                    {[
                      { status: MasteryStatus.Unseen, label: 'Unseen' },
                      { status: MasteryStatus.Review, label: 'Review' },
                      { status: MasteryStatus.Mastered, label: 'Mastered' },
                    ].map((opt) => (
                      <button
                        key={opt.status}
                        type="button"
                        onClick={() => onUpdateQuestionStatus(q.id, opt.status)}
                        className={`min-h-[36px] sm:min-h-[30px] rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                          currentStatus === opt.status
                            ? opt.status === MasteryStatus.Mastered
                              ? 'bg-emerald-600 text-white'
                              : opt.status === MasteryStatus.Review
                                ? 'bg-amber-600 text-white'
                                : 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <h2 className="font-display text-base sm:text-lg font-semibold text-slate-950 dark:text-slate-50 leading-snug max-w-3xl">
                  <InlineProse text={q.prompt} />
                </h2>

                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    What the interviewer is testing:{' '}
                  </span>
                  <InlineProse text={q.whatTheyTest} />
                </p>

                <div>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleExpand(q.id)}
                    className="inline-flex min-h-[42px] sm:min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span>Hide Model Answer</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span>Reveal Theoretical & Practical Answer</span>
                      </>
                    )}
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5 min-w-0">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Theoretical Foundation
                        </h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          <InlineProse text={q.theoreticalAnswer} />
                        </p>
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Practical Production Answer
                        </h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          <InlineProse text={q.practicalAnswer} />
                        </p>
                      </div>
                    </div>

                    {q.codeSnippet && (
                      <CodeBlock
                        label={q.codeSnippet.label}
                        language={q.codeSnippet.language}
                        code={q.codeSnippet.code}
                      />
                    )}

                    {q.followUps.length > 0 && (
                      <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Likely Follow-Up Questions
                        </h3>
                        <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                          {q.followUps.map((f, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              <span className="font-mono text-xs text-sky-700 dark:text-sky-400 mt-0.5 tabular-nums shrink-0">
                                0{idx + 1}.
                              </span>
                              <span className="min-w-0"><InlineProse text={f} /></span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
