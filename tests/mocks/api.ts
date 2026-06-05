import type { HttpClient } from '../../src/core/infrastructure/api/HttpClient';

export function createHttpClientMock(): HttpClient {
  return {
    async get<TResponse>(): Promise<TResponse> {
      return { status: 'ok' } as TResponse;
    },
    async post<_TBody, TResponse>(_url: string, body: _TBody): Promise<TResponse> {
      return body as unknown as TResponse;
    },
  };
}
