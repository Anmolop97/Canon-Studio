/**
 * aiService.ts — Unified AI Provider
 * Primary: Groq (llama-3.3-70b-versatile) — free, ultra-fast
 * Fallback: Gemini (gemini-flash) — if GEMINI_API_KEY is set
 *
 * Usage:
 *   aiService.generateText(prompt, systemInstruction)
 *   aiService.generateStructuredJSON<T>({ prompt, systemInstruction, temperature })
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

  // --- Gemini fallback config ---
  private geminiApiKey: string;
  private geminiModel: string;
  private geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.groqApiKey   = process.env.GROQ_API_KEY   || '';
    this.groqModel    = process.env.GROQ_MODEL      || 'llama-3.3-70b-versatile';
    this.geminiApiKey = process.env.GEMINI_API_KEY  || '';
    this.geminiModel  = process.env.GEMINI_MODEL    || 'gemini-1.5-flash-latest';
  }

  public isGroqConfigured():   boolean { return this.groqApiKey.length > 10; }
  public isGeminiConfigured(): boolean { return this.geminiApiKey.length > 10; }
  public isConfigured():       boolean { return this.isGroqConfigured() || this.isGeminiConfigured(); }

  public activeProvider(): string {
    if (this.isGroqConfigured())   return `Groq (${this.groqModel})`;
    if (this.isGeminiConfigured()) return `Gemini (${this.geminiModel})`;
    return 'None — set GROQ_API_KEY in backend/.env';
  }

  // ---------------------------------------------------------------------------
  // TEXT GENERATION
  // ---------------------------------------------------------------------------
  public async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    // Try Groq first
    if (this.isGroqConfigured()) {
      try {
        return await this._groqText(prompt, systemInstruction);
      } catch (err) {
        console.warn('[AIService] Groq text failed, trying Gemini fallback:', (err as Error).message);
      }
    }

    // Try Gemini
    if (this.isGeminiConfigured()) {
      try {
        return await this._geminiText(prompt, systemInstruction);
      } catch (err) {
        console.warn('[AIService] Gemini text also failed:', (err as Error).message);
      }
    }

    throw new Error('No AI provider available. Please set GROQ_API_KEY in backend/.env');
  }

  // ---------------------------------------------------------------------------
  // STRUCTURED JSON GENERATION
  // ---------------------------------------------------------------------------
  public async generateStructuredJSON<T>(options: AIStructuredOptions): Promise<T> {
    // Try Groq first
    if (this.isGroqConfigured()) {
      try {
        return await this._groqJSON<T>(options);
      } catch (err) {
        console.warn('[AIService] Groq JSON failed, trying Gemini fallback:', (err as Error).message);
      }
    }

    // Try Gemini
    if (this.isGeminiConfigured()) {
      try {
        return await this._geminiJSON<T>(options);
      } catch (err) {
        console.warn('[AIService] Gemini JSON also failed:', (err as Error).message);
      }
    }

    throw new Error('No AI provider available. Please set GROQ_API_KEY in backend/.env');
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
      const err = await res.text();
      throw new Error(`Groq API Error ${res.status}: ${err}`);
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
      const err = await res.text();
      throw new Error(`Groq API Error ${res.status}: ${err}`);
    }

    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || '';

    try {
      return JSON.parse(text) as T;
    } catch {
      // Strip possible markdown fences
      const stripped = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      return JSON.parse(stripped) as T;
    }
  }

  // ---------------------------------------------------------------------------
  // GEMINI — REST endpoint (fallback)
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API Error ${res.status}: ${err}`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API Error ${res.status}: ${err}`);
    }

    const data = await res.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('Failed to parse Gemini response as JSON');
    }
  }
}

export const aiService = new AIService();
