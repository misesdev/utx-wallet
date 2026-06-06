import { AppError } from '../../application/errors/AppError';
import type { HttpClient } from './HttpClient';
import type { BitcoinNetwork } from '../../domain/entities/Network';

// ── Mempool API response shapes ──────────────────────────────────────────────

export type MempoolAddressStats = {
  funded_txo_sum: number;
  spent_txo_sum: number;
  tx_count: number;
};

export type MempoolAddressResponse = {
  address: string;
  chain_stats: MempoolAddressStats;
  mempool_stats: MempoolAddressStats;
};

export type MempoolUtxoStatus = {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
};

export type MempoolUtxoEntry = {
  txid: string;
  vout: number;
  status: MempoolUtxoStatus;
  value: number;
};

export type MempoolPrevout = {
  scriptpubkey_address?: string;
  value: number;
};

export type MempoolVin = {
  txid: string;
  vout: number;
  prevout: MempoolPrevout | null;
};

export type MempoolVout = {
  scriptpubkey_address?: string;
  value: number;
};

export type MempoolTxStatus = {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
};

export type MempoolTxResponse = {
  txid: string;
  vin: MempoolVin[];
  vout: MempoolVout[];
  fee: number;
  status: MempoolTxStatus;
};

export type MempoolFeeRatesResponse = {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
};

// ── URL routing ───────────────────────────────────────────────────────────────

const NETWORK_BASE_URLS: Record<BitcoinNetwork, string> = {
  mainnet: 'https://mempool.space/api',
  testnet: 'https://mempool.space/testnet/api',
  testnet3: 'https://mempool.space/testnet/api',
  testnet4: 'https://mempool.space/testnet4/api',
};

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

// ── Retry helpers ─────────────────────────────────────────────────────────────

function isRetryable(err: unknown): boolean {
  if (err instanceof AppError) {
    if (err.code === 'TIMEOUT') return true;
    if (err.code === 'HTTP_ERROR') {
      const match = err.message.match(/HTTP (\d+)/);
      return match ? parseInt(match[1], 10) >= 500 : false;
    }
    return false;
  }
  return true;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === maxRetries) break;
      await new Promise<void>(resolve => setTimeout(resolve, 300 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

// ── MempoolApiClient ──────────────────────────────────────────────────────────

export class MempoolApiClient {
  private readonly apiBase: string;

  constructor(
    private readonly httpClient: HttpClient,
    baseUrl: string,
    private readonly headers?: Record<string, string>,
  ) {
    this.apiBase = baseUrl;
  }

  static forNetwork(httpClient: HttpClient, network: BitcoinNetwork): MempoolApiClient {
    return new MempoolApiClient(httpClient, NETWORK_BASE_URLS[network]);
  }

  static baseUrlForNetwork(network: BitcoinNetwork): string {
    return NETWORK_BASE_URLS[network];
  }

  getBaseUrl(): string {
    return this.apiBase;
  }

  healthcheck(): Promise<{ status: string }> {
    return withRetry(() =>
      this.httpClient.get<{ status: string }>(`${this.apiBase}/v1/health`, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        headers: this.headers,
      }),
    );
  }

  getAddress(address: string): Promise<MempoolAddressResponse> {
    return withRetry(() =>
      this.httpClient.get<MempoolAddressResponse>(`${this.apiBase}/address/${address}`, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        headers: this.headers,
      }),
    );
  }

  getAddressUtxos(address: string): Promise<MempoolUtxoEntry[]> {
    return withRetry(() =>
      this.httpClient.get<MempoolUtxoEntry[]>(`${this.apiBase}/address/${address}/utxo`, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        headers: this.headers,
      }),
    );
  }

  getAddressTransactions(address: string): Promise<MempoolTxResponse[]> {
    return withRetry(() =>
      this.httpClient.get<MempoolTxResponse[]>(`${this.apiBase}/address/${address}/txs`, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        headers: this.headers,
      }),
    );
  }

  getTransaction(txid: string): Promise<MempoolTxResponse> {
    return withRetry(() =>
      this.httpClient.get<MempoolTxResponse>(`${this.apiBase}/tx/${txid}`, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        headers: this.headers,
      }),
    );
  }

  getCurrentBlockHeight(): Promise<number> {
    return withRetry(() =>
      this.httpClient.get<number>(`${this.apiBase}/blocks/tip/height`, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        headers: this.headers,
      }),
    );
  }

  getFeeRates(): Promise<MempoolFeeRatesResponse> {
    return withRetry(() =>
      this.httpClient.get<MempoolFeeRatesResponse>(`${this.apiBase}/v1/fees/recommended`, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        headers: this.headers,
      }),
    );
  }

  broadcastTransaction(rawHex: string): Promise<string> {
    return withRetry(() =>
      this.httpClient.postText(`${this.apiBase}/tx`, rawHex, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        headers: this.headers,
      }),
    );
  }
}
