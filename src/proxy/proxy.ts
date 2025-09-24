import { createProxyMiddleware, RequestHandler } from "http-proxy-middleware";
import { Request, Response } from "express";
import { dbService, RequestLog } from "../db/database";
import { mockEngine } from "../mocks/mockEngine";
import { logger } from "../utils/logger";

export interface ProxyConfig {
  target: string;
  port: number;
  pathRewrite?: Record<string, string>;
  secure?: boolean;
}

export class ProxyService {
  private proxyMiddleware: RequestHandler;
  private config: ProxyConfig;

  constructor(config: ProxyConfig) {
    this.config = config;
    this.proxyMiddleware = this.createProxyMiddleware();
  }

  // Função para filtrar URLs que não devem ser logadas
  private shouldLogRequest(url: string): boolean {
    if (!url) return false;

    const IGNORED_PATHS = [
      "/favicon.ico",
      "/@vite/client",
      "/sockjs-node",
      "/__webpack_hmr",
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
      logLevel: "silent",

      onProxyReq: (proxyReq, req, res) => {
        this.handleProxyRequest(proxyReq, req as Request, res as Response);
      },

      onProxyRes: (proxyRes, req, res) => {
        this.handleProxyResponse(proxyRes, req as Request, res as Response);
      },

      onError: (err, req, res) => {
        logger.error(`Proxy error: ${err.message}`, { error: err });
        if (!res.headersSent) {
          (res as Response)
            .status(500)
            .json({ error: "Proxy error", message: err.message });
        }
      },
    });
  }

  private handleProxyRequest(proxyReq: any, req: Request, res: Response): void {
    let requestBody = "";
    if (req.body) {
      requestBody =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (requestBody) {
        proxyReq.setHeader("Content-Length", Buffer.byteLength(requestBody));
        proxyReq.write(requestBody);
      }
    }

    (req as any).proxyStartTime = Date.now();
    (req as any).originalBody = requestBody;

    // Se houver mock, retorna ele imediatamente
    const mockResponse = mockEngine.findMockForRequest(req.url, req.method);
    if (mockResponse) {
      logger.info(`Using mock for ${req.method} ${req.url}`);
      proxyReq.abort();

      const requestLog: Omit<RequestLog, "id"> = {
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

      const mockHeaders = JSON.parse(mockResponse.headers);
      Object.keys(mockHeaders).forEach((key) =>
        res.setHeader(key, mockHeaders[key])
      );
      res.status(mockResponse.statusCode).send(mockResponse.body);
      return;
    }

    // Sempre registra logs se não for arquivo estático/HMR/etc
    if (this.shouldLogRequest(req.url)) {
      logger.info(`Proxying ${req.method} ${req.url} to ${this.config.target}`);

      const requestLog: Omit<RequestLog, "id"> = {
        url: req.url,
        method: req.method,
        headers: JSON.stringify(req.headers),
        body: requestBody,
        timestamp: Date.now(),
      };

      const logId = dbService.saveRequestLog(requestLog);
      (req as any).requestLogId = logId;
    }
  }

  private handleProxyResponse(
    proxyRes: any,
    req: Request,
    res: Response
  ): void {
    const requestLogId = (req as any).requestLogId;
    if (!requestLogId) return;

    const startTime = (req as any).proxyStartTime || Date.now();
    const responseTime = Date.now() - startTime;

    let responseBody = "";
    proxyRes.on("data", (chunk: Buffer) => {
      responseBody += chunk.toString("utf8");
    });

    proxyRes.on("end", () => {
      // Sempre atualiza o log com a resposta, independente de mock ou gravação
      dbService.updateRequestLogWithResponse(
        requestLogId,
        proxyRes.statusCode,
        JSON.stringify(proxyRes.headers),
        responseBody,
        responseTime
      );
    });
  }

  getMiddleware(): RequestHandler {
    return this.proxyMiddleware;
  }
}

export function createProxyService(config: ProxyConfig): ProxyService {
  return new ProxyService(config);
}
