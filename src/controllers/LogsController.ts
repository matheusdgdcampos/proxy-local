import type { Request, Response } from 'express';
import { dbService } from '../db/database';
import { mockEngine } from '../mocks/mockEngine';
import { logger } from '../utils/logger';

/**
 * LogsController
 * Handles request logs display and operations
 */
export class LogsController {
  /**
   * Display logs list with pagination
   */
  public async index(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const logs = dbService.getRequestLogs(limit, offset);

      res.render('logs', {
        title: 'Request Logs - TS Mock Proxy',
        logs,
        pagination: {
          limit,
          offset,
          hasMore: logs.length === limit,
        },
        error: null,
      });
    } catch (error) {
      logger.error('Error fetching request logs', { error });
      res.render('logs', {
        title: 'Request Logs - TS Mock Proxy',
        logs: [],
        pagination: { limit: 100, offset: 0, hasMore: false },
        error: 'Failed to load request logs',
      });
    }
  }

  /**
   * Display single log details
   */
  public async show(req: Request, res: Response): Promise<void> {
    try {
      const log = dbService.getRequestLogById(req.params.id);

      if (!log) {
        return res.status(404).render('error', {
          title: 'Log Not Found',
          message: 'The requested log was not found',
          error: null,
        });
      }

      res.render('log-detail', {
        title: `Log Details - ${log.method} ${log.url}`,
        log,
      });
    } catch (error) {
      logger.error('Error fetching request log', { error, id: req.params.id });
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to fetch request log',
        error: error,
      });
    }
  }

  /**
   * Create mock from log entry
   */
  public async createMock(req: Request, res: Response): Promise<void> {
    try {
      const mockId = mockEngine.createMockFromRequestLog(req.params.id);

      if (mockId) {
        // Redirect to mocks page with success message
        res.redirect('/mocks?success=mock-created');
      } else {
        // Redirect back to logs with error
        res.redirect('/logs?error=failed-to-create-mock');
      }
    } catch (error) {
      logger.error('Error creating mock from log', {
        error,
        id: req.params.id,
      });
      res.redirect('/logs?error=failed-to-create-mock');
    }
  }

  /**
   * Clear all or old request logs
   */
  public async clear(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.body.days as string, 10);

      let count: number;
      if (days && days > 0) {
        count = dbService.clearOldRequestLogs(days);
        logger.info('Old request logs cleared via controller', { days, count });
      } else {
        count = dbService.clearAllRequestLogs();
        logger.info('All request logs cleared via controller', { count });
      }

      res.redirect('/logs?success=logs-cleared');
    } catch (error) {
      logger.error('Error clearing request logs', { error });
      res.redirect('/logs?error=failed-to-clear-logs');
    }
  }
}

// Export a singleton instance
export const logsController = new LogsController();
