import {
  type CookieDefinition,
  type CookieMock,
  dbService,
} from '../db/database';
import { logger } from '../utils/logger';

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class CookieMockEngine {
  getAllMocks(activeOnly = false): CookieMock[] {
    try {
      return dbService.getCookieMocks(activeOnly ? true : undefined);
    } catch (error) {
      logger.error('Error fetching cookie mocks', { error });
      return [];
    }
  }

  getMockById(id: string): CookieMock | null {
    try {
      return dbService.getCookieMockById(id);
    } catch (error) {
      logger.error('Error fetching cookie mock by ID', { error, id });
      return null;
    }
  }

  createMock(
    data: Omit<CookieMock, 'id' | 'createdAt' | 'updatedAt'>,
  ): string | null {
    try {
      return dbService.saveCookieMock(data);
    } catch (error) {
      logger.error('Error creating cookie mock', { error, data });
      return null;
    }
  }

  updateMock(
    id: string,
    data: Partial<Omit<CookieMock, 'id' | 'createdAt' | 'updatedAt'>>,
  ): boolean {
    try {
      return dbService.updateCookieMock(id, data);
    } catch (error) {
      logger.error('Error updating cookie mock', { error, id, data });
      return false;
    }
  }

  deleteMock(id: string): boolean {
    try {
      return dbService.deleteCookieMock(id);
    } catch (error) {
      logger.error('Error deleting cookie mock', { error, id });
      return false;
    }
  }

  resolveCookiesForRequest(
    hostHeader: string | undefined,
    path = '/',
    isSecureTarget = false,
  ): CookieDefinition[] {
    if (!hostHeader) {
      return [];
    }

    const hostname = hostHeader.split(':')[0].toLowerCase();
    const sanitizedPath = path || '/';
    const now = Date.now();

    const activeMocks = this.getAllMocks(true);
    const matchingMocks = activeMocks.filter((mock) =>
      this.matchesDomain(mock, hostname),
    );

    const cookies: CookieDefinition[] = [];

    matchingMocks.forEach((mock) => {
      mock.cookies.forEach((cookie) => {
        if (
          this.shouldSendCookie(
            cookie,
            hostname,
            sanitizedPath,
            now,
            isSecureTarget,
          )
        ) {
          cookies.push(cookie);
        }
      });
    });

    return cookies;
  }

  private matchesDomain(mock: CookieMock, hostname: string): boolean {
    try {
      if (mock.patternType === 'regex') {
        const regex = new RegExp(mock.domainPattern, 'i');
        return regex.test(hostname);
      }

      const patternRegex = new RegExp(
        `^${escapeRegex(mock.domainPattern)
          .replace(/\\\*/g, '.*')
          .replace(/\\\?/g, '.')}$`,
        'i',
      );
      return patternRegex.test(hostname);
    } catch (error) {
      logger.warn('Invalid domain pattern on cookie mock', {
        error,
        mockId: mock.id,
        pattern: mock.domainPattern,
      });
      return false;
    }
  }

  private hostMatchesCookieDomain(
    hostname: string,
    cookieDomain: string,
  ): boolean {
    const normalized = cookieDomain.replace(/^\./, '').toLowerCase();
    return (
      hostname === normalized ||
      (hostname.endsWith(`.${normalized}`) &&
        hostname.length > normalized.length)
    );
  }

  private shouldSendCookie(
    cookie: CookieDefinition,
    hostname: string,
    path: string,
    now: number,
    isSecureTarget: boolean,
  ): boolean {
    if (!cookie.name || cookie.value === undefined) {
      return false;
    }

    if (cookie.expires && cookie.expires < now) {
      return false;
    }

    if (cookie.sameSite === 'None' && cookie.secure !== true) {
      return false;
    }

    if (cookie.secure && !isSecureTarget) {
      logger.warn('Secure cookie blocked due to insecure target connection', {
        cookie: cookie.name,
      });
      return false;
    }

    if (
      cookie.domain &&
      !this.hostMatchesCookieDomain(hostname, cookie.domain)
    ) {
      return false;
    }

    if (cookie.path && !path.startsWith(cookie.path)) {
      return false;
    }

    return true;
  }
}

export const cookieMockEngine = new CookieMockEngine();
