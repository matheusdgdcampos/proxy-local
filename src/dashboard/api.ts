import { type Request, type Response, Router } from 'express';
import { type AppConfig, loadConfig, saveConfig } from '../config';
import { dbService, type RequestLog } from '../db/database';
import { mockEngine } from '../mocks/mockEngine';
import { logger } from '../utils/logger';

// Cria o router para a API do dashboard
export const apiRouter = Router();

// SSE clients management
const sseClients = new Set<Response>();

// SSE endpoint for real-time logs
apiRouter.get('/logs/stream', (req: Request, res: Response) => {
  // Configure SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Add client to the list
  sseClients.add(res);
  logger.info('SSE client connected', { total: sseClients.size });

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Remove client on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    logger.info('SSE client disconnected', { total: sseClients.size });
  });
});

// Broadcast new log to all connected clients
export function broadcastNewLog(log: RequestLog): void {
  const data = JSON.stringify(log);
  sseClients.forEach((client) => {
    try {
      client.write(`event: newLog\ndata: ${data}\n\n`);
    } catch (error) {
      logger.error('Error broadcasting to SSE client', { error });
      sseClients.delete(client);
    }
  });
}

// Broadcast log update to all connected clients
export function broadcastLogUpdate(log: RequestLog): void {
  const data = JSON.stringify(log);
  sseClients.forEach((client) => {
    try {
      client.write(`event: logUpdate\ndata: ${data}\n\n`);
    } catch (error) {
      logger.error('Error broadcasting to SSE client', { error });
      sseClients.delete(client);
    }
  });
}

// Endpoints para logs de requisições
apiRouter.get('/logs', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const logs = dbService.getRequestLogs(limit, offset);
    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Error fetching request logs', { error });
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch request logs' });
  }
});

apiRouter.get('/logs/:id', (req: Request, res: Response) => {
  try {
    const log = dbService.getRequestLogById(req.params.id);
    if (log) {
      res.json({ success: true, data: log });
    } else {
      res.status(404).json({ success: false, error: 'Log not found' });
    }
  } catch (error) {
    logger.error('Error fetching request log', { error, id: req.params.id });
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch request log' });
  }
});

// Endpoint to clear request logs
apiRouter.delete('/logs', (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string, 10);

    let count: number;
    if (days && days > 0) {
      count = dbService.clearOldRequestLogs(days);
      logger.info('Old request logs cleared', { days, count });
    } else {
      count = dbService.clearAllRequestLogs();
      logger.info('All request logs cleared', { count });
    }

    res.json({
      success: true,
      message: `${count} log(s) deleted successfully`,
      count,
    });
  } catch (error) {
    logger.error('Error clearing request logs', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to clear request logs',
    });
  }
});

// Endpoints para configurações de mock
apiRouter.get('/mocks', (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    const mocks = mockEngine.getAllMocks(activeOnly);
    res.json({ success: true, data: mocks });
  } catch (error) {
    logger.error('Error fetching mocks', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch mocks' });
  }
});

apiRouter.get('/mocks/:id', (req: Request, res: Response) => {
  try {
    const mock = mockEngine.getMockById(req.params.id);
    if (mock) {
      res.json({ success: true, data: mock });
    } else {
      res.status(404).json({ success: false, error: 'Mock not found' });
    }
  } catch (error) {
    logger.error('Error fetching mock', { error, id: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to fetch mock' });
  }
});

apiRouter.post('/mocks', (req: Request, res: Response) => {
  try {
    const { url, method, statusCode, headers, body, active } = req.body;

    if (!url || !method || !statusCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: url, method, statusCode',
      });
    }

    const mockId = mockEngine.recordMock({
      url,
      method,
      statusCode,
      headers: headers || '{}',
      body: body || '',
      active: active !== undefined ? active : true,
    });

    if (mockId) {
      res.status(201).json({ success: true, data: { id: mockId } });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create mock' });
    }
  } catch (error) {
    logger.error('Error creating mock', { error });
    res.status(500).json({ success: false, error: 'Failed to create mock' });
  }
});

apiRouter.put('/mocks/:id', (req: Request, res: Response) => {
  try {
    const { url, method, statusCode, headers, body, active } = req.body;
    const result = mockEngine.updateMock(req.params.id, {
      url,
      method,
      statusCode,
      headers,
      body,
      active,
    });

    if (result) {
      res.json({ success: true });
    } else {
      res
        .status(404)
        .json({ success: false, error: 'Mock not found or no changes made' });
    }
  } catch (error) {
    logger.error('Error updating mock', { error, id: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to update mock' });
  }
});

apiRouter.delete('/mocks/:id', (req: Request, res: Response) => {
  try {
    const result = mockEngine.deleteMock(req.params.id);
    if (result) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Mock not found' });
    }
  } catch (error) {
    logger.error('Error deleting mock', { error, id: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to delete mock' });
  }
});

// Endpoint para criar mock a partir de um log de requisição
apiRouter.post('/logs/:id/create-mock', (req: Request, res: Response) => {
  try {
    const mockId = mockEngine.createMockFromRequestLog(req.params.id);
    if (mockId) {
      res.status(201).json({ success: true, data: { id: mockId } });
    } else {
      res.status(400).json({
        success: false,
        error:
          'Failed to create mock from log. Log may not exist or may not have response data.',
      });
    }
  } catch (error) {
    logger.error('Error creating mock from log', { error, id: req.params.id });
    res
      .status(500)
      .json({ success: false, error: 'Failed to create mock from log' });
  }
});

// Endpoints para configuração da aplicação
apiRouter.get('/config', (_req: Request, res: Response) => {
  try {
    const config: AppConfig = loadConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    logger.error('Error fetching config', { error });
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch configuration' });
  }
});

apiRouter.post('/config', (req: Request, res: Response) => {
  try {
    const newConfig: AppConfig = req.body;
    const success = saveConfig(newConfig);
    if (success) {
      res.json({ success: true, message: 'Configurações salvas com sucesso!' });
    } else {
      res
        .status(500)
        .json({ success: false, error: 'Erro ao salvar configuração' });
    }
  } catch (error) {
    logger.error('Error saving config', { error });
    res
      .status(500)
      .json({ success: false, error: 'Failed to save configuration' });
  }
});
