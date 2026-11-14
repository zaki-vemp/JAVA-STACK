import { useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';
import {
  MasteryStatus,
  TechTrack,
  type InterviewQuestion,
} from '../types/curriculum';
import { generateMockInterviewSet, TRACK_LABELS } from '../utils/studyProgress';
import { InlineProse } from './InlineProse';

interface MockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: InterviewQuestion[];
  onRecordStatus: (questionId: string, status: MasteryStatus) => void;
}

export function MockInterviewModal({
  isOpen,
  onClose,
  questions,
  onRecordStatus,
}: MockInterviewModalProps) {
  const [selectedTrack, setSelectedTrack] = useState<TechTrack | 'all'>('all');
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [grades, setGrades] = useState<Record<string, 'strong' | 'review'>>({});

  const sessionQuestions = useMemo(
    () => generateMockInterviewSet(questions, selectedTrack, 5),
    [questions, selectedTrack]
  );

  if (!isOpen) return null;

  const isFinished = started && currentIdx >= sessionQuestions.length;
  const activeQuestion = sessionQuestions[currentIdx];

  const handleGrade = (result: 'strong' | 'review') => {
    if (!activeQuestion) return;
    setGrades((prev) => ({ ...prev, [activeQuestion.id]: result }));
    onRecordStatus(
      activeQuestion.id,
      result === 'strong' ? MasteryStatus.Mastered : MasteryStatus.Review
    );
    setAnswerRevealed(false);
    setCurrentIdx((i) => i + 1);
  };

  const handleRestart = () => {
    setStarted(false);
    setCurrentIdx(0);
    setAnswerRevealed(false);
    setGrades({});
  };

  const strongCount = Object.values(grades).filter((g) => g === 'strong').length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-interview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="mock-interview-title"
              className="font-display text-lg font-bold text-slate-950 dark:text-slate-50"
            >
              Mock Technical Interview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              5-question structured drill updating your mastery tracker
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mock interview"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {!started ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Choose Interview Focus
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTrack('all')}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-colors ${
                      selectedTrack === 'all'
                        ? 'border-sky-500 bg-sky-50 text-sky-950 font-semibold dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-100'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Full-Stack Mix
                  </button>
                  {Object.values(TechTrack).map((track) => (
                    <button
                      key={track}
                      type="button"
                      onClick={() => setSelectedTrack(track)}
                      className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-colors ${
                        selectedTrack === track
                          ? 'border-sky-500 bg-sky-50 text-sky-950 font-semibold dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-100'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {TRACK_LABELS[track]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 leading-relaxed">
                Speak your answer out loud covering both the runtime mechanism (theory) and what you would ship in production (practical), then reveal the rubric to grade yourself.
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setStarted(true);
                    setCurrentIdx(0);
                    setAnswerRevealed(false);
                    setGrades({});
                  }}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  Start {sessionQuestions.length}-Question Session
                </button>
              </div>
            </div>
          ) : isFinished ? (
            <div className="space-y-5 text-center py-4">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold text-slate-950 dark:text-slate-50">
                  Session Complete
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                  You rated <span className="font-semibold">{strongCount}</span> of{' '}
                  {sessionQuestions.length} answers as Strong. Your Interview Bank statuses have been updated.
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>New Session</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            activeQuestion && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono tabular-nums">
                    Question {currentIdx + 1} of {sessionQuestions.length}
                  </span>
                  <span>
                    {TRACK_LABELS[activeQuestion.track]} · {activeQuestion.level}
                  </span>
                </div>

                <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-slate-50 leading-snug">
                  <InlineProse text={activeQuestion.prompt} />
                </h3>

                <div className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Signal:{' '}
                  </span>
                  <InlineProse text={activeQuestion.whatTheyTest} />
                </div>

                {!answerRevealed ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setAnswerRevealed(true)}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950"
                    >
                      Reveal Answer Rubric
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-500 uppercase">Theory</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        <InlineProse text={activeQuestion.theoreticalAnswer} />
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-500 uppercase">Practical</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        <InlineProse text={activeQuestion.practicalAnswer} />
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Grade your recall:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleGrade('review')}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                        >
                          Needs Review
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGrade('strong')}
                          className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Strong Answer
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
