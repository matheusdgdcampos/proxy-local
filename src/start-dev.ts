import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import { config } from './config';
import { createDashboardServer } from './dashboard/server';
import { createProxyService } from './proxy/proxy';
import { logger } from './utils/logger';

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
    let proxyServer: http.Server | https.Server;
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
    const dashboardServer = createDashboardServer(config.dashboard.port);
    dashboardServer.start();

    logger.info(
      `Dashboard disponível em http://localhost:${config.dashboard.port}`,
    );
    logger.info('TS Mock Proxy iniciado com sucesso!');

    console.log('\n=== TS Mock Proxy ===');
    console.log(
      `Proxy: ${config.https.enabled ? 'https' : 'http'}://localhost:${
        config.proxy.port
      } -> ${config.proxy.target}`,
    );
    console.log(`Dashboard: http://localhost:${config.dashboard.port}`);
    console.log('====================\n');
  } catch (error) {
    logger.error('Erro ao iniciar o servidor:', { error });
    process.exit(1);
  }
}

// Inicia o servidor
startServer();
