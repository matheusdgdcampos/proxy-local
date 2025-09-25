import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

// Definição dos tipos
export interface RequestLog {
  id: string;
  url: string;
  method: string;
  headers: string;
  body: string;
  timestamp: number;
  responseStatus?: number;
  responseHeaders?: string;
  responseBody?: string;
  responseTime?: number;
}

export interface MockConfig {
  id: string;
  url: string;
  method: string;
  statusCode: number;
  headers: string;
  body: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

class DatabaseService {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Garante que o diretório de dados existe
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = path.join(dataDir, 'mockproxy.db');
    this.db = new Database(this.dbPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    // Tabela para logs de requisições
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS request_logs (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        method TEXT NOT NULL,
        headers TEXT NOT NULL,
        body TEXT,
        timestamp INTEGER NOT NULL,
        response_status INTEGER,
        response_headers TEXT,
        response_body TEXT,
        response_time INTEGER
      )
    `);

    // Tabela para configurações de mock
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mock_configs (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        method TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        headers TEXT NOT NULL,
        body TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Índices para melhorar a performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_request_logs_url ON request_logs(url);
      CREATE INDEX IF NOT EXISTS idx_request_logs_method ON request_logs(method);
      CREATE INDEX IF NOT EXISTS idx_mock_configs_url ON mock_configs(url);
      CREATE INDEX IF NOT EXISTS idx_mock_configs_method ON mock_configs(method);
      CREATE INDEX IF NOT EXISTS idx_mock_configs_active ON mock_configs(active);
    `);
  }

  // Métodos para logs de requisições
  saveRequestLog(log: Omit<RequestLog, 'id'>): string {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO request_logs (
        id, url, method, headers, body, timestamp, 
        response_status, response_headers, response_body, response_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      log.url,
      log.method,
      log.headers,
      log.body || '',
      log.timestamp,
      log.responseStatus || null,
      log.responseHeaders || null,
      log.responseBody || null,
      log.responseTime || null,
    );

    return id;
  }

  updateRequestLogWithResponse(
    id: string,
    responseStatus: number,
    responseHeaders: string,
    responseBody: string,
    responseTime: number,
  ): void {
    const stmt = this.db.prepare(`
      UPDATE request_logs 
      SET response_status = ?, response_headers = ?, response_body = ?, response_time = ?
      WHERE id = ?
    `);

    stmt.run(responseStatus, responseHeaders, responseBody, responseTime, id);
  }

  getRequestLogs(limit = 100, offset = 0): RequestLog[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, url, method, headers, body, timestamp, 
        response_status as responseStatus, 
        response_headers as responseHeaders, 
        response_body as responseBody, 
        response_time as responseTime
      FROM request_logs
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset) as RequestLog[];
  }

  getRequestLogById(id: string): RequestLog | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, url, method, headers, body, timestamp, 
        response_status as responseStatus, 
        response_headers as responseHeaders, 
        response_body as responseBody, 
        response_time as responseTime
      FROM request_logs
      WHERE id = ?
    `);

    return stmt.get(id) as RequestLog | null;
  }

  // Métodos para configurações de mock
  saveMockConfig(
    config: Omit<MockConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): string {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO mock_configs (
        id, url, method, status_code, headers, body, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      config.url,
      config.method,
      config.statusCode,
      config.headers,
      config.body || '',
      config.active ? 1 : 0,
      now,
      now,
    );

    return id;
  }

  updateMockConfig(
    id: string,
    config: Partial<Omit<MockConfig, 'id' | 'createdAt' | 'updatedAt'>>,
  ): boolean {
    const now = Date.now();

    // Construir a query dinamicamente com base nos campos fornecidos
    const updateFields: string[] = [];
    const params: Array<string | number | boolean> = [];

    if (config.url !== undefined) {
      updateFields.push('url = ?');
      params.push(config.url);
    }

    if (config.method !== undefined) {
      updateFields.push('method = ?');
      params.push(config.method);
    }

    if (config.statusCode !== undefined) {
      updateFields.push('status_code = ?');
      params.push(config.statusCode);
    }

    if (config.headers !== undefined) {
      updateFields.push('headers = ?');
      params.push(config.headers);
    }

    if (config.body !== undefined) {
      updateFields.push('body = ?');
      params.push(config.body);
    }

    if (config.active !== undefined) {
      updateFields.push('active = ?');
      params.push(config.active ? 1 : 0);
    }

    updateFields.push('updated_at = ?');
    params.push(now);

    // Adicionar o ID no final dos parâmetros
    params.push(id);

    if (updateFields.length === 0) {
      return false;
    }

    const query = `
      UPDATE mock_configs 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.run(...params);

    return result.changes > 0;
  }

  getMockConfigs(active?: boolean): MockConfig[] {
    let query = `
      SELECT 
        id, url, method, 
        status_code as statusCode, 
        headers, body, 
        active, 
        created_at as createdAt, 
        updated_at as updatedAt
      FROM mock_configs
    `;

    if (active !== undefined) {
      query += ` WHERE active = ${active ? 1 : 0}`;
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all() as MockConfig[];
  }

  getMockConfigById(id: string): MockConfig | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, url, method, 
        status_code as statusCode, 
        headers, body, 
        active, 
        created_at as createdAt, 
        updated_at as updatedAt
      FROM mock_configs
      WHERE id = ?
    `);

    return stmt.get(id) as MockConfig | null;
  }

  findMockConfigForRequest(url: string, method: string): MockConfig | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, url, method, 
        status_code as statusCode, 
        headers, body, 
        active, 
        created_at as createdAt, 
        updated_at as updatedAt
      FROM mock_configs
      WHERE url = ? AND method = ? AND active = 1
      LIMIT 1
    `);

    return stmt.get(url, method) as MockConfig | null;
  }

  deleteMockConfig(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM mock_configs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

// Exporta uma instância única do serviço de banco de dados
export const dbService = new DatabaseService();
