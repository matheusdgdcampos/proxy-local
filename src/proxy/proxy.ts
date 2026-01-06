import type { ClientRequest } from 'node:http';
import type { Request, Response } from 'express';
import {
  createProxyMiddleware,
  type RequestHandler,
} from 'http-proxy-middleware';
import { dbService, type RequestLog } from '../db/database';
import { cookieMockEngine } from '../mocks/cookieMockEngine';
import { mockEngine } from '../mocks/mockEngine';
import { logger } from '../utils/logger';

// Interface para estender Request com propriedades customizadas
interface ExtendedRequest extends Request {
  proxyStartTime?: number;
  originalBody?: string;
  requestLogId?: string;
}

export interface ProxyConfig {
  target: string;
  port: number;
  pathRewrite?: Record<string, string>;
  secure?: boolean;
}

export class ProxyService {
  private proxyMiddleware: RequestHandler;
  private config: ProxyConfig;
  private targetIsSecure: boolean;

  constructor(config: ProxyConfig) {
    this.config = config;
    this.targetIsSecure = /^https:/i.test(config.target);
    this.proxyMiddleware = this.createProxyMiddleware();
  }

  // Função para filtrar URLs que não devem ser logadas
  private shouldLogRequest(url: string): boolean {
    if (!url) return false;

    const IGNORED_PATHS = [
      '/favicon.ico',
      '/@vite/client',
      '/sockjs-node',
      '/__webpack_hmr',
    ];

    const STATIC_FILE_REGEX = /\.(css|js|png|jpg|jpeg|gif|svg|ico|map)$/i;

    if (IGNORED_PATHS.some((path) => url.startsWith(path))) return false;
    if (STATIC_FILE_REGEX.test(url)) return false;

    return true;
  }

  private createProxyMiddleware(): RequestHandler {
    return createProxyMiddleware({
      target: this.config.target,
      changeOrigin: true,
      secure: this.config.secure ?? false,
      pathRewrite: this.config.pathRewrite,
      logLevel: 'silent',

      onProxyReq: (proxyReq, req, res) => {
        this.handleProxyRequest(
          proxyReq,
          req as ExtendedRequest,
          res as Response,
        );
      },

      onProxyRes: (proxyRes, req, res) => {
        this.handleProxyResponse(
          proxyRes,
          req as ExtendedRequest,
          res as Response,
        );
      },

      onError: (err, _req, res) => {
        logger.error(`Proxy error: ${err.message}`, { error: err });
        if (!res.headersSent) {
          (res as Response)
            .status(500)
            .json({ error: 'Proxy error', message: err.message });
        }
      },
    });
  }

  private handleProxyRequest(
    proxyReq: ClientRequest,
    req: ExtendedRequest,
    _res: Response,
  ): void {
    let requestBody = '';
    if (req.body) {
      requestBody =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (requestBody) {
        proxyReq.setHeader('Content-Length', Buffer.byteLength(requestBody));
        proxyReq.write(requestBody);
      }
    }

    req.proxyStartTime = Date.now();
    req.originalBody = requestBody;

    this.applyCookieStrategy(proxyReq, req);

    // Log the proxied request (mocks are already handled in mockCheckMiddleware)
    if (this.shouldLogRequest(req.url)) {
      logger.info(`Proxying ${req.method} ${req.url} to ${this.config.target}`);

      const requestLog: Omit<RequestLog, 'id'> = {
        url: req.url,
        method: req.method,
        headers: JSON.stringify(req.headers),
        body: requestBody,
        timestamp: Date.now(),
      };

      const logId = dbService.saveRequestLog(requestLog);
      req.requestLogId = logId;
    }
  }

  private applyCookieStrategy(
    proxyReq: ClientRequest,
    req: ExtendedRequest,
  ): void {
    const hostHeader = req.headers.host;
    const path = typeof req.path === 'string' ? req.path : req.url;
    const mockedCookies = cookieMockEngine.resolveCookiesForRequest(
      hostHeader,
      path,
      this.targetIsSecure,
    );

    if (mockedCookies.length > 0) {
      const cookieHeader = mockedCookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join('; ');
      proxyReq.setHeader('cookie', cookieHeader);
      logger.info('Applied mocked cookies to outbound request', {
        url: req.url,
        cookieCount: mockedCookies.length,
      });
      return;
    }

    const originalCookies = this.normalizeIncomingCookies(req.headers.cookie);
    if (originalCookies) {
      proxyReq.setHeader('cookie', originalCookies);
    }
  }

  private normalizeIncomingCookies(
    cookieHeader: string | string[] | undefined,
  ): string | undefined {
    if (!cookieHeader) return undefined;
    if (Array.isArray(cookieHeader)) {
      return cookieHeader.join('; ');
    }
    return cookieHeader;
  }

  private handleProxyResponse(
    proxyRes: {
      statusCode?: number;
      headers: Record<string, string | string[] | undefined>;
      on: (event: string, callback: (chunk: Buffer) => void) => void;
    },
    req: ExtendedRequest,
    _res: Response,
  ): void {
    const requestLogId = req.requestLogId;
    if (!requestLogId) return;

    const startTime = req.proxyStartTime || Date.now();
    const responseTime = Date.now() - startTime;

    let responseBody = '';
    proxyRes.on('data', (chunk: Buffer) => {
      responseBody += chunk.toString('utf8');
    });

    proxyRes.on('end', () => {
      // Sempre atualiza o log com a resposta, independente de mock ou gravação
      dbService.updateRequestLogWithResponse(
        requestLogId,
        proxyRes.statusCode || 200,
        JSON.stringify(proxyRes.headers),
        responseBody,
        responseTime,
      );
    });
  }

  /**
   * Middleware to check for mocks before proxying
   */
  private mockCheckMiddleware(
    req: ExtendedRequest,
    res: Response,
    next: () => void,
  ): void {
    // Check if there's a mock for this request
    const mockResponse = mockEngine.findMockForRequest(req.url, req.method);

    if (mockResponse) {
      logger.info(`Using mock for ${req.method} ${req.url}`);

      // Capture request body for logging
      let requestBody = '';
      if (req.body) {
        requestBody =
          typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      // Log the request with mock response
      const requestLog: Omit<RequestLog, 'id'> = {
        url: req.url,
        method: req.method,
        headers: JSON.stringify(req.headers),
        body: requestBody,
        timestamp: Date.now(),
        responseStatus: mockResponse.statusCode,
        responseHeaders: mockResponse.headers,
        responseBody: mockResponse.body,
        responseTime: 0,
      };

      dbService.saveRequestLog(requestLog);

      // Parse and set response headers
      const mockHeaders = JSON.parse(mockResponse.headers);
      Object.keys(mockHeaders).forEach((key) => {
        res.setHeader(key, mockHeaders[key]);
      });

      // Parse body if it's a JSON string, otherwise send as-is
      try {
        const parsedBody = JSON.parse(mockResponse.body);
        res.status(mockResponse.statusCode).json(parsedBody);
      } catch {
        // If body is not JSON, send as plain text
        res.status(mockResponse.statusCode).json(mockResponse.body);
      }
      return;
    }

    // No mock found, proceed to proxy
    next();
  }

  getMiddleware(): RequestHandler {
    // Return a combined middleware that checks mocks first, then proxies
    return (req: Request, res: Response, next) => {
      this.mockCheckMiddleware(req as ExtendedRequest, res, () => {
        this.proxyMiddleware(req, res, next);
      });
    };
  }
}

export function createProxyService(config: ProxyConfig): ProxyService {
  return new ProxyService(config);
}
