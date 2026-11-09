export type ViolationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ViolationCategory = 
  | 'LORE_PHYSICS' 
  | 'CHARACTER_STATE' 
  | 'TEMPORAL_PARADOX' 
  | 'MAGIC_TECH_RULE' 
  | 'WORLD_GEOGRAPHY';

export interface LoreViolation {
  id: string;
  severity: ViolationSeverity;
  category: ViolationCategory;
  flaggedText: string;
  violatedRule: string;
  explanation: string;
  suggestedFix: string;
}

export interface LoreAuditResponse {
  hasViolations: boolean;
  totalViolations: number;
  violations: LoreViolation[];
  canonConsistencyScore: number; // 0-100
  auditSummary: string;
}

export interface CharacterVoiceProfile {
  characterId: string;
  name: string;
  archetype: string;
  formality: number; // 0 (street slang) - 100 (high court)
  cynicism: number; // 0 (idealist) - 100 (nihilist)
  aggression: number; // 0 (passive) - 100 (confrontational)
  signaturePhrases: string[];
  forbiddenPatterns: string[];
  speechMannerisms: string;
}

export interface VoiceFidelityResponse {
  character: string;
  fidelityScore: number; // 0-100
  verdict: 'IN_CHARACTER' | 'MINOR_DRIFT' | 'OUT_OF_CHARACTER';
  voiceDriftReason: string | null;
  detectedMetrics: {
    formality: number;
    cynicism: number;
    aggression: number;
  };
  recommendedRewrite: string;
}

export interface StoryNodeChoice {
  id: string;
  choiceText: string;
  targetNodeId: string;
  stateDelta: {
    factionReputation?: Record<string, number>;
    inventoryChanges?: string[];
    secretsUnlocked?: string[];
    statusChanges?: Record<string, string>;
  };
}

export interface StoryNode {
  id: string;
  episodeNumber: number;
  sceneTitle: string;
  summary: string;
  activeState: {
    factionReputation: Record<string, number>;
    inventory: string[];
    unlockedSecrets: string[];
    characterStatus: Record<string, string>;
  };
  choices: StoryNodeChoice[];
}

export interface StoryBible {
  universeName: string;
  universeLogline: string;
  rules: {
    ruleId: string;
    title: string;
    category: ViolationCategory;
    content: string;
  }[];
  characters: CharacterVoiceProfile[];
  initialState: StoryNode['activeState'];
}
