import type {
  User,
  Draft,
  Book,
  WizardQuestion,
  BranchScene,
  CanonCheckResult
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? 'https://canon-studio.onrender.com/api' : '/api');

export interface ExportResponse {
  content: string;
  filename: string;
  mimeType: string;
}

export function triggerDownload(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

class ApiClient {
  constructor() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('canon_auth_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.error || errorData.message || `Request failed (${res.status})`;
      if (res.status === 429) {
        window.dispatchEvent(new CustomEvent('canon:api-limit', {
          detail: { retryAfterSeconds: Number(errorData.retryAfter) || null }
        }));
      }
      throw new Error(message);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  // Auth
  public async login(email: string, password: string): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  public async register(email: string, password: string, displayName: string): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName })
    });
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  public async judgeDemoLogin(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/judge-access', {
      method: 'POST'
    });
  }

  public logout(): void {
    void this.request('/auth/logout', { method: 'POST' }).catch(() => undefined);
  }

  // Wizard
  public async getNextWizardQuestion(step: number, answers: any): Promise<WizardQuestion> {
    return this.request<WizardQuestion>('/wizard/next-question', {
      method: 'POST',
      body: JSON.stringify({ step, answers })
    });
  }

  public async generateWizardStory(answers: any): Promise<{
    title: string;
    content: string;
    sceneContent: string;
    wordCount: number;
    readingTimeMinutes: number;
    activeLoreAnchors: Array<{ id: string; label: string; detail: string }>;
    styleTone: string;
  }> {
    return this.request('/wizard/generate-story', {
      method: 'POST',
      body: JSON.stringify(answers)
    });
  }

  // Branching Stories
  public async startBranching(setup: {
    idea?: string;
    genre?: string;
    realism?: string;
    language?: string;
    characterSheet?: string;
    worldLore?: string | string[];
    canonRules?: string[];
    styleTone?: string;
    maxDecisions: number;
  }): Promise<BranchScene> {
    return this.request<BranchScene>('/choose-path/generate-scene', {
      method: 'POST',
      body: JSON.stringify(setup)
    });
  }

  public async nextBranchScene(data: {
    storySoFar: string[];
    chosenOptionText: string;
    decisionIndex: number;
    maxDecisions: number;
    genre?: string;
    language?: string;
    idea?: string;
    realism?: string;
    characterSheet?: string;
    worldLore?: string | string[];
    canonRules?: string[];
    styleTone?: string;
  }): Promise<BranchScene> {
    return this.request<BranchScene>('/choose-path/generate-scene', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async exportBranchingJourney(journey: {
    storyTitle?: string;
    genre?: string;
    scenes: Array<{
      decisionIndex: number;
      sceneText: string;
      chosenOption?: string;
      optionType?: 'bold' | 'careful' | 'unexpected';
    }>;
  }): Promise<ExportResponse> {
    return this.request<ExportResponse>('/branching/export-journey', {
      method: 'POST',
      body: JSON.stringify(journey)
    });
  }

  public async illustrateBranchScene(sceneText: string, title?: string, genre?: string): Promise<{ imageUrl: string; imagePrompt: string }> {
    return this.request('/branching/illustrate-scene', {
      method: 'POST',
      body: JSON.stringify({ sceneText, title, genre })
    });
  }

  // Writer Mode Drafts
  public async getDrafts(): Promise<Draft[]> {
    return this.request<Draft[]>('/drafts');
  }

  public async getDraft(id: string): Promise<Draft> {
    return this.request<Draft>(`/drafts/${id}`);
  }

  public async createDraft(data: Partial<Draft>): Promise<Draft> {
    return this.request<Draft>('/drafts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updateDraft(id: string, data: Partial<Draft>): Promise<Draft> {
    return this.request<Draft>(`/drafts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  public async deleteDraft(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/drafts/${id}`, {
      method: 'DELETE'
    });
  }

  public async exportDraft(id: string, format: 'fountain' | 'markdown' | 'txt' = 'markdown'): Promise<ExportResponse> {
    return this.request<ExportResponse>(`/drafts/${id}/export?format=${format}`);
  }

  public async draftEpisodeWithAI(draftId: string, episodeIndex: number, userPrompt: string): Promise<{
    content: string;
    episodeNumber: number;
  }> {
    return this.request(`/drafts/${draftId}/ai-draft`, {
      method: 'POST',
      body: JSON.stringify({ episodeIndex, userPrompt })
    });
  }

  public async checkCanon(draftId: string, episodeIndex: number, episodeTitle: string, episodeContent: string): Promise<CanonCheckResult> {
    return this.request<CanonCheckResult>(`/drafts/${draftId}/check-canon`, {
      method: 'POST',
      body: JSON.stringify({ episodeIndex, episodeTitle, episodeContent })
    });
  }

  public async illustrateEpisode(draftId: string, episodeIndex: number): Promise<{
    success: boolean;
    imageUrl: string;
    imagePrompt: string;
    episode: any;
  }> {
    return this.request(`/drafts/${draftId}/episodes/${episodeIndex}/illustrate`, {
      method: 'POST'
    });
  }

  public async publishDraft(draftId: string): Promise<{ success: boolean; message: string; book: Book }> {
    return this.request(`/drafts/${draftId}/publish`, {
      method: 'POST'
    });
  }

  public async unpublishDraft(draftId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/drafts/${draftId}/unpublish`, {
      method: 'POST'
    });
  }

  // Books
  public async getBooks(params: {
    search?: string;
    genre?: string;
    minRating?: string;
    sort?: string;
  } = {}): Promise<Book[]> {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.genre) q.set('genre', params.genre);
    if (params.minRating) q.set('minRating', params.minRating);
    if (params.sort) q.set('sort', params.sort);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request<Book[]>(`/books${queryStr}`);
  }

  public async getBestBooks(): Promise<{
    formula: string;
    weightedFormula: string;
    explanation: string;
    count: number;
    books: Book[];
  }> {
    return this.request('/books/best');
  }

  public async getBook(id: string): Promise<Book> {
    return this.request<Book>(`/books/${id}`);
  }

  public async exportBook(id: string, format: 'fountain' | 'markdown' | 'txt' = 'markdown'): Promise<ExportResponse> {
    return this.request<ExportResponse>(`/books/${id}/export?format=${format}`);
  }

  public async toggleLike(bookId: string): Promise<{ liked: boolean; totalLikes: number }> {
    return this.request(`/books/${bookId}/like`, {
      method: 'POST'
    });
  }

  public async rateBook(bookId: string, score: number): Promise<{ avgRating: number; totalRatings: number; userRating: number }> {
    return this.request(`/books/${bookId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score })
    });
  }
}

export const api = new ApiClient();
