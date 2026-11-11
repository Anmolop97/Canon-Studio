import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from './auth.js';
import { storageService } from '../services/storage.js';
import { canonCheckerService } from '../services/canonChecker.js';
import { exportService, ExportFormat } from '../services/exportService.js';
import { imageService } from '../services/imageService.js';

export const draftsRouter = Router();

// All draft operations require authentication
draftsRouter.use(requireAuth);

/**
 * GET /api/drafts
 */
draftsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const drafts = storageService.getDraftsByUser(userId);
    res.json(drafts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch drafts' });
  }
});

/**
 * POST /api/drafts
 */
draftsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, genre, blurb, episodes, canonFacts, voiceNotes } = req.body;
    const draft = storageService.createDraft(userId, {
      title,
      genre,
      blurb,
      episodes,
      canonFacts,
      voiceNotes
    });
    res.status(201).json(draft);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create draft' });
  }
});

/**
 * GET /api/drafts/:id
 */
draftsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const draft = storageService.getDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    if (draft.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden: You do not own this draft' });
      return;
    }
    res.json(draft);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get draft' });
  }
});

/**
 * GET /api/drafts/:id/export?format=fountain|markdown|txt&download=true|false
 */
draftsRouter.get('/:id/export', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const format = ((req.query.format as string)?.toLowerCase() as ExportFormat) || 'markdown';
    const draft = storageService.getDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    if (draft.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden: You do not own this draft' });
      return;
    }

    const exported = exportService.exportDraft(draft, format);

    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      res.setHeader('Content-Type', exported.mimeType);
      res.send(exported.content);
      return;
    }

    res.json(exported);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to export draft' });
  }
});

/**
 * PUT /api/drafts/:id
 */
draftsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const draft = storageService.getDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    if (draft.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden: You do not own this draft' });
      return;
    }

    const { title, genre, blurb, episodes, canonFacts, voiceNotes } = req.body;
    const updated = storageService.updateDraft(id, {
      title,
      genre,
      blurb,
      episodes,
      canonFacts,
      voiceNotes
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update draft' });
  }
});

/**
 * DELETE /api/drafts/:id
 */
draftsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const draft = storageService.getDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    if (draft.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden: You do not own this draft' });
      return;
    }

    // If published, unpublish first
    if (draft.publishedBookId) {
      try {
        storageService.unpublishBook(draft.publishedBookId, req.user!.id);
      } catch (e) {
        // Continue
      }
    }

    storageService.deleteDraft(id);
    res.json({ success: true, message: 'Draft deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete draft' });
  }
});

/**
 * POST /api/drafts/:id/ai-draft
 * Body: { episodeIndex: number, userPrompt: string }
 */
draftsRouter.post('/:id/ai-draft', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const draft = storageService.getDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    if (draft.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { episodeIndex, userPrompt } = req.body;
    const epNum = (episodeIndex ?? 0) + 1;

    let prevEnding = '';
    if (episodeIndex > 0 && draft.episodes[episodeIndex - 1]) {
      const prevContent = draft.episodes[episodeIndex - 1].content;
      prevEnding = prevContent.slice(-800);
    }

    const generatedText = await canonCheckerService.draftEpisode({
      episodeNumber: epNum,
      storyTitle: draft.title,
      genre: draft.genre,
      userPrompt: userPrompt || 'Advance the story naturally based on canon and character motivations.',
      canonFacts: draft.canonFacts,
      voiceNotes: draft.voiceNotes,
      previousEpisodeEnding: prevEnding
    });

    res.json({
      content: generatedText,
      episodeNumber: epNum
    });
  } catch (error: any) {
    console.error('[API /api/drafts/:id/ai-draft Error]:', error);
    res.status(500).json({
      error: 'Failed to draft episode with AI',
      message: error.message || 'Please retry.',
      canRetry: true
    });
  }
});

/**
 * POST /api/drafts/:id/check-canon
 * Body: { episodeIndex: number, episodeContent: string }
 * Note requirement: "Facts must be re-derived for the edited episode only: when checking episode k, use facts from all other episodes."
 */
draftsRouter.post('/:id/check-canon', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const draft = storageService.getDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    if (draft.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { episodeIndex, episodeContent, episodeTitle } = req.body;
    const epNum = (episodeIndex ?? 0) + 1;

    // Filter facts from all OTHER episodes only!
    const otherEpisodesFacts = draft.canonFacts.filter(f => f.episodeNumber !== epNum);

    let prevEnding = '';
    if (episodeIndex > 0 && draft.episodes[episodeIndex - 1]) {
      prevEnding = draft.episodes[episodeIndex - 1].content.slice(-800);
    }

    const checkResult = await canonCheckerService.checkCanon({
      episodeNumber: epNum,
      currentEpisodeTitle: episodeTitle,
      currentEpisodeContent: episodeContent || '',
      existingCanonFacts: otherEpisodesFacts,
      voiceNotes: draft.voiceNotes,
      previousEpisodeEnding: prevEnding
    });

    res.json(checkResult);
  } catch (error: any) {
    console.error('[API /api/drafts/:id/check-canon Error]:', error);
    res.status(500).json({
      error: 'Canon continuity audit encountered an error',
      message: error.message || 'Please check text and retry.',
      canRetry: true
    });
  }
});

/**
 * POST /api/drafts/:id/publish
 */
draftsRouter.post('/:id/publish', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const draft = storageService.getDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    if (draft.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden: You do not own this draft' });
      return;
    }

    if (!draft.title.trim()) {
      res.status(400).json({ error: 'Draft must have a title before publishing.' });
      return;
    }
    if (!draft.episodes || draft.episodes.length === 0 || !draft.episodes[0].content.trim()) {
      res.status(400).json({ error: 'Draft must have at least one non-empty episode to publish.' });
      return;
    }

    const publishedBook = storageService.publishDraft(draft, req.user!);
    res.json({
      success: true,
      message: 'Story published to Books successfully!',
      book: publishedBook
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to publish story' });
  }
});

/**
 * POST /api/drafts/:id/unpublish
 */
draftsRouter.post('/:id/unpublish', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const draft = storageService.getDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    if (draft.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden: You do not own this draft' });
      return;
    }

    if (!draft.publishedBookId) {
      res.status(400).json({ error: 'This draft is not currently published.' });
      return;
    }

    storageService.unpublishBook(draft.publishedBookId, req.user!.id);
    res.json({
      success: true,
      message: 'Story unpublished from Books successfully.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to unpublish story' });
  }
});

/**
 * POST /api/drafts/:id/episodes/:episodeIndex/illustrate
 * Uses Gemini as Visual Director to craft cinematic prompt + FLUX rendering
 */
draftsRouter.post('/:id/episodes/:episodeIndex/illustrate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const episodeIndex = parseInt(req.params.episodeIndex as string, 10) || 0;
    const draft = storageService.getDraftById(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    if (draft.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const episode = draft.episodes[episodeIndex];
    if (!episode) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }

    const sceneText = episode.content || episode.title || draft.title;
    const art = await imageService.generateSceneArt(sceneText, `${draft.title} - ${episode.title}`, draft.genre);

    episode.imageUrl = art.imageUrl;
    episode.imagePrompt = art.imagePrompt;
    episode.updatedAt = new Date().toISOString();

    storageService.updateDraft(draft.id, { episodes: draft.episodes });

    res.json({
      success: true,
      imageUrl: art.imageUrl,
      imagePrompt: art.imagePrompt,
      episode
    });
  } catch (error: any) {
    console.error('[API illustrate episode error]:', error);
    res.status(500).json({ error: error.message || 'Failed to generate episode art' });
  }
});

