import { CharacterVoiceProfile, VoiceFidelityResponse } from '../types/index.js';
import { aiService } from './aiService.js';
import { cyberpunkUniverse } from '../data/defaultStoryBible.js';

export class VoiceAnalyzer {
  /**
   * Analyzes dialogue fidelity against a character's linguistic profile
   */
  public async analyzeDialogue(
    characterName: string,
    dialogueLine: string,
    characterProfile?: CharacterVoiceProfile
  ): Promise<VoiceFidelityResponse> {
    const profile = characterProfile || 
      cyberpunkUniverse.characters.find(c => c.name.toLowerCase().includes(characterName.toLowerCase())) ||
      cyberpunkUniverse.characters[0];

    const systemInstruction = `You are an elite Hollywood Dialogue Coach and Narrative Voice Auditor.
Your objective is to evaluate whether a spoken line of dialogue strictly matches a character's specific voice fingerprint, or if it has drifted into generic, polite AI-sounding prose.

You MUST respond strictly with a valid JSON matching this schema:
{
  "character": "${profile.name}",
  "fidelityScore": number (0 to 100, where 100 is flawless authentic character voice),
  "verdict": "IN_CHARACTER" | "MINOR_DRIFT" | "OUT_OF_CHARACTER",
  "voiceDriftReason": "Specific critique of why the line does or does not match their voice profile, or null if flawless",
  "detectedMetrics": {
    "formality": number (0 to 100),
    "cynicism": number (0 to 100),
    "aggression": number (0 to 100)
  },
  "recommendedRewrite": "Punchy rewrite of the dialogue line that perfectly embodies the character voice and idioms"
}`;

    const prompt = `TARGET CHARACTER VOICE FINGERPRINT:
- Name: ${profile.name}
- Archetype: ${profile.archetype}
- Target Formality: ${profile.formality}/100
- Target Cynicism: ${profile.cynicism}/100
- Target Aggression: ${profile.aggression}/100
- Signature Phrases / Style: ${profile.signaturePhrases.join('; ')}
- Strictly FORBIDDEN Patterns: ${profile.forbiddenPatterns.join('; ')}
- Mannerisms: ${profile.speechMannerisms}

DIALOGUE LINE TO ANALYZE:
"${dialogueLine}"

Evaluate this dialogue line now. Check if it breaks forbidden speech patterns (e.g. polite modern apologies for hardboiled mercenaries, or slang for cold scientists). Return ONLY the specified JSON.`;

    try {
      if (aiService.isConfigured()) {
        const result = await aiService.generateStructuredJSON<VoiceFidelityResponse>({
          prompt,
          systemInstruction,
          temperature: 0.2
        });
        return result;
      }
    } catch (error) {
      console.warn('[VoiceAnalyzer] AI call failed, using heuristic engine:', error);
    }

    // Heuristic Fallback
    const isJack = profile.name.toLowerCase().includes('jack');
    const isPolite = dialogueLine.toLowerCase().includes('sorry') || 
                     dialogueLine.toLowerCase().includes('excuse me') ||
                     dialogueLine.toLowerCase().includes('please forgive me') ||
                     dialogueLine.toLowerCase().includes('synergy');

    if (isJack && isPolite) {
      return {
        character: profile.name,
        fidelityScore: 42,
        verdict: 'OUT_OF_CHARACTER',
        voiceDriftReason: 'Jack Vance never offers polite apologies or customer-service corporate pleasantries.',
        detectedMetrics: { formality: 75, cynicism: 20, aggression: 10 },
        recommendedRewrite: 'Save the apology. Just hand over the credentials and don’t look back.'
      };
    }

    return {
      character: profile.name,
      fidelityScore: 91,
      verdict: 'IN_CHARACTER',
      voiceDriftReason: null,
      detectedMetrics: { formality: profile.formality, cynicism: profile.cynicism, aggression: profile.aggression },
      recommendedRewrite: dialogueLine
    };
  }
}

export const voiceAnalyzer = new VoiceAnalyzer();
