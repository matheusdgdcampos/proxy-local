import type { Request, Response } from 'express';
import { dbService } from '../db/database';
import { mockEngine } from '../mocks/mockEngine';
import { logger } from '../utils/logger';

/**
 * DashboardController
 * Handles the main dashboard/home page
 */
export class DashboardController {
  /**
   * Display the main dashboard with quick stats
   */
  public async index(_req: Request, res: Response): Promise<void> {
    try {
      // Get quick stats for the dashboard
      const recentLogs = dbService.getRequestLogs(10, 0);
      const allMocks = mockEngine.getAllMocks(false);
      const activeMocks = mockEngine.getAllMocks(true);

      res.render('index', {
        title: 'Dashboard - TS Mock Proxy',
        stats: {
          totalMocks: allMocks.length,
          activeMocks: activeMocks.length,
          recentLogsCount: recentLogs.length,
        },
        recentLogs: recentLogs.slice(0, 5), // Show only 5 most recent
      });
    } catch (error) {
      logger.error('Error rendering dashboard', { error });
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load dashboard',
        error: error,
      });
    }
  }
}

// Export a singleton instance
export const dashboardController = new DashboardController();
