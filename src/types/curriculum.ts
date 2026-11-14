export enum TechTrack {
  Java = 'java',
  Kotlin = 'kotlin',
  SpringBoot = 'spring-boot',
  PostgreSQL = 'postgresql',
  FullStack = 'full-stack',
}

export enum DifficultyLevel {
  Mid = 'Mid-Level',
  Senior = 'Senior',
  Staff = 'Staff',
}

export enum SimulatorKind {
  SpringProxy = 'spring-proxy',
  PostgresMvcc = 'postgres-mvcc',
  JvmVirtualThreads = 'jvm-virtual-threads',
  ResilienceOutbox = 'resilience-outbox',
  PostgresIndexes = 'postgres-indexes',
  KotlinCoroutines = 'kotlin-coroutines',
}

export enum MasteryStatus {
  Unseen = 'unseen',
  Review = 'review',
  Mastered = 'mastered',
}

export enum AppSection {
  Architecture = 'architecture',
  SpringBoot = 'spring-boot',
  InterviewBank = 'interview-bank',
  SyntaxStudio = 'syntax-studio',
  FullStackMap = 'full-stack-map',
}

export interface CodeBlockExample {
  label: string;
  language: 'java' | 'kotlin' | 'sql' | 'yaml' | 'typescript';
  code: string;
  caption?: string;
}

export interface TopicPitfall {
  title: string;
  symptom: string;
  rootCause: string;
  fix: string;
}

export interface VisualCueCallout {
  cueLabel: string;
  title: string;
  explanation: string;
}

export interface DocTopic {
  id: string;
  order: string;
  track: TechTrack;
  title: string;
  subtitle: string;
  level: DifficultyLevel;
  readMinutes: number;
  interviewWeight: 'Core Signal' | 'High Frequency' | 'Staff Differentiator';
  simulator?: SimulatorKind;
  simulatorTitle?: string;
  simulatorSummary?: string;
  theoreticalDeepDive: {
    heading: string;
    paragraphs: string[];
    keyInvariants: string[];
  };
  practicalImplementation: {
    heading: string;
    summary: string;
    examples: CodeBlockExample[];
  };
  visualCues: VisualCueCallout[];
  pitfalls: TopicPitfall[];
  linkedDrillId: string;
  linkedQuestionIds: string[];
}

export interface InterviewQuestion {
  id: string;
  track: TechTrack;
  level: DifficultyLevel;
  topicTag: string;
  prompt: string;
  whatTheyTest: string;
  theoreticalAnswer: string;
  practicalAnswer: string;
  codeSnippet?: CodeBlockExample;
  followUps: string[];
}

export interface SyntaxRuleCheck {
  id: string;
  description: string;
  pattern: string;
  flags?: string;
  required: boolean;
  errorHint: string;
}

export interface SyntaxDrill {
  id: string;
  track: TechTrack;
  mode: 'write' | 'spot-bug';
  title: string;
  language: 'java' | 'kotlin' | 'sql' | 'typescript';
  level: DifficultyLevel;
  prompt: string;
  starterCode: string;
  solutionCode: string;
  explanation: string;
  checks: SyntaxRuleCheck[];
  bugOptions?: {
    id: string;
    label: string;
    isCorrect: boolean;
    rationale: string;
  }[];
}

export interface FullStackLayerNode {
  id: string;
  stepNumber: string;
  layerName: string;
  technologies: string[];
  latencyBudget: string;
  theoreticalRole: string;
  practicalResponsibilities: string[];
  failureMode: string;
  interviewCheck: string;
  codePreview: CodeBlockExample;
}

export interface StudyProgressState {
  completedTopics: string[];
  solvedDrills: string[];
  questionStatus: Record<string, MasteryStatus>;
}

export interface SpringBootFileNode {
  id: string;
  path: string;
  layer: 'Bootstrap' | 'Web / API' | 'Domain / Service' | 'Persistence' | 'Cross-Cutting' | 'Config' | 'Testing';
  roleSummary: string;
  keyAnnotations: string[];
  architecturalRule: string;
  language: 'java' | 'yaml';
  code: string;
}

export interface SpringBootChapter {
  id: string;
  order: string;
  title: string;
  subtitle: string;
  category: 'Core & IoC' | 'Architecture' | 'Web & APIs' | 'Data & Persistence' | 'Transactions & Async' | 'Ops & Config' | 'Testing';
  readMinutes: number;
  summaryTakeaway: string;
  lifecycleSteps: {
    step: string;
    component: string;
    responsibility: string;
  }[];
  theoryParagraphs: string[];
  architectureRules: string[];
  codeExamples: CodeBlockExample[];
  pitfalls: TopicPitfall[];
  linkedDrillId: string;
}

