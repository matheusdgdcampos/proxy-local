import type { Request, Response } from 'express';
import { type AppConfig, loadConfig, saveConfig } from '../config';
import { logger } from '../utils/logger';

/**
 * SettingsController
 * Handles application configuration
 */
class SettingsController {
  /**
   * Display settings form
   */
  public async index(req: Request, res: Response): Promise<void> {
    try {
      const config = loadConfig();
      const successMessage = req.query.success as string;
      const errorMessage = req.query.error as string;

      res.render('settings', {
        title: 'Settings - TS Mock Proxy',
        config,
        successMessage:
          successMessage === 'saved' ? 'Settings saved successfully!' : null,
        errorMessage:
          errorMessage === 'failed' ? 'Failed to save settings' : null,
      });
    } catch (error) {
      logger.error('Error fetching config', { error });
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load configuration',
        error: error,
      });
    }
  }

  /**
   * Handle POST to save settings
   */
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const newConfig: AppConfig = req.body;
      const success = saveConfig(newConfig);

      if (success) {
        res.redirect('/settings?success=saved');
      } else {
        res.redirect('/settings?error=failed');
      }
    } catch (error) {
      logger.error('Error saving config', { error });
      res.redirect('/settings?error=failed');
    }
  }
}

// Export a singleton instance
export const settingsController = new SettingsController();
