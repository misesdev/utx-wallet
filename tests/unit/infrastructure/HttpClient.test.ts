import { FetchHttpClient } from '../../../src/core/infrastructure/api/HttpClient';
import { AppError } from '../../../src/core/application/errors/AppError';

type MockFetch = jest.MockedFunction<typeof globalThis.fetch>;

const mockJsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn(() => Promise.resolve(body)),
    text: jest.fn(() => Promise.resolve(JSON.stringify(body))),
  }) as unknown as Response;

const mockTextResponse = (status: number, text: string) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn(),
    text: jest.fn(() => Promise.resolve(text)),
  }) as unknown as Response;

const G = globalThis as typeof globalThis & { fetch: MockFetch };

describe('FetchHttpClient', () => {
  const client = new FetchHttpClient();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    G.fetch = jest.fn();
  });

  describe('get()', () => {
    it('returns parsed JSON on 200', async () => {
      G.fetch.mockResolvedValueOnce(mockJsonResponse(200, { status: 'ok' }));
      await expect(client.get<{ status: string }>('https://example.com')).resolves.toEqual({ status: 'ok' });
    });

    it('throws AppError with HTTP_ERROR code on 429', async () => {
      G.fetch.mockResolvedValue(mockJsonResponse(429, { error: 'rate limited' }));
      await expect(client.get('https://example.com')).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    });

    it('throws AppError on 500', async () => {
      G.fetch.mockResolvedValueOnce(mockJsonResponse(500, { error: 'server error' }));
      await expect(client.get('https://example.com')).rejects.toThrow(AppError);
    });

    it('throws AppError on 404', async () => {
      G.fetch.mockResolvedValueOnce(mockJsonResponse(404, {}));
      await expect(client.get('https://example.com')).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    });

    it('throws TIMEOUT AppError when request is aborted', async () => {
      jest.useFakeTimers();
      G.fetch.mockImplementationOnce((_url, opts) =>
        new Promise((_, reject) => {
          (opts as RequestInit).signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })),
          );
        }),
      );
      const promise = client.get('https://example.com', { timeoutMs: 100 });
      jest.advanceTimersByTime(200);
      await expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' });
    });
  });

  describe('post()', () => {
    it('returns parsed JSON on 200', async () => {
      G.fetch.mockResolvedValueOnce(mockJsonResponse(200, { id: 'abc' }));
      await expect(client.post<object, { id: string }>('https://example.com', { name: 'test' })).resolves.toEqual({ id: 'abc' });
    });

    it('throws AppError on 400', async () => {
      G.fetch.mockResolvedValueOnce(mockJsonResponse(400, {}));
      await expect(client.post('https://example.com', {})).rejects.toThrow(AppError);
    });

    it('sets Content-Type application/json header', async () => {
      G.fetch.mockResolvedValueOnce(mockJsonResponse(200, {}));
      await client.post('https://example.com', { key: 'value' });
      expect(G.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('serializes body to JSON', async () => {
      G.fetch.mockResolvedValueOnce(mockJsonResponse(200, {}));
      await client.post('https://example.com', { amount: 1000 });
      expect(G.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ body: JSON.stringify({ amount: 1000 }) }),
      );
    });

    it('throws TIMEOUT AppError when post request is aborted', async () => {
      jest.useFakeTimers();
      G.fetch.mockImplementationOnce((_url, opts) =>
        new Promise((_, reject) => {
          (opts as RequestInit).signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })),
          );
        }),
      );
      const promise = client.post('https://example.com', {}, { timeoutMs: 100 });
      jest.advanceTimersByTime(200);
      await expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' });
    });
  });

  describe('postText()', () => {
    it('returns plain text response on 200', async () => {
      const txid = 'abcdef1234567890';
      G.fetch.mockResolvedValueOnce(mockTextResponse(200, txid));
      await expect(client.postText('https://example.com/tx', 'deadbeef')).resolves.toBe(txid);
    });

    it('sends body as plain text string', async () => {
      G.fetch.mockResolvedValueOnce(mockTextResponse(200, 'txid'));
      await client.postText('https://example.com/tx', 'rawhex');
      expect(G.fetch).toHaveBeenCalledWith(
        'https://example.com/tx',
        expect.objectContaining({ body: 'rawhex' }),
      );
    });

    it('sets Content-Type text/plain header', async () => {
      G.fetch.mockResolvedValueOnce(mockTextResponse(200, 'txid'));
      await client.postText('https://example.com/tx', 'rawhex');
      expect(G.fetch).toHaveBeenCalledWith(
        'https://example.com/tx',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'text/plain' }),
        }),
      );
    });

    it('throws AppError on 400', async () => {
      G.fetch.mockResolvedValueOnce(mockTextResponse(400, 'bad request'));
      await expect(client.postText('https://example.com/tx', 'invalid')).rejects.toMatchObject({
        code: 'HTTP_ERROR',
      });
    });

    it('throws TIMEOUT AppError when postText request is aborted', async () => {
      jest.useFakeTimers();
      G.fetch.mockImplementationOnce((_url, opts) =>
        new Promise((_, reject) => {
          (opts as RequestInit).signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })),
          );
        }),
      );
      const promise = client.postText('https://example.com/tx', 'hex', { timeoutMs: 50 });
      jest.advanceTimersByTime(100);
      await expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' });
    });
  });
});
