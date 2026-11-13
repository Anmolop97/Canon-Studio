import { Router, Request, Response } from 'express';
import { publicErrorMessage } from '../middleware/publicError.js';
import { BranchingSetup, NextSceneRequest, branchingService } from '../services/branchingService.js';

export const choosePathRouter = Router();

const isValidDecisionCount = (value: unknown): value is 3 | 5 | 8 => value === 3 || value === 5 || value === 8;

/**
 * POST /api/choose-path/generate-scene
 * First call: BranchingSetup. Subsequent calls: NextSceneRequest plus the same premise/adaptation inputs.
 */
choosePathRouter.post('/generate-scene', async (req: Request, res: Response) => {
  const body: unknown = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'A story setup or scene continuation object is required.' });
    return;
  }

  const input = body as Record<string, unknown>;
  const isContinuation = Array.isArray(input.storySoFar) || input.chosenOptionText !== undefined;

  if (!isValidDecisionCount(input.maxDecisions)) {
    res.status(400).json({ error: 'maxDecisions must be 3, 5, or 8.' });
    return;
  }

  if (isContinuation) {
    if (!Array.isArray(input.storySoFar) || input.storySoFar.length < 1 || input.storySoFar.length > 9 ||
        input.storySoFar.some(scene => typeof scene !== 'string' || scene.length > 12_000) ||
        typeof input.chosenOptionText !== 'string' || !input.chosenOptionText.trim() || input.chosenOptionText.length > 1_000 ||
        !Number.isInteger(input.decisionIndex) || Number(input.decisionIndex) < 1 || Number(input.decisionIndex) > input.maxDecisions) {
      res.status(400).json({ error: 'Scene continuation data is invalid or exceeds its limits.' });
      return;
    }

    try {
      const scene = await branchingService.nextScene(input as unknown as NextSceneRequest);
      res.json(scene);
    } catch (error) {
      res.status(500).json({ error: publicErrorMessage(error, 'Failed to generate the next scene.') });
    }
    return;
  }

  if (input.idea !== undefined && (typeof input.idea !== 'string' || input.idea.length > 2_000)) {
    res.status(400).json({ error: 'idea must be a string no longer than 2,000 characters.' });
    return;
  }

  try {
    const scene = await branchingService.startStory(input as unknown as BranchingSetup);
    res.json(scene);
  } catch (error) {
    res.status(500).json({ error: publicErrorMessage(error, 'Failed to generate the opening scene.') });
  }
});
