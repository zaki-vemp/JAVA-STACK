import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { DocumentationView } from './components/DocumentationView';
import { FullStackMapView } from './components/FullStackMapView';
import { HeaderNav } from './components/HeaderNav';
import { InterviewBankView } from './components/InterviewBankView';
import { MockInterviewModal } from './components/MockInterviewModal';
import { SpringBootGuideView } from './components/SpringBootGuideView';
import { SyntaxStudioView } from './components/SyntaxStudioView';
import { FULL_STACK_LAYERS } from './data/fullStackMap';
import { INTERVIEW_QUESTIONS } from './data/interviewQuestions';
import { SYNTAX_DRILLS } from './data/syntaxDrills';
import { DOC_TOPICS } from './data/topics';
import {
  AppSection,
  MasteryStatus,
  TechTrack,
  type StudyProgressState,
} from './types/curriculum';
import {
  computeOverallReadiness,
  computeTrackMetrics,
  DEFAULT_PROGRESS_STATE,
} from './utils/studyProgress';

const STORAGE_PROGRESS_KEY = 'stackatlas.study.progress.v1';
const STORAGE_THEME_KEY = 'stackatlas.theme.v1';

function loadInitialProgress(): StudyProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS_STATE;
    const parsed = JSON.parse(raw) as Partial<StudyProgressState>;
    return {
      completedTopics: Array.isArray(parsed.completedTopics) ? parsed.completedTopics : [],
      solvedDrills: Array.isArray(parsed.solvedDrills) ? parsed.solvedDrills : [],
      questionStatus:
        parsed.questionStatus && typeof parsed.questionStatus === 'object'
          ? parsed.questionStatus
          : {},
    };
  } catch {
    return DEFAULT_PROGRESS_STATE;
  }
}

function loadInitialDark(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_THEME_KEY) === 'dark';
  } catch {
    return false;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.Architecture);
  const [activeTopicId, setActiveTopicId] = useState<string>(DOC_TOPICS[0].id);
  const [activeDrillId, setActiveDrillId] = useState<string>(SYNTAX_DRILLS[0].id);
  const [interviewTrackFilter, setInterviewTrackFilter] = useState<TechTrack | 'all'>('all');
  const [mockOpen, setMockOpen] = useState<boolean>(false);

  const [progress, setProgress] = useState<StudyProgressState>(loadInitialProgress);
  const [isDark, setIsDark] = useState<boolean>(loadInitialDark);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(STORAGE_THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage quota errors
    }
  }, [isDark]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  const readiness = useMemo(
    () => computeOverallReadiness(DOC_TOPICS, SYNTAX_DRILLS, INTERVIEW_QUESTIONS, progress),
    [progress]
  );

  const trackMetrics = useMemo(
    () => computeTrackMetrics(DOC_TOPICS, SYNTAX_DRILLS, INTERVIEW_QUESTIONS, progress),
    [progress]
  );

  const handleToggleTopicComplete = (topicId: string) => {
    setProgress((prev) => {
      const exists = prev.completedTopics.includes(topicId);
      return {
        ...prev,
        completedTopics: exists
          ? prev.completedTopics.filter((id) => id !== topicId)
          : [...prev.completedTopics, topicId],
      };
    });
  };

  const handleMarkDrillSolved = (drillId: string) => {
    setProgress((prev) => {
      if (prev.solvedDrills.includes(drillId)) return prev;
      return {
        ...prev,
        solvedDrills: [...prev.solvedDrills, drillId],
      };
    });
  };

  const handleUpdateQuestionStatus = (questionId: string, status: MasteryStatus) => {
    setProgress((prev) => ({
      ...prev,
      questionStatus: {
        ...prev.questionStatus,
        [questionId]: status,
      },
    }));
  };

  const handleOpenDrill = (drillId: string) => {
    setActiveDrillId(drillId);
    setActiveSection(AppSection.SyntaxStudio);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenQuestionsForTrack = (track: TechTrack) => {
    setInterviewTrackFilter(track);
    setActiveSection(AppSection.InterviewBank);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToDocs = (topicId: string) => {
    setActiveTopicId(topicId);
    setActiveSection(AppSection.Architecture);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HeaderNav
        activeSection={activeSection}
        onSelectSection={(section) => {
          if (section === AppSection.InterviewBank) {
            setInterviewTrackFilter('all');
          }
          setActiveSection(section);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }}
        onOpenMockInterview={() => setMockOpen(true)}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-7">
        {/* Compact Unboxed Workspace Context & Readiness Strip */}
        <section
          aria-label="Study readiness overview"
          className="border-b border-slate-200 pb-3.5 dark:border-slate-800 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-400 min-w-0">
              <span className="hidden sm:inline">Full-Stack JVM & PostgreSQL Curriculum · </span>
              <span
                className="font-mono font-semibold text-slate-950 dark:text-slate-100 tabular-nums"
                data-testid="overall-readiness-percent"
              >
                {readiness.percent}%
              </span>{' '}
              <span>
                readiness ({readiness.completedCount}/{readiness.totalCount} items)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 transition-colors"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-0.5 text-xs text-slate-600 dark:text-slate-300">
            {trackMetrics.map((m) => (
              <button
                key={m.track}
                type="button"
                onClick={() => {
                  const firstTopic = DOC_TOPICS.find((t) => t.track === m.track);
                  if (firstTopic) {
                    setActiveTopicId(firstTopic.id);
                    setActiveSection(AppSection.Architecture);
                  }
                }}
                className="inline-flex items-center gap-1.5 py-1 hover:text-sky-700 dark:hover:text-sky-400 transition-colors tabular-nums whitespace-nowrap shrink-0"
              >
                <span className="font-medium">{m.label}:</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {m.overallPercent}%
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Active Section Canvas */}
        {activeSection === AppSection.Architecture && (
          <DocumentationView
            topics={DOC_TOPICS}
            activeTopicId={activeTopicId}
            onSelectTopic={setActiveTopicId}
            completedTopics={progress.completedTopics}
            onToggleTopicComplete={handleToggleTopicComplete}
            onOpenDrill={handleOpenDrill}
            onOpenQuestionsForTrack={handleOpenQuestionsForTrack}
          />
        )}

        {activeSection === AppSection.SpringBoot && (
          <SpringBootGuideView
            onOpenDrill={handleOpenDrill}
            onOpenSpringQuestions={handleOpenQuestionsForTrack}
          />
        )}

        {activeSection === AppSection.SyntaxStudio && (
          <SyntaxStudioView
            drills={SYNTAX_DRILLS}
            activeDrillId={activeDrillId}
            onSelectDrill={setActiveDrillId}
            solvedDrills={progress.solvedDrills}
            onMarkDrillSolved={handleMarkDrillSolved}
          />
        )}

        {activeSection === AppSection.InterviewBank && (
          <InterviewBankView
            questions={INTERVIEW_QUESTIONS}
            progress={progress}
            initialTrackFilter={interviewTrackFilter}
            onUpdateQuestionStatus={handleUpdateQuestionStatus}
          />
        )}

        {activeSection === AppSection.FullStackMap && (
          <FullStackMapView
            layers={FULL_STACK_LAYERS}
            onJumpToDocs={handleJumpToDocs}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400">
          <span>StackAtlas — Java, Kotlin, Spring Boot & PostgreSQL Interview Workbench</span>
          <span>Progress stored locally in your browser</span>
        </div>
      </footer>

      <MockInterviewModal
        isOpen={mockOpen}
        onClose={() => setMockOpen(false)}
        questions={INTERVIEW_QUESTIONS}
        onRecordStatus={handleUpdateQuestionStatus}
      />
    </div>
  );
}
