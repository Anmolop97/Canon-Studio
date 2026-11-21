// Neural Voice Studio Service — Microsoft Edge Azure Neural Voices
// Provides diverse, hyper-realistic character audio models with zero token cost.

import { EdgeTTS } from '@andresaya/edge-tts';

export interface VoiceModelDefinition {
  id: string;
  shortName: string;
  displayName: string;
  gender: 'male' | 'female' | 'neutral';
  tone: string;
  suggestedRoles: string[];
}

export const NEURAL_VOICE_MODELS: Record<string, VoiceModelDefinition> = {
  narrator: {
    id: 'narrator',
    shortName: 'en-US-ChristopherNeural',
    displayName: 'Christopher (Studio Narrator)',
    gender: 'neutral',
    tone: 'Deep, authoritative, cinematic documentary style',
    suggestedRoles: ['Narrator', 'Storyteller', 'Observer']
  },
  kai: {
    id: 'kai',
    shortName: 'en-US-GuyNeural',
    displayName: 'Guy (Young Hero / Kai)',
    gender: 'male',
    tone: 'Energetic, urgent, agile 20s protagonist',
    suggestedRoles: ['Kai', 'Marcus', 'Hero', 'Jack', 'Rohan']
  },
  elena: {
    id: 'elena',
    shortName: 'en-US-AriaNeural',
    displayName: 'Aria (Female Lead / Elena)',
    gender: 'female',
    tone: 'Articulate, expressive, confident heroine',
    suggestedRoles: ['Elena', 'Zara', 'Aria', 'Maya', 'Sarah']
  },
  mentor: {
    id: 'mentor',
    shortName: 'en-US-RogerNeural',
    displayName: 'Roger (Wise Veteran / Mentor)',
    gender: 'male',
    tone: 'Grave, mature, resonant elder veteran',
    suggestedRoles: ['Captain', 'King', 'Voss', 'Old Man', 'Commander']
  },
  jenny: {
    id: 'jenny',
    shortName: 'en-US-JennyNeural',
    displayName: 'Jenny (Analytical Scientist)',
    gender: 'female',
    tone: 'Warm, calm, highly intelligent specialist',
    suggestedRoles: ['Doctor', 'Scientist', 'Clara', 'Anya']
  },
  villain: {
    id: 'villain',
    shortName: 'en-US-SteffanNeural',
    displayName: 'Steffan (Antagonist / Rival)',
    gender: 'male',
    tone: 'Cold, cynical, menacing delivery',
    suggestedRoles: ['Syndicate', 'Villain', 'Shadow', 'Inquisitor']
  },
  britishNoble: {
    id: 'britishNoble',
    shortName: 'en-GB-RyanNeural',
    displayName: 'Ryan (British Aristocrat)',
    gender: 'male',
    tone: 'Crisp, aristocratic British tone',
    suggestedRoles: ['Lord', 'Noble', 'Butler', 'Sherlock']
  },
  britishLady: {
    id: 'britishLady',
    shortName: 'en-GB-SoniaNeural',
    displayName: 'Sonia (British Commander)',
    gender: 'female',
    tone: 'Sharp, commanding, refined delivery',
    suggestedRoles: ['Queen', 'General', 'Governor', 'Empress']
  }
};

export interface SynthesizeOptions {
  pitch?: string | number;
  rate?: string | number;
  volume?: string | number;
}

class NeuralVoiceService {
  private cache: Map<string, Buffer> = new Map();
  private maxCacheEntries = 500;

  // Pick the best distinct neural voice model based on character name and profile
  public selectVoiceForCharacter(characterName: string): VoiceModelDefinition {
    const name = (characterName || '').trim().toLowerCase();

    if (name === 'narrator' || !name) {
      return NEURAL_VOICE_MODELS.narrator;
    }

    if (name.includes('kai') || name.includes('marcus') || name.includes('hero') || name.includes('guy') || name.includes('rohan') || name.includes('kaelen')) {
      return NEURAL_VOICE_MODELS.kai;
    }

    if (name.includes('elena') || name.includes('aria') || name.includes('zara') || name.includes('maya') || name.includes('sarah') || name.includes('lyra')) {
      return NEURAL_VOICE_MODELS.elena;
    }

    if (name.includes('captain') || name.includes('roger') || name.includes('king') || name.includes('voss') || name.includes('commander') || name.includes('drake') || name.includes('vance')) {
      return NEURAL_VOICE_MODELS.mentor;
    }

    if (name.includes('dr.') || name.includes('doctor') || name.includes('jenny') || name.includes('anya') || name.includes('clara')) {
      return NEURAL_VOICE_MODELS.jenny;
    }

    if (name.includes('villain') || name.includes('syndicate') || name.includes('enforcer') || name.includes('shadow')) {
      return NEURAL_VOICE_MODELS.villain;
    }

    // Deterministic hash assignment across diverse voice models
    let hash = 0;
    for (let i = 0; i < characterName.length; i++) {
      hash = (hash << 5) - hash + characterName.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    const femaleKeywords = ['woman', 'girl', 'lady', 'princess', 'queen', 'mother', 'sister', 'eva', 'lyra', 'selina'];
    const isFemale = femaleKeywords.some(k => name.includes(k)) || (absHash % 2 === 1);

    if (isFemale) {
      const femalePool = [NEURAL_VOICE_MODELS.elena, NEURAL_VOICE_MODELS.jenny, NEURAL_VOICE_MODELS.britishLady];
      return femalePool[absHash % femalePool.length];
    } else {
      const malePool = [NEURAL_VOICE_MODELS.kai, NEURAL_VOICE_MODELS.mentor, NEURAL_VOICE_MODELS.villain, NEURAL_VOICE_MODELS.britishNoble];
      return malePool[absHash % malePool.length];
    }
  }

  // Synthesize text to MP3 audio buffer using Microsoft Neural Voices with dynamic prosody
  public async synthesize(text: string, voiceName?: string, options?: SynthesizeOptions): Promise<Buffer> {
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
    if (!cleanText) {
      throw new Error('Text is required for voice synthesis.');
    }

    const voice = voiceName || NEURAL_VOICE_MODELS.narrator.shortName;
    const rawPitch = options?.pitch !== undefined ? String(options.pitch) : '+0Hz';
    const rawRate = options?.rate !== undefined ? String(options.rate) : '+0%';
    const rawVolume = options?.volume !== undefined ? String(options.volume) : '+0%';

    const formattedPitch = rawPitch.endsWith('Hz') ? rawPitch : (Number(rawPitch) >= 0 ? `+${rawPitch}Hz` : `${rawPitch}Hz`);
    const formattedRate = rawRate.endsWith('%') ? rawRate : (Number(rawRate) >= 0 ? `+${rawRate}%` : `${rawRate}%`);
    const formattedVolume = rawVolume.endsWith('%') ? rawVolume : (Number(rawVolume) >= 0 ? `+${rawVolume}%` : `${rawVolume}%`);

    const cacheKey = `${voice}:::${cleanText}:::${formattedPitch}:::${formattedRate}:::${formattedVolume}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const tts = new EdgeTTS();
    const result = await tts.generate(cleanText, voice, {
      pitch: formattedPitch,
      rate: formattedRate,
      volume: formattedVolume
    });
    const buffer = Buffer.from(result.audio);

    // Keep cache bounded
    if (this.cache.size >= this.maxCacheEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, buffer);

    return buffer;
  }
}

export const neuralVoiceService = new NeuralVoiceService();
