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
}

export interface LikeRecord {
  id: string;
  bookId: string;
  userId: string;
  createdAt: string;
}

export interface RatingRecord {
  id: string;
  bookId: string;
  userId: string;
  score: number; // 1 to 5
  createdAt: string;
  updatedAt: string;
}

export interface BookCardData extends Book {
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

export interface WizardQuestionOption {
  label: string;
  sub: string;
}

export interface WizardQuestionResponse {
  question: string;
  hint: string;
  options: WizardQuestionOption[];
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
  content: string; // 110-170 words
  sceneContent?: string;
  activeLoreAnchors?: Array<{ id: string; label: string; detail: string }>;
  styleTone?: string;
  isEnding: boolean;
  options: BranchOption[];
  parentId?: string | null;
  choiceTaken?: string;
}
