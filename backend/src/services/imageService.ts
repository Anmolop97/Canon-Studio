import { aiService } from './aiService.js';

export interface SceneArtResult {
  imageUrl: string;
  imagePrompt: string;
}

export class ImageService {
  /**
   * Generates a 16:9 widescreen HD visual concept art for a story episode or scene.
   * Step 1: Gemini analyzes the narrative beat, character canon, and mood to craft the visual prompt.
   * Step 2: Generates 16:9 cinematic FLUX illustration.
   */
  public async generateSceneArt(sceneText: string, title?: string, genre?: string): Promise<SceneArtResult> {
    // 1. Gemini acts as Visual Art Director
    const imagePrompt = await aiService.generateVisualPrompt(sceneText, title, genre);

    // 2. Compute a stable seed so reloads don't randomly flicker
    const seed = Math.abs(this.hashCode(imagePrompt + (title || ''))) % 999999;

    // 3. 16:9 Cinematic concept art
    const encoded = encodeURIComponent(imagePrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&nologo=true&model=flux&seed=${seed}`;

    return {
      imageUrl,
      imagePrompt
    };
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export const imageService = new ImageService();
