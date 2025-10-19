import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import { config } from './config';
import { createDashboardServer } from './dashboard/server';
import { dbService } from './db/database';
import { createProxyService } from './proxy/proxy';
import { logger } from './utils/logger';

// Server instances for graceful shutdown
let proxyServer: http.Server | https.Server | null = null;
let dashboardServer: ReturnType<typeof createDashboardServer> | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} recebido. Iniciando graceful shutdown...`);

  // Set a timeout to force exit if shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout - forçando saída após 30 segundos');
    process.exit(1);
  }, 30000);

  try {
    // Close proxy server
    if (proxyServer) {
      await new Promise<void>((resolve, reject) => {
        proxyServer?.close((err) => {
          if (err) {
            logger.error('Erro ao fechar servidor proxy:', { error: err });
            reject(err);
          } else {
            logger.info('Servidor proxy fechado');
            resolve();
          }
        });
      });
    }

    // Close dashboard server
    if (dashboardServer) {
      await dashboardServer.stop();
    }

    // Close database connection
    dbService.close();
    logger.info('Conexão com o banco de dados fechada');

    logger.info('Graceful shutdown concluído com sucesso');
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (error) {
    logger.error('Erro durante o graceful shutdown:', { error });
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

async function startServer() {
  logger.info('Iniciando TS Mock Proxy...');

  try {
    // Inicializa o motor de mocks
    logger.info('Motor de mocks inicializado');

    // Configura o servidor proxy
    const app = express();
    const proxyService = createProxyService({
      target: config.proxy.target,
      port: config.proxy.port,
      secure: config.proxy.secure,
    });

    // Adiciona o middleware do proxy
    app.use(proxyService.getMiddleware());

    // Cria o servidor HTTP ou HTTPS para o proxy
    if (config.https.enabled) {
      try {
        const httpsOptions = {
          key: fs.readFileSync(config.https.keyPath),
          cert: fs.readFileSync(config.https.certPath),
        };
        proxyServer = https.createServer(httpsOptions, app);
        logger.info('Servidor proxy HTTPS configurado');
      } catch (error) {
        logger.error(
          'Erro ao carregar certificados HTTPS. Usando HTTP como fallback.',
          { error },
        );
        proxyServer = http.createServer(app);
      }
    } else {
      proxyServer = http.createServer(app);
    }

    // Inicia o servidor proxy
    proxyServer.listen(config.proxy.port, () => {
      logger.info(
        `Servidor proxy rodando em ${
          config.https.enabled ? 'https' : 'http'
        }://localhost:${config.proxy.port}`,
      );
    });

    // Inicia o servidor do dashboard
    dashboardServer = createDashboardServer(config.dashboard.port);
    dashboardServer.start();

    logger.info(
      `Dashboard disponível em http://localhost:${config.dashboard.port}`,
    );
    logger.info('TS Mock Proxy iniciado com sucesso!');

    console.log('\n');
    console.log(
      '.-----.  .----.   .-.  .-.  .---.  .----. .-..-.   .-.-.  .---.   .---.  .-..-. .-.  .-.',
    );
    console.log(
      "`-' '-' { {__-`   }  \\/  { / {-. \\ | }`-' | ' /    | } }} } }}_} / {-. \\ \\ {} /  \\ \\/ /",
    );
    console.log(
      "  } {   .-._} }   | {  } | \\ '-} / | },-. | . \\    | |-'  | } \\  \\ '-} / / {} \\   `-\\ }",
    );
    console.log(
      "  `-'   `----'    `-'  `-'  `---'  `----' `-'`-`   `-'    `-'-'   `---'  `-'`-'     `-'",
    );
    console.log('');
    console.log(
      `  Proxy: ${config.https.enabled ? 'https' : 'http'}://localhost:${
        config.proxy.port
      } -> ${config.proxy.target}`,
    );
    console.log(`  Dashboard: http://localhost:${config.dashboard.port}`);
    console.log('');

    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', { error });
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', { promise, reason });
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    logger.error('Erro ao iniciar o servidor:', { error });
    process.exit(1);
  }
}

// Inicia o servidor
startServer();
