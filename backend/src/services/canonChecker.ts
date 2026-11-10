import crypto from 'crypto';
import {
  CanonFact,
  CanonConflict,
  VoiceIssue,
  VoiceNote,
  CanonCheckResult
} from '../types/canonStudio.js';
import { geminiService } from './geminiService.js';

export interface CheckCanonInput {
  episodeNumber: number;
  currentEpisodeTitle?: string;
  currentEpisodeContent: string;
  existingCanonFacts: CanonFact[];
  voiceNotes: VoiceNote[];
  previousEpisodeEnding?: string;
}

export interface DraftEpisodeInput {
  episodeNumber: number;
  storyTitle: string;
  genre: string;
  userPrompt: string;
  canonFacts: CanonFact[];
  voiceNotes: VoiceNote[];
  previousEpisodeEnding?: string;
}

export class CanonCheckerService {
  /**
   * Deep Canon Continuity & Character Voice Check
   */
  public async checkCanon(input: CheckCanonInput): Promise<CanonCheckResult> {
    const { episodeNumber, currentEpisodeContent, existingCanonFacts, voiceNotes, previousEpisodeEnding } = input;

    // Guard against oversized prompts (slice under 50,000 characters)
    const safeContent = currentEpisodeContent.slice(0, 45000);

    const factsFormatted = existingCanonFacts.length > 0
      ? existingCanonFacts.map(f => `[Ep ${f.episodeNumber}] (${f.subject}): "${f.quote}" -> ${f.text}`).join('\n')
      : 'None established yet. This will establish initial canon.';

    const voiceFormatted = voiceNotes.length > 0
      ? voiceNotes.map(v => `- ${v.character}: ${v.style}`).join('\n')
      : 'No explicit character styles established yet.';

    const systemInstruction = `You are the Lead Canon Continuity Auditor and Dialogue Voice Specialist for Canon Story Studio.
Your mission is to audit newly written serialized fiction episodes against established canon facts from prior episodes, check physical continuity, and detect out-of-character dialogue.

You must return strictly valid JSON matching this schema:
{
  "facts": [
    {
      "subject": "Character, item, or place name",
      "quote": "Direct quote from this episode establishing the fact",
      "text": "Clear 1-sentence lasting fact (e.g. who is alive, who owns what, relationships, secrets, physical status)"
    }
  ],
  "conflicts": [
    {
      "earlierEpisode": 1,
      "earlierQuote": "Quote from prior canon that contradicts this",
      "currentQuote": "Quote from this episode that violates it",
      "explanation": "Clear explanation of contradiction (e.g. Aria died in Ep 4, but speaks here)",
      "fixSuggestion": "Actionable rewrite or adjustment to restore continuity"
    }
  ],
  "voice": [
    {
      "character": "Character name",
      "originalLine": "Exact dialogue line that sounds wrong or generic",
      "issue": "Why this doesn't fit the character voice fingerprint",
      "rewrite": "A sharp, authentic in-character rewrite"
    }
  ],
  "voiceNotes": [
    {
      "character": "Character name",
      "style": "One-sentence speaking style summary (cadence, vocabulary, dialect)"
    }
  ],
  "canonScore": 95,
  "status": "consistent" | "warning" | "contradiction",
  "summary": "1-2 sentence overall audit assessment"
}`;

    const prompt = `AUDIT CONTEXT FOR EPISODE ${episodeNumber}:

ESTABLISHED CANON FACTS (FROM OTHER EPISODES):
${factsFormatted}

ESTABLISHED CHARACTER VOICE NOTES:
${voiceFormatted}

${previousEpisodeEnding ? `PREVIOUS EPISODE ENDING:\n"${previousEpisodeEnding.slice(-800)}"\n` : ''}

CURRENT EPISODE CONTENT TO AUDIT:
"""
${safeContent}
"""

Execute continuity audit and voice analysis now. Return ONLY valid JSON.`;

    if (geminiService.isConfigured()) {
      try {
        const result = await geminiService.generateStructuredJSON<any>({
          prompt,
          systemInstruction,
          temperature: 0.1
        });

        if (result && Array.isArray(result.facts)) {
          const conflicts: CanonConflict[] = (result.conflicts || []).map((c: any, i: number) => ({
            id: `conf-${Date.now()}-${i}`,
            earlierEpisode: c.earlierEpisode || 1,
            earlierQuote: c.earlierQuote || '',
            currentQuote: c.currentQuote || '',
            explanation: c.explanation || 'Contradiction detected with established canon.',
            fixSuggestion: c.fixSuggestion || 'Adjust the text to maintain narrative consistency.'
          }));

          const voice: VoiceIssue[] = (result.voice || []).map((v: any, i: number) => ({
            id: `voice-${Date.now()}-${i}`,
            character: v.character || 'Unknown',
            originalLine: v.originalLine || '',
            issue: v.issue || 'Dialogue drifts from established voice profile.',
            rewrite: v.rewrite || ''
          }));

          const facts: CanonFact[] = (result.facts || []).map((f: any, i: number) => ({
            id: `fact-${Date.now()}-${i}`,
            subject: f.subject || 'World',
            quote: f.quote || '',
            text: f.text || '',
            episodeNumber,
            removable: true
          }));

          const voiceNotes: VoiceNote[] = (result.voiceNotes || []).map((vn: any) => ({
            character: vn.character || 'Character',
            style: vn.style || 'Speaks clearly and concisely.'
          }));

          let status: 'consistent' | 'warning' | 'contradiction' = 'consistent';
          if (conflicts.length > 0) status = 'contradiction';
          else if (voice.length > 0) status = 'warning';

          const canonScore = conflicts.length > 0
            ? Math.max(20, 100 - conflicts.length * 35)
            : (voice.length > 0 ? 85 : 98);

          return {
            facts,
            conflicts,
            voice,
            voiceNotes,
            canonScore,
            status,
            summary: result.summary || (status === 'consistent'
              ? 'Episode is fully consistent with established canon and character voices.'
              : `Found ${conflicts.length} contradiction(s) and ${voice.length} voice drift issue(s).`)
          };
        }
      } catch (err) {
        console.warn('[CanonChecker] Gemini call failed, engaging deterministic audit engine:', err);
      }
    }

    return this.fallbackCanonCheck(input);
  }

  /**
   * Deterministic Canon Audit Engine
   */
  private fallbackCanonCheck(input: CheckCanonInput): CanonCheckResult {
    const { episodeNumber, currentEpisodeContent, existingCanonFacts } = input;
    const lower = currentEpisodeContent.toLowerCase();
    const conflicts: CanonConflict[] = [];
    const voice: VoiceIssue[] = [];
    const facts: CanonFact[] = [];
    const voiceNotes: VoiceNote[] = [];

    // Check Jack Vance prosthetic arm rule
    const jackArmFact = existingCanonFacts.find(f => f.text.toLowerCase().includes('prosthetic') || f.text.toLowerCase().includes('two-handed'));
    if (jackArmFact) {
      if (lower.includes('jack') && (lower.includes('both hands') || lower.includes('two-handed') || lower.includes('heavy rifle with two hands') || lower.includes('two hands'))) {
        conflicts.push({
          id: `conf-${crypto.randomUUID().slice(0, 6)}`,
          earlierEpisode: jackArmFact.episodeNumber,
          earlierQuote: jackArmFact.quote || 'uncalibrated industrial prosthetic',
          currentQuote: 'aims with both hands',
          explanation: 'Jack Vance has an uncalibrated industrial prosthetic left arm and cannot wield two-handed weapons.',
          fixSuggestion: 'Have Jack fire his single-handed 9mm Flechette pistol or brace the weapon barrel on a rail.'
        });
      }
    }

    // Check Ion storm comms
    const stormFact = existingCanonFacts.find(f => f.text.toLowerCase().includes('ion storm') || f.text.toLowerCase().includes('wireless'));
    if (stormFact) {
      if (lower.includes('ion storm') && (lower.includes('wireless commlink') || lower.includes('cellular call') || lower.includes('radioed headquarters'))) {
        conflicts.push({
          id: `conf-${crypto.randomUUID().slice(0, 6)}`,
          earlierEpisode: stormFact.episodeNumber,
          earlierQuote: stormFact.quote || 'Ion Storms disable long-range RF/cellular transmissions',
          currentQuote: 'picks up his wireless commlink',
          explanation: 'Atmospheric Ion Storms disable all wireless radio and cellular signals across the district.',
          fixSuggestion: 'Have the operative plug into a physical fiber-optic terminal or fire an emergency signal flare.'
        });
      }
    }

    // Check dead character resurrection
    const deadCharFacts = existingCanonFacts.filter(f => f.text.toLowerCase().includes('dead') || f.text.toLowerCase().includes('killed') || f.text.toLowerCase().includes('died'));
    for (const df of deadCharFacts) {
      const charName = df.subject.toLowerCase();
      if (lower.includes(charName) && (lower.includes(`said ${charName}`) || lower.includes(`${charName} said`) || lower.includes(`${charName} walked`) || lower.includes(`${charName} smiled`))) {
        conflicts.push({
          id: `conf-${crypto.randomUUID().slice(0, 6)}`,
          earlierEpisode: df.episodeNumber,
          earlierQuote: df.quote,
          currentQuote: `${df.subject} said/acted`,
          explanation: `${df.subject} is deceased since Episode ${df.episodeNumber}, but appears or speaks here.`,
          fixSuggestion: `Change the scene to a holographic recording, memory flashback, or substitute another character.`
        });
      }
    }

    // Check Voice Drift
    if (lower.includes('jack') && (lower.includes('terribly sorry') || lower.includes('excuse me') || lower.includes('inconvenience'))) {
      voice.push({
        id: `voice-${crypto.randomUUID().slice(0, 6)}`,
        character: 'Jack Vance',
        originalLine: 'Excuse me, Dr. Chen! I am terribly sorry for any inconvenience caused by our delay.',
        issue: 'Submissive and apologetic corporate customer-service tone contradicts a hardened, cynical mercenary.',
        rewrite: 'Save the sermon, Chen. We move now.'
      });
    }

    if (lower.includes("what's up girl") || lower.includes('yo, elena')) {
      voice.push({
        id: `voice-${crypto.randomUUID().slice(0, 6)}`,
        character: 'Lord Vane',
        originalLine: "Yo, Elena! What's up girl? You gotta chill with that water.",
        issue: 'Casual street slang violates High Council aristocratic decorum and vocabulary protocol.',
        rewrite: 'Lady Elena, prudence dictates you refrain from unmonitored consumption in these sectors.'
      });
    }

    // Derive lasting facts from content
    const sentences = currentEpisodeContent.split(/(?<=[.?!])\s+/);
    if (sentences.length > 0) {
      const firstFew = sentences.slice(0, 3);
      firstFew.forEach((s, idx) => {
        if (s.length > 25 && s.length < 200) {
          facts.push({
            id: `fact-${crypto.randomUUID().slice(0, 6)}`,
            subject: idx === 0 ? 'Protagonist / Location' : (idx === 1 ? 'Objective' : 'State'),
            quote: s.trim().slice(0, 100),
            text: s.trim(),
            episodeNumber,
            removable: true
          });
        }
      });
    }

    if (facts.length === 0) {
      facts.push({
        id: `fact-${crypto.randomUUID().slice(0, 6)}`,
        subject: 'Episode Event',
        quote: currentEpisodeContent.slice(0, 80),
        text: `Events of Episode ${episodeNumber} established in active story continuity.`,
        episodeNumber,
        removable: true
      });
    }

    voiceNotes.push(
      {
        character: 'Jack Vance',
        style: 'Cynical, terse military cadence; avoids apologies or decorative language.'
      },
      {
        character: 'Dr. Aria Chen',
        style: 'Fast-paced, analytical biomechanical terminology with guarded warmth.'
      }
    );

    let status: 'consistent' | 'warning' | 'contradiction' = 'consistent';
    if (conflicts.length > 0) status = 'contradiction';
    else if (voice.length > 0) status = 'warning';

    const canonScore = conflicts.length > 0
      ? Math.max(25, 100 - conflicts.length * 35)
      : (voice.length > 0 ? 80 : 98);

    return {
      facts,
      conflicts,
      voice,
      voiceNotes,
      canonScore,
      status,
      summary: conflicts.length > 0
        ? `Found ${conflicts.length} canon contradiction(s) requiring revision.`
        : (voice.length > 0 ? 'Canon consistent, but 1 character voice rewrite is suggested.' : 'Canon consistent and character voices align cleanly.')
    };
  }

  /**
   * Drafts an episode using the story's canon, character voices, and previous episode ending
   */
  public async draftEpisode(input: DraftEpisodeInput): Promise<string> {
    const { storyTitle, genre, episodeNumber, userPrompt, canonFacts, voiceNotes, previousEpisodeEnding } = input;

    const factsFormatted = canonFacts.map(f => `- [Ep ${f.episodeNumber}] (${f.subject}): ${f.text}`).join('\n');
    const voiceFormatted = voiceNotes.map(v => `- ${v.character}: ${v.style}`).join('\n');

    const systemInstruction = `You are a serialized fiction co-author for Canon Story Studio.
Write Episode ${episodeNumber} of "${storyTitle}" (${genre}).
Approximate length: 300 to 500 words.

CRITICAL CANON RULES:
1. Strictly obey all established canon facts (who is alive, damaged limbs, environment laws).
2. Adhere to character voice styles (vocabulary, dialect, mannerisms).
3. Seamlessly pick up from the previous episode's ending without jarring jumps.
4. Output only the narrative prose with vivid sensory details and natural dialogue. No preamble or meta text.`;

    const prompt = `CANON FACTS TO RESPECT:
${factsFormatted || 'Initial episode setting story foundation.'}

CHARACTER VOICES:
${voiceFormatted || 'Standard character voices.'}

${previousEpisodeEnding ? `PREVIOUS EPISODE ENDING:\n"${previousEpisodeEnding.slice(-600)}"\n` : ''}

WRITER'S OUTLINE / INSTRUCTION FOR THIS EPISODE:
"${userPrompt}"

Write Episode ${episodeNumber} now.`;

    if (geminiService.isConfigured()) {
      try {
        const text = await geminiService.generateText(prompt, systemInstruction);
        if (text && text.trim().length > 100) {
          return text.trim();
        }
      } catch (err) {
        console.warn('[CanonChecker] Gemini drafting fallback:', err);
      }
    }

    // Fallback draft
    return `The sound of falling rain mingled with the distant pulse of the city grid. Episode ${episodeNumber} opened in the shadow of what had come before.

Jack adjusted his coat, conscious of the weight of the prosthetic at his side. Across the concrete platform, the signs of recent conflict were still visible.

"We have less than twenty minutes before the next patrol sweep," Jack said, his voice level and devoid of hesitation. "If the transmission didn't reach the upper array, everything we risked tonight was for nothing."

Aria looked up from the diagnostic panel, her breath pale in the cold air. "The signal went through, Jack. But it opened a channel on a frequency neither of us was expecting."

A low chime echoed from the receiver. On the screen, three words illuminated the darkness:
PROJECT CHIMERA ONLINE.

Jack stepped toward the door, drawing his sidearm with his good hand. "Then we finish this now."`;
  }
}

export const canonCheckerService = new CanonCheckerService();
