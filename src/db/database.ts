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

// Callback types for broadcasting
type BroadcastCallback = (log: RequestLog) => void;

// Broadcast callbacks (injected to avoid circular dependencies)
let broadcastNewLog: BroadcastCallback | null = null;
let broadcastLogUpdate: BroadcastCallback | null = null;

// Setter for broadcast callbacks
export function setBroadcastCallbacks(
  onNewLog: BroadcastCallback,
  onLogUpdate: BroadcastCallback,
): void {
  broadcastNewLog = onNewLog;
  broadcastLogUpdate = onLogUpdate;
}

export interface MockConfig {
  id: string;
  url: string;
  method: string;
  statusCode: number;
  headers: string;
  body: string;
  active: boolean;
  patternType: 'exact' | 'dynamic';
  createdAt: number;
  updatedAt: number;
}

export type DomainPatternType = 'wildcard' | 'regex';

export interface CookieDefinition {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number | null;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None' | '';
}

export interface CookieMock {
  id: string;
  label: string;
  domainPattern: string;
  patternType: DomainPatternType;
  cookies: CookieDefinition[];
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
    this.createRequestLogsTable();
    this.createMockConfigsTable();
    this.createCookieMocksTable();
    this.ensureCookieMocksSchema();
    this.ensureMockConfigsSchema();
    this.createIndexes();
  }

  private createRequestLogsTable(): void {
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
  }

  private createMockConfigsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mock_configs (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        method TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        headers TEXT NOT NULL,
        body TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        pattern_type TEXT NOT NULL DEFAULT 'exact',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  private createCookieMocksTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cookie_mocks (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        domain_pattern TEXT NOT NULL,
        pattern_type TEXT NOT NULL,
        cookies TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  private ensureCookieMocksSchema(): void {
    const requiredColumns = new Set([
      'id',
      'label',
      'domain_pattern',
      'pattern_type',
      'cookies',
      'active',
      'created_at',
      'updated_at',
    ]);

    const columns = this.db
      .prepare('PRAGMA table_info(cookie_mocks)')
      .all() as Array<{ name: string }>;

    if (columns.length === 0) {
      this.createCookieMocksTable();
      return;
    }

    const existingColumns = new Set(columns.map((column) => column.name));
    const hasMissingColumns = Array.from(requiredColumns).some(
      (column) => !existingColumns.has(column),
    );

    if (hasMissingColumns) {
      this.db.exec('DROP TABLE IF EXISTS cookie_mocks');
      this.createCookieMocksTable();
    }
  }

  private ensureMockConfigsSchema(): void {
    const columns = this.db
      .prepare('PRAGMA table_info(mock_configs)')
      .all() as Array<{ name: string }>;

    if (columns.length === 0) {
      return;
    }

    const existingColumns = new Set(columns.map((column) => column.name));

    // Adicionar pattern_type se não existir
    if (!existingColumns.has('pattern_type')) {
      this.db.exec(`
        ALTER TABLE mock_configs 
        ADD COLUMN pattern_type TEXT NOT NULL DEFAULT 'exact'
      `);
    }
  }

  private createIndexes(): void {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_request_logs_url ON request_logs(url);
      CREATE INDEX IF NOT EXISTS idx_request_logs_method ON request_logs(method);
      CREATE INDEX IF NOT EXISTS idx_mock_configs_url ON mock_configs(url);
      CREATE INDEX IF NOT EXISTS idx_mock_configs_method ON mock_configs(method);
      CREATE INDEX IF NOT EXISTS idx_mock_configs_active ON mock_configs(active);
      CREATE INDEX IF NOT EXISTS idx_cookie_mocks_domain_pattern ON cookie_mocks(domain_pattern);
      CREATE INDEX IF NOT EXISTS idx_cookie_mocks_active ON cookie_mocks(active);
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

    // Broadcast the new log to SSE clients
    if (broadcastNewLog) {
      const savedLog = this.getRequestLogById(id);
      if (savedLog) {
        broadcastNewLog(savedLog);
      }
    }

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

    // Broadcast the log update to SSE clients
    if (broadcastLogUpdate) {
      const updatedLog = this.getRequestLogById(id);
      if (updatedLog) {
        broadcastLogUpdate(updatedLog);
      }
    }
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

  /**
   * Clear all request logs
   * @returns Number of records deleted
   */
  clearAllRequestLogs(): number {
    const stmt = this.db.prepare('DELETE FROM request_logs');
    const result = stmt.run();
    return result.changes;
  }

  /**
   * Clear request logs older than X days
   * @param days Number of days to keep
   * @returns Number of records deleted
   */
  clearOldRequestLogs(days: number): number {
    const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;
    const stmt = this.db.prepare(
      'DELETE FROM request_logs WHERE timestamp < ?',
    );
    const result = stmt.run(cutoffTimestamp);
    return result.changes;
  }

  /**
   * Detecta automaticamente se uma URL contém parâmetros dinâmicos
   * @param url URL pattern to check
   * @returns 'dynamic' se contém :param, 'exact' caso contrário
   */
  private detectPatternType(url: string): 'exact' | 'dynamic' {
    // Remove query params antes de verificar
    const cleanUrl = url.split('?')[0];
    // Verifica se contém parâmetros dinâmicos (:param)
    return cleanUrl.includes(':') ? 'dynamic' : 'exact';
  }

  // Métodos para configurações de mock
  saveMockConfig(
    config: Omit<MockConfig, 'id' | 'createdAt' | 'updatedAt' | 'patternType'>,
  ): string {
    const id = uuidv4();
    const now = Date.now();

    // Detecta automaticamente o tipo de pattern baseado na URL
    const patternType = this.detectPatternType(config.url);

    const stmt = this.db.prepare(`
      INSERT INTO mock_configs (
        id, url, method, status_code, headers, body, active, pattern_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      config.url,
      config.method,
      config.statusCode,
      config.headers,
      config.body || '',
      config.active ? 1 : 0,
      patternType,
      now,
      now,
    );

    return id;
  }

  updateMockConfig(
    id: string,
    config: Partial<
      Omit<MockConfig, 'id' | 'createdAt' | 'updatedAt' | 'patternType'>
    >,
  ): boolean {
    const now = Date.now();

    // Construir a query dinamicamente com base nos campos fornecidos
    const updateFields: string[] = [];
    const params: Array<string | number | boolean> = [];

    if (config.url !== undefined) {
      updateFields.push('url = ?');
      params.push(config.url);
      // Se a URL mudou, re-detecta o pattern type automaticamente
      const patternType = this.detectPatternType(config.url);
      updateFields.push('pattern_type = ?');
      params.push(patternType);
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
        pattern_type as patternType,
        created_at as createdAt, 
        updated_at as updatedAt
      FROM mock_configs
    `;

    if (active !== undefined) {
      query += ` WHERE active = ${active ? 1 : 0}`;
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const results = stmt.all() as Array<
      Omit<MockConfig, 'active'> & { active: number }
    >;

    // Convert active from integer to boolean
    return results.map((row) => ({
      ...row,
      active: row.active === 1,
    }));
  }

  getMockConfigById(id: string): MockConfig | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, url, method, 
        status_code as statusCode, 
        headers, body, 
        active,
        pattern_type as patternType,
        created_at as createdAt, 
        updated_at as updatedAt
      FROM mock_configs
      WHERE id = ?
    `);

    const result = stmt.get(id) as
      | (Omit<MockConfig, 'active'> & { active: number })
      | null;

    if (!result) return null;

    // Convert active from integer to boolean
    return {
      ...result,
      active: result.active === 1,
    };
  }

  findMockConfigForRequest(url: string, method: string): MockConfig | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, url, method, 
        status_code as statusCode, 
        headers, body, 
        active,
        pattern_type as patternType,
        created_at as createdAt, 
        updated_at as updatedAt
      FROM mock_configs
      WHERE method = ? AND active = 1
      ORDER BY created_at DESC
    `);

    const results = stmt.all(method) as Array<
      Omit<MockConfig, 'active'> & { active: number }
    >;

    // Remove query params from URL for matching
    const cleanUrl = url.split('?')[0];

    // Try to find a matching mock
    for (const row of results) {
      const mockConfig = {
        ...row,
        active: row.active === 1,
      };

      if (mockConfig.patternType === 'exact') {
        // Exact match (also remove query params from mock url)
        const cleanMockUrl = mockConfig.url.split('?')[0];
        if (cleanMockUrl === cleanUrl) {
          return mockConfig;
        }
      } else if (mockConfig.patternType === 'dynamic') {
        // Dynamic match with URL parameters
        if (this.matchDynamicPattern(mockConfig.url, cleanUrl)) {
          return mockConfig;
        }
      }
    }

    return null;
  }

  /**
   * Matches a dynamic URL pattern against an actual URL
   * Pattern: /users/:id/check
   * URL: /users/12345/check
   * Returns: true
   */
  private matchDynamicPattern(pattern: string, url: string): boolean {
    // Remove query params from pattern
    const cleanPattern = pattern.split('?')[0];

    // Split both into segments
    const patternSegments = cleanPattern.split('/').filter((s) => s);
    const urlSegments = url.split('/').filter((s) => s);

    // Must have same number of segments
    if (patternSegments.length !== urlSegments.length) {
      return false;
    }

    // Check each segment
    for (let i = 0; i < patternSegments.length; i++) {
      const patternSeg = patternSegments[i];
      const urlSeg = urlSegments[i];

      // If pattern segment starts with :, it's a parameter (matches anything)
      if (patternSeg.startsWith(':')) {
        continue;
      }

      // Otherwise, must match exactly
      if (patternSeg !== urlSeg) {
        return false;
      }
    }

    return true;
  }

  deleteMockConfig(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM mock_configs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  private mapCookieMockRow(
    row:
      | (Omit<CookieMock, 'active' | 'cookies'> & {
          active: number;
          cookies: string;
        })
      | null,
  ): CookieMock | null {
    if (!row) return null;
    let cookies: CookieDefinition[] = [];
    try {
      cookies = JSON.parse(row.cookies) as CookieDefinition[];
    } catch {
      cookies = [];
    }

    return {
      ...(row as unknown as Omit<CookieMock, 'active' | 'cookies'>),
      active: row.active === 1,
      cookies,
    };
  }

  saveCookieMock(
    config: Omit<CookieMock, 'id' | 'createdAt' | 'updatedAt'>,
  ): string {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO cookie_mocks (
        id, label, domain_pattern, pattern_type, cookies, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      config.label,
      config.domainPattern,
      config.patternType,
      JSON.stringify(config.cookies || []),
      config.active ? 1 : 0,
      now,
      now,
    );

    return id;
  }

  updateCookieMock(
    id: string,
    config: Partial<Omit<CookieMock, 'id' | 'createdAt' | 'updatedAt'>>,
  ): boolean {
    const now = Date.now();
    const updateFields: string[] = [];
    const params: Array<string | number | boolean> = [];

    if (config.label !== undefined) {
      updateFields.push('label = ?');
      params.push(config.label);
    }

    if (config.domainPattern !== undefined) {
      updateFields.push('domain_pattern = ?');
      params.push(config.domainPattern);
    }

    if (config.patternType !== undefined) {
      updateFields.push('pattern_type = ?');
      params.push(config.patternType);
    }

    if (config.cookies !== undefined) {
      updateFields.push('cookies = ?');
      params.push(JSON.stringify(config.cookies));
    }

    if (config.active !== undefined) {
      updateFields.push('active = ?');
      params.push(config.active ? 1 : 0);
    }

    updateFields.push('updated_at = ?');
    params.push(now);
    params.push(id);

    if (updateFields.length === 1) {
      // Only updated_at
      return false;
    }

    const query = `
      UPDATE cookie_mocks
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  getCookieMocks(active?: boolean): CookieMock[] {
    let query = `
      SELECT 
        id, label, domain_pattern as domainPattern,
        pattern_type as patternType, cookies, active,
        created_at as createdAt, updated_at as updatedAt
      FROM cookie_mocks
    `;

    if (active !== undefined) {
      query += ` WHERE active = ${active ? 1 : 0}`;
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const results = stmt.all() as Array<
      Omit<CookieMock, 'active' | 'cookies'> & {
        active: number;
        cookies: string;
      }
    >;

    return results
      .map((row) => this.mapCookieMockRow(row))
      .filter((row): row is CookieMock => row !== null);
  }

  getActiveCookieMocks(): CookieMock[] {
    return this.getCookieMocks(true);
  }

  getCookieMockById(id: string): CookieMock | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, label, domain_pattern as domainPattern,
        pattern_type as patternType, cookies, active,
        created_at as createdAt, updated_at as updatedAt
      FROM cookie_mocks
      WHERE id = ?
    `);

    const result = stmt.get(id) as
      | (Omit<CookieMock, 'active' | 'cookies'> & {
          active: number;
          cookies: string;
        })
      | null;

    return this.mapCookieMockRow(result);
  }

  deleteCookieMock(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM cookie_mocks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Closes the database connection
   */
  close(): void {
    this.db.close();
  }
}

// Exporta uma instância única do serviço de banco de dados
export const dbService = new DatabaseService();
