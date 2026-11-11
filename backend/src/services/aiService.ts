/**
 * aiService.ts — Unified Multi-Provider AI Engine
 * 1. Groq (llama-3.3-70b-versatile) — if GROQ_API_KEY is set
 * 2. Gemini (gemini-3.5-flash-lite) — if GEMINI_API_KEY is set
 * 3. OpenRouter (multi-model gateway) — if OPENROUTER_API_KEY is set
 *
 * Automatic cascading failover: if primary fails or hits rate limits, the next provider takes over!
 */

import dotenv from 'dotenv';
dotenv.config();

export interface AIStructuredOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
}

class AIService {
  // --- Groq config ---
  private groqApiKey: string;
  private groqModel: string;
  private groqBaseUrl = 'https://api.groq.com/openai/v1';

  // --- Gemini config ---
  private geminiApiKey: string;
  private geminiModel: string;
  private geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  // --- OpenRouter config ---
  private openrouterApiKey: string;
  private openrouterModel: string;
  private openrouterBaseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    this.groqApiKey       = process.env.GROQ_API_KEY       || '';
    this.groqModel        = process.env.GROQ_MODEL          || 'openai/gpt-oss-120b';
    this.geminiApiKey     = process.env.GEMINI_API_KEY      || '';
    this.geminiModel      = process.env.GEMINI_MODEL        || 'gemini-3.5-flash-lite';
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
    this.openrouterModel  = process.env.OPENROUTER_MODEL    || 'nvidia/nemotron-3.5-lightning:free';
  }

  public isGroqConfigured():       boolean { return this.groqApiKey.length > 10; }
  public isGeminiConfigured():     boolean { return this.geminiApiKey.length > 10; }
  public isOpenRouterConfigured(): boolean { return this.openrouterApiKey.length > 10; }
  public isConfigured():           boolean {
    return this.isGroqConfigured() || this.isGeminiConfigured() || this.isOpenRouterConfigured();
  }

  public activeProvider(): string {
    const active: string[] = [];
    if (this.isGroqConfigured())       active.push(`Ultra-Fast Core: Groq (${this.groqModel})`);
    if (this.isOpenRouterConfigured()) active.push(`Story Writer: OpenRouter (${this.openrouterModel})`);
    if (this.isGeminiConfigured())     active.push(`Visual Director: Gemini (${this.geminiModel})`);

    if (active.length > 0) return active.join(' + ');
    return 'None — please configure API keys in backend/.env';
  }

  // ---------------------------------------------------------------------------
  // TEXT GENERATION (Primary: Groq -> Fallback: OpenRouter -> Gemini)
  // ---------------------------------------------------------------------------
  public async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    // 1. Try Groq (Primary Ultra-Fast Inference)
    if (this.isGroqConfigured()) {
      try {
        return await this._groqText(prompt, systemInstruction);
      } catch (err) {
        console.warn('[AIService] Groq text failed, trying OpenRouter fallback:', (err as Error).message);
      }
    }

    // 2. Try OpenRouter (Story Specialist)
    if (this.isOpenRouterConfigured()) {
      try {
        return await this._openrouterText(prompt, systemInstruction);
      } catch (err) {
        console.warn('[AIService] OpenRouter story text failed, trying Gemini fallback:', (err as Error).message);
      }
    }

    // 3. Try Gemini
    if (this.isGeminiConfigured()) {
      try {
        return await this._geminiText(prompt, systemInstruction);
      } catch (err) {
        console.warn('[AIService] Gemini text failed:', (err as Error).message);
      }
    }

    throw new Error('No AI provider available or all configured providers failed.');
  }

  // ---------------------------------------------------------------------------
  // STRUCTURED JSON GENERATION (Primary: Groq -> Fallback: OpenRouter -> Gemini)
  // ---------------------------------------------------------------------------
  public async generateStructuredJSON<T>(options: AIStructuredOptions): Promise<T> {
    // 1. Try Groq (Primary Ultra-Fast Inference)
    if (this.isGroqConfigured()) {
      try {
        return await this._groqJSON<T>(options);
      } catch (err) {
        console.warn('[AIService] Groq JSON failed, trying OpenRouter fallback:', (err as Error).message);
      }
    }

    // 2. Try OpenRouter (Story Specialist)
    if (this.isOpenRouterConfigured()) {
      try {
        return await this._openrouterJSON<T>(options);
      } catch (err) {
        console.warn('[AIService] OpenRouter JSON failed, trying Gemini fallback:', (err as Error).message);
      }
    }

    // 3. Try Gemini
    if (this.isGeminiConfigured()) {
      try {
        return await this._geminiJSON<T>(options);
      } catch (err) {
        console.warn('[AIService] Gemini JSON failed:', (err as Error).message);
      }
    }

    throw new Error('No AI provider available or all configured providers failed.');
  }

  // ---------------------------------------------------------------------------
  // VISUAL SCENE ART DIRECTOR (Dedicated Gemini Engine)
  // ---------------------------------------------------------------------------
  public async generateVisualPrompt(sceneText: string, title?: string, genre?: string): Promise<string> {
    const directorPrompt = `You are an elite Hollywood Concept Artist and Cinematographer.
Given this story scene, write a single-paragraph cinematic image prompt for FLUX / Midjourney.
Requirements:
- Describe the dramatic camera framing (e.g. wide cinematic establishing shot, low-angle hero shot).
- Describe the lighting (e.g. volumetric neon rain, glowing bioluminescence, warm sunset chiaroscuro).
- Describe the key subject and mood.
- Output raw prompt ONLY. No introductory phrases, no markdown, no quotes. Maximum 35 words.

Story Title: ${title || 'Epic Tale'}
Genre: ${genre || 'Sci-fi'}
Scene:
"${sceneText.slice(0, 800)}"`;

    if (this.isGeminiConfigured()) {
      try {
        const result = await this._geminiText(directorPrompt, 'You are an award-winning cinematic art director. Output raw visual prompt only.');
        const cleaned = result.trim().replace(/^["']|["']$/g, '');
        if (cleaned.length > 10) return cleaned;
      } catch (err) {
        console.warn('[AIService] Gemini visual director failed, falling back to OpenRouter:', (err as Error).message);
      }
    }

    if (this.isOpenRouterConfigured()) {
      try {
        const result = await this._openrouterText(directorPrompt);
        const cleaned = result.trim().replace(/^["']|["']$/g, '');
        if (cleaned.length > 10) return cleaned;
      } catch {}
    }

    return `16:9 cinematic concept art, ${genre || 'story'} turning point, dramatic volumetric lighting, highly detailed 8k render, masterpiece`;
  }

  // ---------------------------------------------------------------------------
  // OPENROUTER — Gateway Endpoint
  // ---------------------------------------------------------------------------
  private async _openrouterText(prompt: string, systemInstruction?: string): Promise<string> {
    const messages: { role: string; content: string }[] = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${this.openrouterBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openrouterApiKey}`,
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Canon Story Studio'
      },
      body: JSON.stringify({
        model: this.openrouterModel,
        messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!res.ok) {
      throw new Error(`OpenRouter request failed with status ${res.status}.`);
    }

    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }

  private async _openrouterJSON<T>(options: AIStructuredOptions): Promise<T> {
    const { prompt, systemInstruction, temperature = 0.2 } = options;

    const sysPrompt = (systemInstruction || '') +
      '\n\nIMPORTANT: Return ONLY valid JSON format. Do not include markdown code block backticks (like ```json), commentary, or extra text. Output parseable JSON object directly.';

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: prompt }
    ];

    const res = await fetch(`${this.openrouterBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openrouterApiKey}`,
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Canon Story Studio'
      },
      body: JSON.stringify({
        model: this.openrouterModel,
        messages,
        temperature,
        max_tokens: 4096
      })
    });

    if (!res.ok) {
      throw new Error(`OpenRouter request failed with status ${res.status}.`);
    }

    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || '';

    try {
      return JSON.parse(text) as T;
    } catch {
      const stripped = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      return JSON.parse(stripped) as T;
    }
  }

  // ---------------------------------------------------------------------------
  // GEMINI — REST endpoint
  // ---------------------------------------------------------------------------
  private async _geminiText(prompt: string, systemInstruction?: string): Promise<string> {
    const endpoint = `${this.geminiBaseUrl}/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;

    const requestBody: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
    };
    if (systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      throw new Error(`Gemini request failed with status ${res.status}.`);
    }

    const data = await res.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async _geminiJSON<T>(options: AIStructuredOptions): Promise<T> {
    const { prompt, systemInstruction, temperature = 0.2 } = options;
    const endpoint = `${this.geminiBaseUrl}/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;

    const requestBody: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature
      }
    };
    if (systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      throw new Error(`Gemini request failed with status ${res.status}.`);
    }

    const data = await res.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('Failed to parse Gemini response as JSON');
    }
  }

  // ---------------------------------------------------------------------------
  // GROQ — OpenAI-compatible chat endpoint
  // ---------------------------------------------------------------------------
  private async _groqText(prompt: string, systemInstruction?: string): Promise<string> {
    const messages: { role: string; content: string }[] = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${this.groqBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.groqApiKey}`
      },
      body: JSON.stringify({
        model: this.groqModel,
        messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!res.ok) {
      throw new Error(`Groq request failed with status ${res.status}.`);
    }

    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }

  private async _groqJSON<T>(options: AIStructuredOptions): Promise<T> {
    const { prompt, systemInstruction, temperature = 0.2 } = options;

    const sysPrompt = (systemInstruction || '') +
      '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no commentary.';

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: prompt }
    ];

    const res = await fetch(`${this.groqBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.groqApiKey}`
      },
      body: JSON.stringify({
        model: this.groqModel,
        messages,
        temperature,
        max_tokens: 4096,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      throw new Error(`Groq request failed with status ${res.status}.`);
    }

    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || '';

    try {
      return JSON.parse(text) as T;
    } catch {
      const stripped = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      return JSON.parse(stripped) as T;
    }
  }
}

export const aiService = new AIService();
