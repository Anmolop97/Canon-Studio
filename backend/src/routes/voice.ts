import { publicErrorMessage } from '../middleware/publicError.js';
import { Router, Request, Response } from 'express';
import { voiceAnalyzer } from '../services/voiceAnalyzer.js';
import { neuralVoiceService, NEURAL_VOICE_MODELS } from '../services/neuralVoiceService.js';

export const voiceRouter = Router();

/**
 * GET /api/voice/models
 * Returns the list of distinct neural character voice models
 */
voiceRouter.get('/models', (_req: Request, res: Response) => {
  res.json({
    models: Object.values(NEURAL_VOICE_MODELS)
  });
});

/**
 * GET /api/voice/stream
 * Direct high-performance MP3 audio streaming for HTML5 audio player
 * Query: ?text=...&voice=...&character=...&pitch=...&rate=...&volume=...
 */
voiceRouter.get('/stream', async (req: Request, res: Response) => {
  try {
    const text = (req.query.text as string || '').trim();
    const voiceParam = req.query.voice as string;
    const character = req.query.character as string;
    const pitch = req.query.pitch as string;
    const rate = req.query.rate as string;
    const volume = req.query.volume as string;

    if (!text) {
      res.status(400).send('Text query parameter is required.');
      return;
    }

    let selectedVoice = voiceParam;
    if (!selectedVoice && character) {
      selectedVoice = neuralVoiceService.selectVoiceForCharacter(character).shortName;
    } else if (!selectedVoice) {
      selectedVoice = 'en-US-ChristopherNeural';
    }

    const audioBuffer = await neuralVoiceService.synthesize(text, selectedVoice, {
      pitch,
      rate,
      volume
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400, immutable',
      'Accept-Ranges': 'bytes'
    });

    res.end(audioBuffer);
  } catch (error: any) {
    console.error('[API /api/voice/stream Error]:', error);
    res.status(500).json({ error: publicErrorMessage(error, 'Voice synthesis failed') });
  }
});

/**
 * POST /api/voice/preload
 * Batch warm-up endpoint that synthesizes audio segments in parallel into RAM cache.
 * Eliminates character-to-character dead air latency with emotional inflection.
 */
voiceRouter.post('/preload', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.json({ success: true, count: 0 });
      return;
    }

    // Limit to first 12 items to avoid overwhelming EdgeTTS while ensuring gapless buffer
    const targets = items.slice(0, 12);
    
    // Process in parallel in small batches of 3
    const batchSize = 3;
    for (let i = 0; i < targets.length; i += batchSize) {
      const slice = targets.slice(i, i + batchSize);
      await Promise.all(
        slice.map(async (item: any) => {
          if (!item.text || !item.text.trim()) return;
          const voice = item.voice || item.neuralVoice || 'en-US-ChristopherNeural';
          try {
            await neuralVoiceService.synthesize(item.text, voice, {
              pitch: item.pitch,
              rate: item.rate,
              volume: item.volume
            });
          } catch (e: any) {
            // Silently continue on individual warm-up fail
          }
        })
      );
    }

    res.json({ success: true, count: targets.length });
  } catch (error: any) {
    console.error('[API /api/voice/preload Error]:', error);
    res.status(500).json({ error: publicErrorMessage(error, 'Preload failed') });
  }
});

/**
 * POST /api/voice/synthesize
 * Synthesizes text with character model and returns base64 or metadata
 */
voiceRouter.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, characterName, voiceName } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text is required.' });
      return;
    }

    const voiceModel = voiceName 
      ? Object.values(NEURAL_VOICE_MODELS).find(v => v.shortName === voiceName) || neuralVoiceService.selectVoiceForCharacter(characterName)
      : neuralVoiceService.selectVoiceForCharacter(characterName);

    const audioBuffer = await neuralVoiceService.synthesize(text, voiceModel.shortName);
    const base64Audio = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;

    res.json({
      success: true,
      voiceModel,
      audioUrl: base64Audio,
      byteLength: audioBuffer.length
    });
  } catch (error: any) {
    console.error('[API /api/voice/synthesize Error]:', error);
    res.status(500).json({ error: publicErrorMessage(error, 'Failed to synthesize speech') });
  }
});

/**
 * POST /api/analyze-voice (Legacy endpoint preserved)
 */
voiceRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { characterName, dialogueLine } = req.body;
    if (!characterName || !dialogueLine) {
      res.status(400).json({ error: 'characterName and dialogueLine are both required.' });
      return;
    }
    const result = await voiceAnalyzer.analyzeDialogue(characterName, dialogueLine);
    res.json(result);
  } catch (error: any) {
    console.error('[API /api/analyze-voice Error]:', error);
    res.status(500).json({ error: publicErrorMessage(error, 'Failed to analyze dialogue voice') });
  }
});
