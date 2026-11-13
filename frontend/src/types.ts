export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface Episode {
  id: string;
  order: number;
  title: string;
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonFact {
  id: string;
  subject: string;
  quote: string;
  text: string;
  episodeNumber: number;
  removable?: boolean;
}

export interface CanonConflict {
  id: string;
  earlierEpisode: number;
  earlierQuote: string;
  currentQuote: string;
  explanation: string;
  fixSuggestion: string;
}

export interface VoiceIssue {
  id: string;
  character: string;
  originalLine: string;
  issue: string;
  rewrite: string;
}

export interface VoiceNote {
  character: string;
  style: string;
}

export interface CanonCheckResult {
  facts: CanonFact[];
  conflicts: CanonConflict[];
  voice: VoiceIssue[];
  voiceNotes: VoiceNote[];
  canonScore: number;
  status: 'consistent' | 'warning' | 'contradiction';
  summary: string;
}

export interface Draft {
  id: string;
  userId: string;
  title: string;
  genre: string;
  blurb: string;
  episodes: Episode[];
  canonFacts: CanonFact[];
  voiceNotes: VoiceNote[];
  publishedBookId?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  draftId?: string;
  authorId: string;
  authorName: string;
  title: string;
  genre: string;
  blurb: string;
  episodes: Episode[];
  publishedAt: string;
  updatedAt: string;
  episodeCount: number;
  avgRating: number;
  ratingCount: number;
  likesCount: number;
  userHasLiked?: boolean;
  userRating?: number;
  bestRankScore?: number;
  rank?: number;
  formulaDetails?: {
    avgRating: number;
    ratingCount: number;
    globalMean: number;
    weightedRating: number;
    likesBonus: number;
    totalScore: number;
  };
}

export interface WizardOption {
  label: string;
  sub: string;
}

export interface WizardQuestion {
  question: string;
  hint: string;
  options: WizardOption[];
}

export interface BranchOption {
  id: string;
  text: string;
  type: 'bold' | 'careful' | 'unexpected';
  explored?: boolean;
}

export interface BranchScene {
  id: string;
  sceneNumber: number;
  content: string;
  sceneContent?: string;
  activeLoreAnchors?: Array<{ id: string; label: string; detail: string }>;
  styleTone?: string;
  isEnding: boolean;
  options: BranchOption[];
  parentId?: string | null;
  choiceTaken?: string;
}

// Visual Tree representation
export interface TreeNode {
  id: string;
  sceneNumber: number;
  label: string;
  isEnding: boolean;
  isCurrent: boolean;
  isActivePath: boolean;
  scene: BranchScene;
  parentId?: string | null;
  children: string[];
}

// Backward-compatibility types
export interface LoreAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  detectedText: string;
  canonRule: string;
  solution: string;
}

export interface CharacterVoiceScore {
  character: string;
  score: number;
  criticism: string;
  suggestedRephrase?: string;
  toneTraits: Array<{ name: string; value: number }>;
}

export interface StoryNode {
  id: string;
  title: string;
  summary: string;
  state: {
    inventory: string[];
    reputation: Record<string, number>;
  };
}

export interface UniverseProfile {
  id: string;
  name: string;
  era: string;
}

export interface SceneMeta {
  id: string;
  title: string;
  act: string;
}
