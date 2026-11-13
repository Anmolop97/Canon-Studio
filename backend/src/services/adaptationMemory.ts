import { cyberpunkUniverse } from '../data/defaultStoryBible.js';

export interface AdaptationInput {
  idea?: string;
  genre?: string;
  realism?: string;
  language?: string;
  characterSheet?: string;
  worldLore?: string | string[];
  canonRules?: string[];
  styleTone?: string;
}

export interface LoreAnchor {
  id: string;
  label: string;
  detail: string;
}

export interface AdaptationContext {
  activeCharacterSheet: string;
  worldLoreRules: string[];
  styleTone: string;
  activeLoreAnchors: LoreAnchor[];
}

const MAX_CONTEXT_CHARS = 1_200;
const MAX_RULES = 8;

function cleanText(value: unknown, maxLength = MAX_CONTEXT_CHARS): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function asTextList(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map(item => cleanText(item, 500)).filter(Boolean).slice(0, MAX_RULES);
}

function toTokens(value: string): Set<string> {
  return new Set(value.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
}

export function buildAdaptationContext(input: AdaptationInput): AdaptationContext {
  const idea = cleanText(input.idea);
  const genre = cleanText(input.genre, 100) || 'General fiction';
  const realism = cleanText(input.realism, 160) || 'Creator-defined world';
  const contextText = [idea, genre, realism, cleanText(input.characterSheet), ...asTextList(input.worldLore), ...asTextList(input.canonRules)].join(' ');
  const contextTokens = toTokens(contextText);

  const explicitCharacter = cleanText(input.characterSheet);
  const matchedCharacter = cyberpunkUniverse.characters.find(character => {
    const nameTokens = toTokens(character.name);
    return [...nameTokens].some(token => contextTokens.has(token));
  });
  const activeCharacterSheet = explicitCharacter
    ? `Creator-defined character sheet: ${explicitCharacter}. Treat the creator's stated identity and traits as canon.`
    : matchedCharacter
      ? `${matchedCharacter.name}; archetype: ${matchedCharacter.archetype}; speech mannerisms: ${matchedCharacter.speechMannerisms}; signature phrases: ${matchedCharacter.signaturePhrases.join(', ')}; avoid: ${matchedCharacter.forbiddenPatterns.join(', ')}.`
      : `Active protagonist: infer the protagonist from the creator's premise (${idea || 'the supplied story answers'}). Preserve identity, motivations, and established traits; do not invent contradictions.`;

  const providedRules = [...asTextList(input.worldLore), ...asTextList(input.canonRules)];
  const matchingRules = cyberpunkUniverse.rules
    .map(rule => {
      const ruleTokens = toTokens(`${rule.title} ${rule.content} ${rule.category}`);
      const score = [...ruleTokens].reduce((total, token) => total + Number(contextTokens.has(token)), 0);
      return { rule, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ rule }) => ({ id: rule.ruleId, label: rule.title, detail: rule.content }));

  const continuityRule = 'Preserve facts, character states, and consequences established earlier in this story; do not silently reverse them.';
  const genericWorldRules = [
    `Creator's world: ${[genre, realism, cleanText(input.worldLore, 500)].filter(Boolean).join(' · ')}. Treat the premise and any supplied world details as canon.`,
    `Continuity rule: ${continuityRule}`
  ];
  const customWorldRules = providedRules.map((detail, index) => ({
    id: `creator-lore-${index + 1}`,
    label: index < asTextList(input.worldLore).length ? 'Creator world lore' : 'Creator canon rule',
    detail
  }));
  const selectedRules = customWorldRules.length > 0
    ? [...customWorldRules, { id: 'continuity-rule', label: 'Continuity rule', detail: continuityRule }]
    : matchingRules.length > 0
      ? matchingRules
      : genericWorldRules.map((detail, index) => ({
          id: `continuity-${index + 1}`,
          label: index === 0 ? 'Active world setting' : 'Continuity rule',
          detail
        }));

  const styleTone = cleanText(input.styleTone, 200) || `${realism} ${genre} tone; vivid, character-led, and internally consistent.`;
  const characterAnchor: LoreAnchor = {
    id: matchedCharacter?.characterId || 'active-protagonist',
    label: matchedCharacter ? `Character: ${matchedCharacter.name}` : 'Active character sheet',
    detail: activeCharacterSheet
  };
  const activeLoreAnchors = [characterAnchor, ...selectedRules].slice(0, MAX_RULES + 1);

  return {
    activeCharacterSheet,
    worldLoreRules: selectedRules.map(rule => `${rule.label}: ${rule.detail}`),
    styleTone,
    activeLoreAnchors
  };
}

export function formatAdaptationContext(context: AdaptationContext): string {
  return `ADAPTATION CONTEXT — treat these as active creative constraints, not optional suggestions.
Active Character Sheet:
${context.activeCharacterSheet}

World Lore / Canon Rules:
${context.worldLoreRules.map(rule => `- ${rule}`).join('\n')}

Style Tone:
${context.styleTone}`;
}
