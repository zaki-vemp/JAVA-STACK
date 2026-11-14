import {
  DifficultyLevel,
  MasteryStatus,
  TechTrack,
  type DocTopic,
  type InterviewQuestion,
  type StudyProgressState,
  type SyntaxDrill,
} from '../types/curriculum';

export const DEFAULT_PROGRESS_STATE: StudyProgressState = {
  completedTopics: [],
  solvedDrills: [],
  questionStatus: {},
};

export interface TrackSummaryMetric {
  track: TechTrack;
  label: string;
  topicsCompleted: number;
  topicsTotal: number;
  drillsSolved: number;
  drillsTotal: number;
  questionsMastered: number;
  questionsTotal: number;
  overallPercent: number;
}

export const TRACK_LABELS: Record<TechTrack, string> = {
  [TechTrack.Java]: 'Java & JVM',
  [TechTrack.Kotlin]: 'Kotlin & Coroutines',
  [TechTrack.SpringBoot]: 'Spring Boot',
  [TechTrack.PostgreSQL]: 'PostgreSQL',
  [TechTrack.FullStack]: 'Full-Stack APIs',
};

export function filterTopics(
  topics: DocTopic[],
  trackFilter: TechTrack | 'all',
  query: string
): DocTopic[] {
  const q = query.trim().toLowerCase();
  return topics.filter((topic) => {
    if (trackFilter !== 'all' && topic.track !== trackFilter) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      topic.title,
      topic.subtitle,
      topic.theoreticalDeepDive.heading,
      ...topic.theoreticalDeepDive.paragraphs,
      ...topic.pitfalls.map((p) => `${p.title} ${p.rootCause}`),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterInterviewQuestions(
  questions: InterviewQuestion[],
  options: {
    track: TechTrack | 'all';
    level: DifficultyLevel | 'all';
    status: MasteryStatus | 'all';
    query: string;
    progress: StudyProgressState;
  }
): InterviewQuestion[] {
  const q = options.query.trim().toLowerCase();
  return questions.filter((item) => {
    if (options.track !== 'all' && item.track !== options.track) return false;
    if (options.level !== 'all' && item.level !== options.level) return false;

    const currentStatus = options.progress.questionStatus[item.id] ?? MasteryStatus.Unseen;
    if (options.status !== 'all' && currentStatus !== options.status) return false;

    if (!q) return true;
    const searchable = [
      item.prompt,
      item.topicTag,
      item.whatTheyTest,
      item.theoreticalAnswer,
      item.practicalAnswer,
    ]
      .join(' ')
      .toLowerCase();
    return searchable.includes(q);
  });
}

export function computeTrackMetrics(
  topics: DocTopic[],
  drills: SyntaxDrill[],
  questions: InterviewQuestion[],
  progress: StudyProgressState
): TrackSummaryMetric[] {
  const tracks = Object.values(TechTrack);

  return tracks.map((track) => {
    const trackTopics = topics.filter((t) => t.track === track);
    const trackDrills = drills.filter((d) => d.track === track);
    const trackQuestions = questions.filter((q) => q.track === track);

    const topicsCompleted = trackTopics.filter((t) =>
      progress.completedTopics.includes(t.id)
    ).length;
    const drillsSolved = trackDrills.filter((d) =>
      progress.solvedDrills.includes(d.id)
    ).length;
    const questionsMastered = trackQuestions.filter(
      (q) => progress.questionStatus[q.id] === MasteryStatus.Mastered
    ).length;

    const totalItems = trackTopics.length + trackDrills.length + trackQuestions.length;
    const completedItems = topicsCompleted + drillsSolved + questionsMastered;
    const overallPercent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

    return {
      track,
      label: TRACK_LABELS[track],
      topicsCompleted,
      topicsTotal: trackTopics.length,
      drillsSolved,
      drillsTotal: trackDrills.length,
      questionsMastered,
      questionsTotal: trackQuestions.length,
      overallPercent,
    };
  });
}

export function computeOverallReadiness(
  topics: DocTopic[],
  drills: SyntaxDrill[],
  questions: InterviewQuestion[],
  progress: StudyProgressState
): { completedCount: number; totalCount: number; percent: number } {
  const totalCount = topics.length + drills.length + questions.length;
  const masteredQuestions = questions.filter(
    (q) => progress.questionStatus[q.id] === MasteryStatus.Mastered
  ).length;
  const completedCount =
    topics.filter((t) => progress.completedTopics.includes(t.id)).length +
    drills.filter((d) => progress.solvedDrills.includes(d.id)).length +
    masteredQuestions;

  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percent };
}

export function generateMockInterviewSet(
  questions: InterviewQuestion[],
  track: TechTrack | 'all',
  count: number = 5
): InterviewQuestion[] {
  const pool =
    track === 'all' ? questions : questions.filter((q) => q.track === track);

  if (pool.length <= count) return [...pool];

  // Deterministic balanced selection prioritizing diversity across levels
  const ordered = [...pool].sort((a, b) => {
    const rank = (lvl: DifficultyLevel) =>
      lvl === DifficultyLevel.Mid ? 0 : lvl === DifficultyLevel.Senior ? 1 : 2;
    return rank(a.level) - rank(b.level) || a.id.localeCompare(b.id);
  });

  const step = ordered.length / count;
  const selected: InterviewQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(ordered.length - 1, Math.floor(i * step));
    selected.push(ordered[idx]);
  }
  return selected;
}
