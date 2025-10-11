import type { Request, Response } from 'express';
import { mockEngine } from '../mocks/mockEngine';
import { logger } from '../utils/logger';

/**
 * MocksController
 * Handles mock configurations CRUD operations
 */
export class MocksController {
  /**
   * Display all mocks
   */
  public async index(req: Request, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const mocks = mockEngine.getAllMocks(activeOnly);

      const successMessage = req.query.success as string;
      const errorMessage = req.query.error as string;

      res.render('mocks', {
        title: 'Mock Configurations - TS Mock Proxy',
        mocks,
        successMessage: this.getSuccessMessage(successMessage),
        errorMessage: this.getErrorMessage(errorMessage),
        activeOnly,
      });
    } catch (error) {
      logger.error('Error fetching mocks', { error });
      res.render('mocks', {
        title: 'Mock Configurations - TS Mock Proxy',
        mocks: [],
        successMessage: null,
        errorMessage: 'Failed to load mocks',
        activeOnly: false,
      });
    }
  }

  /**
   * Handle POST to create new mock
   */
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const { url, method, statusCode, headers, body, active } = req.body;

      if (!url || !method || !statusCode) {
        return res.redirect('/mocks?error=missing-fields');
      }

      const mockId = mockEngine.recordMock({
        url,
        method,
        statusCode: parseInt(statusCode, 10),
        headers: headers || '{}',
        body: body || '',
        active: active === 'true' || active === true,
      });

      if (mockId) {
        res.redirect('/mocks?success=mock-created');
      } else {
        res.redirect('/mocks?error=failed-to-create');
      }
    } catch (error) {
      logger.error('Error creating mock', { error });
      res.redirect('/mocks?error=failed-to-create');
    }
  }

  /**
   * Display single mock details
   */
  public async show(req: Request, res: Response): Promise<void> {
    try {
      const mock = mockEngine.getMockById(req.params.id);

      if (!mock) {
        return res.status(404).render('error', {
          title: 'Mock Not Found',
          message: 'The requested mock configuration was not found',
          error: null,
        });
      }

      res.render('mock-detail', {
        title: `Mock Details - ${mock.method} ${mock.url}`,
        mock,
      });
    } catch (error) {
      logger.error('Error fetching mock', { error, id: req.params.id });
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to fetch mock configuration',
        error: error,
      });
    }
  }

  /**
   * Display edit form for a mock
   */
  public async edit(req: Request, res: Response): Promise<void> {
    try {
      const mock = mockEngine.getMockById(req.params.id);

      if (!mock) {
        return res.status(404).render('error', {
          title: 'Mock Not Found',
          message: 'The requested mock configuration was not found',
          error: null,
        });
      }

      res.render('mock-edit', {
        title: `Edit Mock - ${mock.method} ${mock.url}`,
        mock,
      });
    } catch (error) {
      logger.error('Error fetching mock for edit', {
        error,
        id: req.params.id,
      });
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load mock for editing',
        error: error,
      });
    }
  }

  /**
   * Handle POST/PUT to update mock
   */
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { url, method, statusCode, headers, body, active } = req.body;

      const result = mockEngine.updateMock(req.params.id, {
        url,
        method,
        statusCode: statusCode ? parseInt(statusCode, 10) : undefined,
        headers,
        body,
        active: active === 'true' || active === true,
      });

      if (result) {
        res.redirect('/mocks?success=mock-updated');
      } else {
        res.redirect('/mocks?error=failed-to-update');
      }
    } catch (error) {
      logger.error('Error updating mock', { error, id: req.params.id });
      res.redirect('/mocks?error=failed-to-update');
    }
  }

  /**
   * Handle DELETE to remove mock
   */
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const result = mockEngine.deleteMock(req.params.id);

      if (result) {
        res.redirect('/mocks?success=mock-deleted');
      } else {
        res.redirect('/mocks?error=failed-to-delete');
      }
    } catch (error) {
      logger.error('Error deleting mock', { error, id: req.params.id });
      res.redirect('/mocks?error=failed-to-delete');
    }
  }

  /**
   * Toggle mock active status
   */
  public async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const mock = mockEngine.getMockById(req.params.id);

      if (!mock) {
        return res.redirect('/mocks?error=mock-not-found');
      }

      const result = mockEngine.updateMock(req.params.id, {
        active: !mock.active,
      });

      if (result) {
        res.redirect('/mocks?success=mock-toggled');
      } else {
        res.redirect('/mocks?error=failed-to-toggle');
      }
    } catch (error) {
      logger.error('Error toggling mock', { error, id: req.params.id });
      res.redirect('/mocks?error=failed-to-toggle');
    }
  }

  /**
   * Helper to get success messages
   */
  private getSuccessMessage(key: string | undefined): string | null {
    const messages: Record<string, string> = {
      'mock-created': 'Mock created successfully!',
      'mock-updated': 'Mock updated successfully!',
      'mock-deleted': 'Mock deleted successfully!',
      'mock-toggled': 'Mock status toggled successfully!',
    };
    return key ? messages[key] || null : null;
  }

  /**
   * Helper to get error messages
   */
  private getErrorMessage(key: string | undefined): string | null {
    const messages: Record<string, string> = {
      'missing-fields': 'Missing required fields: url, method, statusCode',
      'failed-to-create': 'Failed to create mock',
      'failed-to-update': 'Failed to update mock',
      'failed-to-delete': 'Failed to delete mock',
      'failed-to-toggle': 'Failed to toggle mock status',
      'mock-not-found': 'Mock not found',
      'failed-to-create-mock': 'Failed to create mock from log',
    };
    return key ? messages[key] || 'An unknown error occurred' : null;
  }
}

// Export a singleton instance
export const mocksController = new MocksController();
