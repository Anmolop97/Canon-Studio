import { Router, Request, Response } from 'express';
import { branchingService, BranchingSetup, NextSceneRequest } from '../services/branchingService.js';
import { exportService, BranchJourneyExportInput } from '../services/exportService.js';

export const branchingRouter = Router();

/**
 * POST /api/branching/start
 * Body: BranchingSetup
 */
branchingRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const setup: BranchingSetup = req.body;
    const scene = await branchingService.startStory(setup);
    res.json(scene);
  } catch (error: any) {
    console.error('[API /api/branching/start Error]:', error);
    res.status(500).json({
      error: 'Failed to start branching story',
      message: error.message || 'Please try again.',
      canRetry: true
    });
  }
});

/**
 * POST /api/branching/next
 * Body: NextSceneRequest
 */
branchingRouter.post('/next', async (req: Request, res: Response) => {
  try {
    const requestData: NextSceneRequest = req.body;
    const scene = await branchingService.nextScene(requestData);
    res.json(scene);
  } catch (error: any) {
    console.error('[API /api/branching/next Error]:', error);
    res.status(500).json({
      error: 'Failed to generate next branch scene',
      message: error.message || 'Please try again.',
      canRetry: true
    });
  }
});

/**
 * POST /api/branching/export-journey
 * Body: BranchJourneyExportInput
 */
branchingRouter.post('/export-journey', (req: Request, res: Response) => {
  try {
    const input: BranchJourneyExportInput = req.body;
    const exported = exportService.exportBranchingJourney(input);

    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      res.setHeader('Content-Type', exported.mimeType);
      res.send(exported.content);
      return;
    }

    res.json(exported);
  } catch (error: any) {
    console.error('[API /api/branching/export-journey Error]:', error);
    res.status(500).json({
      error: 'Failed to export branching journey',
      message: error.message || 'Export error'
    });
  }
});
