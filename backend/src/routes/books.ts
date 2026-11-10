import { Router, Response } from 'express';
import { optionalAuth, requireAuth, AuthenticatedRequest } from './auth.js';
import { storageService } from '../services/storage.js';
import { exportService, ExportFormat } from '../services/exportService.js';

export const booksRouter = Router();

/**
 * GET /api/books
 * Query params: search, genre, minRating (any | 3 | 4), sort (newest | likes | rating | episodes)
 */
booksRouter.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    let books = storageService.getBooksWithMetrics(currentUserId);

    const { search, genre, minRating, sort } = req.query;

    // Search query filter (title, blurb, author)
    if (typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase().trim();
      books = books.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.blurb.toLowerCase().includes(q) ||
        b.authorName.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q)
      );
    }

    // Genre filter
    if (typeof genre === 'string' && genre.trim() && genre.toLowerCase() !== 'all') {
      books = books.filter(b => b.genre.toLowerCase() === genre.toLowerCase().trim());
    }

    // Min rating filter (any, 3, 4)
    if (typeof minRating === 'string' && minRating !== 'any') {
      const min = parseFloat(minRating);
      if (!isNaN(min)) {
        books = books.filter(b => b.avgRating >= min);
      }
    }

    // Sorting
    const sortKey = typeof sort === 'string' ? sort.toLowerCase() : 'newest';
    if (sortKey === 'likes') {
      books.sort((a, b) => b.likesCount - a.likesCount);
    } else if (sortKey === 'rating') {
      books.sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount);
    } else if (sortKey === 'episodes') {
      books.sort((a, b) => b.episodeCount - a.episodeCount);
    } else {
      // Default: newest
      books.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }

    res.json(books);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch books' });
  }
});

/**
 * GET /api/books/best
 * Top 20 ranked by Bayesian score:
 * score = weighted rating + 0.5 * log10(1 + likes)
 * where weighted rating = (n * avg + 3 * globalMean) / (n + 3)
 */
booksRouter.get('/best', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const books = storageService.getBooksWithMetrics(currentUserId);

    // Sort descending by score
    books.sort((a, b) => (b.bestRankScore || 0) - (a.bestRankScore || 0));

    // Assign ranks 1..20
    const top20 = books.slice(0, 20).map((book, index) => ({
      ...book,
      rank: index + 1
    }));

    res.json({
      formula: 'score = weighted rating + 0.5 * log10(1 + likes)',
      weightedFormula: 'weighted rating = (n * avg + 3 * globalMean) / (n + 3)',
      explanation: 'Bayesian smoothing anchors the rating toward the global average until enough readers rate, preventing 1-vote anomalies, while logarithmic like scaling rewards sustained community popularity without overwhelming critical score.',
      count: top20.length,
      books: top20
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch best books' });
  }
});

/**
 * GET /api/books/:id
 */
booksRouter.get('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const currentUserId = req.user?.id;
    const all = storageService.getBooksWithMetrics(currentUserId);
    const book = all.find(b => b.id === id);

    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    res.json(book);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get book' });
  }
});

/**
 * GET /api/books/:id/export?format=fountain|markdown|txt&download=true|false
 */
booksRouter.get('/:id/export', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const format = ((req.query.format as string)?.toLowerCase() as ExportFormat) || 'markdown';
    const all = storageService.getBooksWithMetrics();
    const book = all.find(b => b.id === id);

    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    const exported = exportService.exportBook(book, format);

    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      res.setHeader('Content-Type', exported.mimeType);
      res.send(exported.content);
      return;
    }

    res.json(exported);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to export book' });
  }
});

/**
 * POST /api/books/:id/like
 * Requires auth. Author cannot like own book!
 */
booksRouter.post('/:id/like', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const result = storageService.toggleLike(id, userId);
    res.json(result);
  } catch (error: any) {
    if (error.message?.includes('Forbidden')) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to toggle like' });
  }
});

/**
 * POST /api/books/:id/rate
 * Requires auth. Body: { score: 1..5 }. Author cannot rate own book!
 */
booksRouter.post('/:id/rate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const { score } = req.body;

    if (typeof score !== 'number' || score < 1 || score > 5) {
      res.status(400).json({ error: 'Rating score must be a number between 1 and 5' });
      return;
    }

    const result = storageService.rateBook(id, userId, score);
    res.json(result);
  } catch (error: any) {
    if (error.message?.includes('Forbidden')) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to record rating' });
  }
});
