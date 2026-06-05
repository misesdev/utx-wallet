import type { HttpClient } from './HttpClient';

export class MempoolApiClient {
  constructor(private readonly httpClient: HttpClient, private readonly baseUrl: string) {}

  getBaseUrl(): string {
    return this.baseUrl;
  }

  healthcheck(): Promise<{ status: string }> {
    return this.httpClient.get<{ status: string }>(`${this.baseUrl}/api/v1/health`);
  }
}
