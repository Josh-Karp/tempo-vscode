import * as http from 'http';
import { EventEmitter } from 'events';
import { WebhookAdapter } from '../../adapters/WebhookAdapter';
import { TimeEntry } from '../../timer/TimerState';

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'entry-1',
    taskName: 'Fix bug',
    customer: 'ACME',
    startTime: '2024-01-01T10:00:00.000Z',
    endTime: '2024-01-01T11:00:00.000Z',
    duration: 3600000,
    synced: false,
    ...overrides,
  };
}

/** Creates a minimal mock IncomingMessage-like emitter. */
function mockResponse(statusCode: number, _body: string) {
  const res = new EventEmitter() as NodeJS.ReadableStream & { statusCode: number };
  res.statusCode = statusCode;
  return { res, emit: (event: string, ...args: unknown[]) => res.emit(event, ...args) };
}

describe('WebhookAdapter', () => {
  let requestSpy: jest.SpyInstance;

  afterEach(() => {
    requestSpy?.mockRestore();
  });

  function mockHttpRequest(statusCode: number, body: string) {
    const { res, emit } = mockResponse(statusCode, body);
    const req = new EventEmitter() as NodeJS.EventEmitter & {
      write: jest.Mock;
      end: jest.Mock;
    };
    req.write = jest.fn();
    req.end = jest.fn().mockImplementation(() => {
      emit('data', body);
      emit('end');
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestSpy = jest.spyOn(http, 'request').mockImplementation((_options: any, callback: any) => {
      if (callback) callback(res);
      return req as unknown as http.ClientRequest;
    });
    return { req, res };
  }

  describe('name', () => {
    it('is "webhook"', () => {
      const adapter = new WebhookAdapter('http://example.com', '');
      expect(adapter.name).toBe('webhook');
    });
  });

  describe('sync', () => {
    it('returns success on 2xx response', async () => {
      mockHttpRequest(200, '{"id":"remote-1"}');
      const adapter = new WebhookAdapter('http://localhost/hook', 'token123');
      const result = await adapter.sync(makeEntry());
      expect(result.success).toBe(true);
      expect(result.remoteId).toBe('{"id":"remote-1"}');
    });

    it('returns failure on non-2xx response', async () => {
      mockHttpRequest(500, 'Internal Server Error');
      const adapter = new WebhookAdapter('http://localhost/hook', '');
      const result = await adapter.sync(makeEntry());
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/HTTP 500/);
    });

    it('returns failure on network error', async () => {
      const req = new EventEmitter() as NodeJS.EventEmitter & {
        write: jest.Mock;
        end: jest.Mock;
      };
      req.write = jest.fn();
      req.end = jest.fn().mockImplementation(function (this: NodeJS.EventEmitter) {
        this.emit('error', new Error('ECONNREFUSED'));
      });
      requestSpy = jest
        .spyOn(http, 'request')
        .mockReturnValue(req as unknown as http.ClientRequest);
      const adapter = new WebhookAdapter('http://localhost/hook', '');
      const result = await adapter.sync(makeEntry());
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/ECONNREFUSED/);
    });
  });

  describe('syncBatch', () => {
    it('syncs every entry and returns results in order', async () => {
      mockHttpRequest(201, 'ok');
      const adapter = new WebhookAdapter('http://localhost/hook', '');
      const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })];
      const results = await adapter.syncBatch(entries);
      expect(results).toHaveLength(2);
      results.forEach((r) => expect(r.success).toBe(true));
    });

    it('returns empty array for empty input', async () => {
      const adapter = new WebhookAdapter('http://localhost/hook', '');
      const results = await adapter.syncBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('testConnection', () => {
    it('returns true on successful request', async () => {
      mockHttpRequest(200, 'ok');
      const adapter = new WebhookAdapter('http://localhost/hook', '');
      expect(await adapter.testConnection()).toBe(true);
    });

    it('returns false on failure', async () => {
      const req = new EventEmitter() as NodeJS.EventEmitter & {
        write: jest.Mock;
        end: jest.Mock;
      };
      req.write = jest.fn();
      req.end = jest.fn().mockImplementation(function (this: NodeJS.EventEmitter) {
        this.emit('error', new Error('timeout'));
      });
      requestSpy = jest
        .spyOn(http, 'request')
        .mockReturnValue(req as unknown as http.ClientRequest);
      const adapter = new WebhookAdapter('http://localhost/hook', '');
      expect(await adapter.testConnection()).toBe(false);
    });
  });
});
