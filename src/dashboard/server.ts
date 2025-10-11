import path from 'node:path';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { setBroadcastCallbacks } from '../db/database';
import { logger } from '../utils/logger';
import { apiRouter, broadcastLogUpdate, broadcastNewLog } from './api';

export class DashboardServer {
  private app: express.Application;
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
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Servir arquivos estáticos do diretório public
    this.app.use(express.static(path.join(process.cwd(), 'public')));
  }

  private configureRoutes(): void {
    // Import controllers
    const {
      dashboardController,
    } = require('../controllers/DashboardController');
    const { logsController } = require('../controllers/LogsController');
    const { mocksController } = require('../controllers/MocksController');
    const { settingsController } = require('../controllers/SettingsController');

    // Keep API routes for AJAX progressive enhancement
    this.app.use('/api', apiRouter);

    // Dashboard routes
    this.app.get('/', (req, res) => dashboardController.index(req, res));

    // Logs routes
    this.app.get('/logs', (req, res) => logsController.index(req, res));
    this.app.get('/logs/:id', (req, res) => logsController.show(req, res));
    this.app.post('/logs/:id/create-mock', (req, res) =>
      logsController.createMock(req, res),
    );
    this.app.post('/logs/clear', (req, res) => logsController.clear(req, res));

    // Mocks routes
    this.app.get('/mocks', (req, res) => mocksController.index(req, res));
    this.app.post('/mocks', (req, res) => mocksController.create(req, res));
    this.app.get('/mocks/:id', (req, res) => mocksController.show(req, res));
    this.app.get('/mocks/:id/edit', (req, res) =>
      mocksController.edit(req, res),
    );
    this.app.post('/mocks/:id', (req, res) => mocksController.update(req, res));
    this.app.post('/mocks/:id/delete', (req, res) =>
      mocksController.delete(req, res),
    );
    this.app.post('/mocks/:id/toggle', (req, res) =>
      mocksController.toggleActive(req, res),
    );

    // Settings routes
    this.app.get('/settings', (req, res) => settingsController.index(req, res));
    this.app.post('/settings', (req, res) =>
      settingsController.update(req, res),
    );
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
