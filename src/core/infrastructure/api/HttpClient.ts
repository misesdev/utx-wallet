import { AppError } from '../../application/errors/AppError';

export type HttpRequestOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export interface HttpClient {
  get<TResponse>(url: string, options?: HttpRequestOptions): Promise<TResponse>;
  post<TBody, TResponse>(url: string, body: TBody, options?: HttpRequestOptions): Promise<TResponse>;
  postText(url: string, body: string, options?: HttpRequestOptions): Promise<string>;
}

function applyTimeout(timeoutMs: number | undefined): {
  signal: AbortSignal | undefined;
  clear: () => void;
} {
  if (!timeoutMs) return { signal: undefined, clear: () => {} };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

function handleAbortError(err: unknown): never {
  if (err instanceof Error && err.name === 'AbortError') {
    throw new AppError('Request timed out', 'TIMEOUT');
  }
  throw err;
}

export class FetchHttpClient implements HttpClient {
  async get<TResponse>(url: string, options?: HttpRequestOptions): Promise<TResponse> {
    const { signal, clear } = applyTimeout(options?.timeoutMs);
    try {
      const response = await fetch(url, { method: 'GET', headers: options?.headers, signal });
      if (!response.ok) {
        throw new AppError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR');
      }
      return response.json() as Promise<TResponse>;
    } catch (err) {
      handleAbortError(err);
    } finally {
      clear();
    }
  }

  async post<TBody, TResponse>(
    url: string,
    body: TBody,
    options?: HttpRequestOptions,
  ): Promise<TResponse> {
    const { signal, clear } = applyTimeout(options?.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        body: JSON.stringify(body),
        signal,
      });
      if (!response.ok) {
        throw new AppError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR');
      }
      return response.json() as Promise<TResponse>;
    } catch (err) {
      handleAbortError(err);
    } finally {
      clear();
    }
  }

  async postText(url: string, body: string, options?: HttpRequestOptions): Promise<string> {
    const { signal, clear } = applyTimeout(options?.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', ...options?.headers },
        body,
        signal,
      });
      if (!response.ok) {
        throw new AppError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR');
      }
      return response.text();
    } catch (err) {
      handleAbortError(err);
    } finally {
      clear();
    }
  }
}
