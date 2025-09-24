import express from "express";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import { apiRouter } from "./api";
import { logger } from "../utils/logger";

export class DashboardServer {
  private app: express.Application;
  private port: number;

  constructor(port: number) {
    this.app = express();
    this.port = port;
    this.configureMiddleware();
    this.configureRoutes();
  }

  private configureMiddleware(): void {
    // Middleware para CORS
    this.app.use(cors());

    // Middleware para logging de requisições HTTP
    this.app.use(
      morgan("dev", {
        stream: {
          write: (message: string) => logger.http(message.trim()),
        },
      })
    );

    // Middleware para parsing de JSON
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Servir arquivos estáticos do diretório public
    this.app.use(express.static(path.join(process.cwd(), "public")));

    // Servir arquivos estáticos do diretório dist (build JS)
    this.app.use("/dist", express.static(path.join(process.cwd(), "dist")));
  }

  private configureRoutes(): void {
    // Rotas da API
    this.app.use("/api", apiRouter);

    // Rota para o dashboard (SPA)
    this.app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "public", "index.html"));
    });
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
