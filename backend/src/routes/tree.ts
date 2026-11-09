import { Router, Request, Response } from 'express';
import { memoryTreeService } from '../services/memoryTree.js';

export const treeRouter = Router();

/**
 * GET /api/story-tree
 * Returns all story nodes, choice connections, and branch states
 */
treeRouter.get('/', (req: Request, res: Response) => {
  try {
    const nodes = memoryTreeService.getAllNodes();
    res.json({
      totalNodes: nodes.length,
      nodes
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch story tree' });
  }
});

/**
 * GET /api/story-tree/node/:id
 */
treeRouter.get('/node/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const node = memoryTreeService.getNodeById(id);
    if (!node) {
      res.status(404).json({ error: `Node ${id} not found` });
      return;
    }
    res.json(node);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/story-tree/branch
 * Dynamically creates a new story choice and branches the timeline
 */
treeRouter.post('/branch', (req: Request, res: Response) => {
  try {
    const { parentNodeId, choiceText, newSceneTitle, newSummary, stateDelta } = req.body;

    if (!parentNodeId || !choiceText || !newSceneTitle) {
      res.status(400).json({ error: 'parentNodeId, choiceText, and newSceneTitle are required.' });
      return;
    }

    const newNode = memoryTreeService.createBranch(
      parentNodeId,
      choiceText,
      newSceneTitle,
      newSummary || 'A dynamic unscripted branch created by the author.',
      stateDelta || {}
    );

    res.status(201).json({
      message: 'New narrative branch created successfully',
      node: newNode
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
