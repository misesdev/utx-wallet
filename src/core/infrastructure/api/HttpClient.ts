import { AppError } from '../../application/errors/AppError';

export type HttpRequestOptions = {
  headers?: Record<string, string>;
};

export interface HttpClient {
  get<TResponse>(url: string, options?: HttpRequestOptions): Promise<TResponse>;
  post<TBody, TResponse>(url: string, body: TBody, options?: HttpRequestOptions): Promise<TResponse>;
}

export class FetchHttpClient implements HttpClient {
  async get<TResponse>(url: string, options?: HttpRequestOptions): Promise<TResponse> {
    const response = await fetch(url, { method: 'GET', headers: options?.headers });
    if (!response.ok) {
      throw new AppError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR');
    }
    return response.json() as Promise<TResponse>;
  }

  async post<TBody, TResponse>(
    url: string,
    body: TBody,
    options?: HttpRequestOptions,
  ): Promise<TResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new AppError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR');
    }
    return response.json() as Promise<TResponse>;
  }
}
