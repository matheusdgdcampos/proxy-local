import path from 'node:path';
import cors from 'cors';
import express, { type Express } from 'express';
import morgan from 'morgan';
import {
  dashboardController,
  logsController,
  mocksController,
  settingsController,
} from '../controllers';
import { setBroadcastCallbacks } from '../db/database';
import { logger } from '../utils/logger';
import { apiRouter, broadcastLogUpdate, broadcastNewLog } from './api';

export class DashboardServer {
  private app: Express;
  private port: number;

  constructor(port: number) {
    this.app = express();
    this.port = port;
    this.configureViewEngine();
    this.configureMiddleware();
    this.configureRoutes();

    // Configure SSE broadcast callbacks
    setBroadcastCallbacks(broadcastNewLog, broadcastLogUpdate);
  }

  private configureViewEngine(): void {
    // Configure EJS as the view engine
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../views'));
  }

  private configureMiddleware(): void {
    // Middleware para CORS
    this.app.use(cors());

    // Middleware para logging de requisições HTTP
    this.app.use(
      morgan('dev', {
        stream: {
          write: (message: string) => logger.http(message.trim()),
        },
      }),
    );

    // Middleware para parsing de JSON
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Servir arquivos estáticos do diretório public
    this.app.use(express.static(path.join(process.cwd(), 'public')));
  }

  private configureRoutes(): void {
    // Keep API routes for AJAX progressive enhancement
    this.app.use('/api', apiRouter);

    // Dashboard routes
    this.app.get('/', dashboardController.index);

    // Logs routes
    this.app.get('/logs', logsController.index);
    this.app.get('/logs/:id', logsController.show);
    this.app.post('/logs/:id/create-mock', logsController.createMock);
    this.app.post('/logs/clear', logsController.clear);

    // Mocks routes
    this.app.get('/mocks', mocksController.index);
    this.app.post('/mocks', mocksController.create);
    this.app.get('/mocks/:id', mocksController.show);
    this.app.get('/mocks/:id/edit', mocksController.edit);
    this.app.post('/mocks/:id', mocksController.update);
    this.app.post('/mocks/:id/delete', mocksController.delete);
    this.app.post('/mocks/:id/toggle', mocksController.toggleActive);

    // Settings routes
    this.app.get('/settings', settingsController.index);
    this.app.post('/settings', settingsController.update);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`Dashboard server running on port ${this.port}`);
    });
  }
}

// Factory function para criar o servidor do dashboard
export function createDashboardServer(port: number): DashboardServer {
  return new DashboardServer(port);
}
