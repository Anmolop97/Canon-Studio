import dotenv from 'dotenv';
dotenv.config();

export interface GeminiStructuredOptions {
  prompt: string;
  systemInstruction?: string;
  responseSchema?: Record<string, any>;
  temperature?: number;
}

export class GeminiService {
  private apiKey: string;
  private model: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  public getModelName(): string {
    return this.model;
  }

  /**
   * Calls Gemini with strict JSON Structured Output
   */
  public async generateStructuredJSON<T>(options: GeminiStructuredOptions): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not configured in backend/.env');
    }

    const endpoint = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody: any = {
      contents: [
        {
          parts: [{ text: options.prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: options.temperature ?? 0.2
      }
    };

    if (options.systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction }]
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}.`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textContent = candidate?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No content returned from Gemini');
    }

    try {
      return JSON.parse(textContent) as T;
    } catch (parseError) {
      console.error('[Gemini JSON Parse Error]: Raw text was:', textContent);
      throw new Error('Failed to parse Gemini response as JSON');
    }
  }

  /**
   * Free-form text generation for Co-Writing scenes
   */
  public async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not configured in backend/.env');
    }

    const endpoint = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}.`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

export const geminiService = new GeminiService();
