import { dbService, type MockConfig } from '../db/database';
import { logger } from '../utils/logger';

class MockEngine {
  constructor() {
    logger.info('Mock engine initialized');
  }

  /**
   * Encontra um mock para uma requisição específica
   */
  findMockForRequest(url: string, method: string): MockConfig | null {
    try {
      return dbService.findMockConfigForRequest(url, method);
    } catch (error) {
      logger.error('Error finding mock for request', { error, url, method });
      return null;
    }
  }

  /**
   * Grava um novo mock no banco de dados (sempre grava)
   */
  recordMock(
    mockData: Omit<MockConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): string | null {
    try {
      const id = dbService.saveMockConfig(mockData);
      logger.info(`Mock recorded with ID: ${id}`, {
        url: mockData.url,
        method: mockData.method,
      });
      return id;
    } catch (error) {
      logger.error('Error recording mock', { error, mockData });
      return null;
    }
  }

  /**
   * Atualiza um mock existente
   */
  updateMock(
    id: string,
    mockData: Partial<Omit<MockConfig, 'id' | 'createdAt' | 'updatedAt'>>,
  ): boolean {
    try {
      const result = dbService.updateMockConfig(id, mockData);
      if (result) {
        logger.info(`Mock updated with ID: ${id}`);
      } else {
        logger.warn(`Mock with ID ${id} not found or no changes made`);
      }
      return result;
    } catch (error) {
      logger.error('Error updating mock', { error, id, mockData });
      return false;
    }
  }

  /**
   * Remove um mock do banco de dados
   */
  deleteMock(id: string): boolean {
    try {
      const result = dbService.deleteMockConfig(id);
      if (result) {
        logger.info(`Mock deleted with ID: ${id}`);
      } else {
        logger.warn(`Mock with ID ${id} not found`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting mock', { error, id });
      return false;
    }
  }

  /**
   * Obtém todos os mocks configurados
   */
  getAllMocks(activeOnly: boolean = false): MockConfig[] {
    try {
      return dbService.getMockConfigs(activeOnly ? true : undefined);
    } catch (error) {
      logger.error('Error getting all mocks', { error, activeOnly });
      return [];
    }
  }

  /**
   * Obtém um mock específico pelo ID
   */
  getMockById(id: string): MockConfig | null {
    try {
      return dbService.getMockConfigById(id);
    } catch (error) {
      logger.error('Error getting mock by ID', { error, id });
      return null;
    }
  }

  /**
   * Cria um mock a partir de um log de requisição
   */
  createMockFromRequestLog(requestLogId: string): string | null {
    try {
      const requestLog = dbService.getRequestLogById(requestLogId);

      if (!requestLog || !requestLog.responseStatus) {
        logger.warn(
          'Cannot create mock: Request log not found or missing response data',
          { requestLogId },
        );
        return null;
      }

      const mockData = {
        url: requestLog.url,
        method: requestLog.method,
        statusCode: requestLog.responseStatus,
        headers: requestLog.responseHeaders || '{}',
        body: requestLog.responseBody || '',
        active: true,
      };

      return this.recordMock(mockData);
    } catch (error) {
      logger.error('Error creating mock from request log', {
        error,
        requestLogId,
      });
      return null;
    }
  }
}

// Exporta uma instância única do motor de mocks
export const mockEngine = new MockEngine();
