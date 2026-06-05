import { FetchHttpClient } from '../../../src/core/infrastructure/api/HttpClient';
import { AppError } from '../../../src/core/application/errors/AppError';

const mockFetchResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  json: jest.fn(() => Promise.resolve(body)),
});

describe('FetchHttpClient', () => {
  const client = new FetchHttpClient();

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as typeof globalThis & { fetch: jest.Mock }).fetch = jest.fn();
  });

  describe('get()', () => {
    it('returns parsed JSON on 200', async () => {
      ((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse(200, { status: 'ok' }));
      await expect(client.get<{ status: string }>('https://example.com')).resolves.toEqual({ status: 'ok' });
    });

    it('throws AppError with HTTP_ERROR code on 429', async () => {
      ((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch as jest.Mock).mockResolvedValue(mockFetchResponse(429, { error: 'rate limited' }));
      await expect(client.get('https://example.com')).rejects.toThrow(AppError);
      await expect(client.get('https://example.com')).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    });

    it('throws AppError on 500 instead of returning error body as data', async () => {
      ((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse(500, { error: 'server error' }));
      await expect(client.get('https://example.com')).rejects.toThrow(AppError);
    });

    it('throws AppError on 404', async () => {
      ((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse(404, {}));
      await expect(client.get('https://example.com')).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    });
  });

  describe('post()', () => {
    it('returns parsed JSON on 200', async () => {
      ((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse(200, { id: 'abc' }));
      await expect(client.post<object, { id: string }>('https://example.com', { name: 'test' })).resolves.toEqual({ id: 'abc' });
    });

    it('throws AppError on 400', async () => {
      ((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse(400, {}));
      await expect(client.post('https://example.com', {})).rejects.toThrow(AppError);
    });

    it('sets Content-Type application/json header', async () => {
      ((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse(200, {}));
      await client.post('https://example.com', { key: 'value' });
      expect((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('serializes body to JSON', async () => {
      ((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse(200, {}));
      await client.post('https://example.com', { amount: 1000 });
      expect((globalThis as typeof globalThis & { fetch: jest.Mock }).fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ body: JSON.stringify({ amount: 1000 }) }),
      );
    });
  });
});
