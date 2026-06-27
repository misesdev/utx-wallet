import { AppError } from '../../application/errors/AppError';
import type { BitcoinNetwork, NetworkConfig, NodeConnectionTestResult } from '../../domain/entities/Network';
import type { PersonalNode } from '../../domain/entities/PersonalNode';
import type { BlockchainProvider, AddressBalance, FeeRates, RemoteTransactionStatus, RawTransaction } from '../../domain/repositories/BlockchainProvider';
import type { NodeConnectionTester, NodeRepository } from '../../domain/repositories/NodeRepository';
import type { Transaction } from '../../domain/entities/Transaction';
import type { Utxo } from '../../domain/entities/Utxo';
import type { HttpClient } from '../api/HttpClient';
import { MempoolApiClient, type MempoolFeeRatesResponse, type MempoolTxResponse, type MempoolUtxoEntry } from '../api/MempoolApiClient';
import { NetworkConfigStorage } from '../storage/NetworkConfigStorage';

export function normalizeNodeUrl(url: string, port?: number): string {
  const rawUrl = url.trim();
  if (!rawUrl) return '';
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
  const parsed = new URL(withProtocol);
  const portStr = port ? `:${port}` : parsed.port ? `:${parsed.port}` : '';
  // Strip trailing version segment (e.g. /v1, /v2) — the app appends /v1/... to all
  // endpoint paths internally. A user entering http://host:8081/api/v1 should work the
  // same as http://host:8081/api to avoid a double /v1/v1/... path.
  const rawPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
  const path = rawPath.replace(/\/v\d+$/, '');
  return `${parsed.protocol}//${parsed.hostname}${portStr}${path}${parsed.search}`;
}

export function nodeAuthHeaders(authToken?: string): Record<string, string> | undefined {
  const token = authToken?.trim();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function normalizeBaseUrl(config: NetworkConfig): string {
  return normalizeNodeUrl(config.personalNodeUrl ?? '', config.personalNodePort);
}

function authHeaders(config: NetworkConfig): Record<string, string> | undefined {
  return nodeAuthHeaders(config.personalNodeAuthToken);
}

function isAuthError(err: unknown): boolean {
  return err instanceof AppError && /HTTP (401|403)/.test(err.message);
}

export class PersonalNodeAdapter implements NodeRepository, NodeConnectionTester, BlockchainProvider {
  private cachedConfig: NetworkConfig;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly networkConfigStorage: NetworkConfigStorage,
    defaultConfig: NetworkConfig,
  ) {
    this.cachedConfig = defaultConfig;
  }

  async getNetworkConfig(): Promise<NetworkConfig> {
    const stored = await this.networkConfigStorage.load();
    if (stored) {
      this.cachedConfig = stored;
    }
    return this.cachedConfig;
  }

  async setNetworkConfig(config: NetworkConfig): Promise<void> {
    await this.networkConfigStorage.save(config);
    this.cachedConfig = config;
  }

  async ping(): Promise<boolean> {
    const result = await this.testConnection(this.cachedConfig);
    return result.status === 'connected';
  }

  async testConnection(config: NetworkConfig): Promise<NodeConnectionTestResult> {
    const baseUrl = normalizeBaseUrl(config);
    if (!baseUrl) {
      return { status: 'disconnected', expectedNetwork: this.cachedConfig.personalNodes[0]?.network ?? 'mainnet' };
    }
    const expectedNetwork = this.cachedConfig.personalNodes[0]?.network ?? 'mainnet';
    return this.probeUrl(baseUrl, authHeaders(config), expectedNetwork);
  }

  async testNode(node: PersonalNode): Promise<NodeConnectionTestResult> {
    const baseUrl = normalizeNodeUrl(node.url, node.port);
    if (!baseUrl) {
      return { status: 'disconnected', expectedNetwork: node.network };
    }
    return this.probeUrl(baseUrl, nodeAuthHeaders(node.authToken), node.network);
  }

  private async probeUrl(
    baseUrl: string,
    headers: Record<string, string> | undefined,
    expectedNetwork: BitcoinNetwork,
  ): Promise<NodeConnectionTestResult> {
    try {
      // /v1/fees/recommended is a standard mempool self-hosted endpoint that exists
      // in all versions and returns a predictable JSON shape when the API is healthy.
      // The old /v1/network endpoint does not exist in the mempool REST API.
      const rates = await this.httpClient.get<MempoolFeeRatesResponse>(
        `${baseUrl}/v1/fees/recommended`,
        { headers, timeoutMs: 10_000 },
      );

      // Guard against nginx/proxy returning HTML with status 200
      if (typeof rates?.fastestFee !== 'number') {
        return { status: 'disconnected', expectedNetwork };
      }

      return { status: 'connected', expectedNetwork, actualNetwork: expectedNetwork };
    } catch (err) {
      return {
        status: isAuthError(err) ? 'authentication-error' : 'disconnected',
        expectedNetwork,
      };
    }
  }

  async getBalance(address: string, network: BitcoinNetwork): Promise<AddressBalance> {
    const data = await this.clientFor(network).getAddress(address);
    return {
      confirmedSats: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
      unconfirmedSats: data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum,
    };
  }

  async getUtxos(address: string, network: BitcoinNetwork): Promise<Utxo[]> {
    const entries = await this.clientFor(network).getAddressUtxos(address);
    return entries.map(e => this.mapUtxo(e, address));
  }

  async getTransactions(address: string, network: BitcoinNetwork): Promise<Transaction[]> {
    const txs = await this.clientFor(network).getAddressTransactions(address);
    return txs.map(tx => this.mapTransaction(tx, address));
  }

  async getTransactionStatus(txid: string, _network: BitcoinNetwork): Promise<RemoteTransactionStatus> {
    const tx = await this.legacyClient().getTransaction(txid);
    return {
      txid: tx.txid,
      confirmed: tx.status.confirmed,
      blockHeight: tx.status.block_height,
      blockTime: tx.status.block_time,
    };
  }

  async getCurrentBlockHeight(_network: BitcoinNetwork): Promise<number> {
    return this.legacyClient().getCurrentBlockHeight();
  }

  async getFeeRates(_network: BitcoinNetwork): Promise<FeeRates> {
    const rates = await this.legacyClient().getFeeRates();
    return {
      fastSatsPerVByte: rates.fastestFee,
      halfHourSatsPerVByte: rates.halfHourFee,
      hourSatsPerVByte: rates.hourFee,
      economySatsPerVByte: rates.economyFee,
      minimumSatsPerVByte: rates.minimumFee,
    };
  }

  async broadcastTransaction(rawHex: string, _network: BitcoinNetwork): Promise<string> {
    return this.legacyClient().broadcastTransaction(rawHex);
  }

  async getRawTransaction(txid: string, _network: BitcoinNetwork): Promise<RawTransaction> {
    return this.legacyClient().getRawTransaction(txid);
  }

  private legacyClient(): MempoolApiClient {
    const baseUrl = normalizeBaseUrl(this.cachedConfig);
    if (!baseUrl) {
      throw new AppError('Personal node URL is not configured', 'PERSONAL_NODE_NOT_CONFIGURED');
    }
    return new MempoolApiClient(this.httpClient, baseUrl, authHeaders(this.cachedConfig));
  }

  private clientFor(_network: BitcoinNetwork): MempoolApiClient {
    const baseUrl = normalizeBaseUrl(this.cachedConfig);
    if (!baseUrl) {
      throw new AppError('Personal node URL is not configured', 'PERSONAL_NODE_NOT_CONFIGURED');
    }
    return new MempoolApiClient(this.httpClient, baseUrl, authHeaders(this.cachedConfig));
  }

  private mapUtxo(entry: MempoolUtxoEntry, address: string): Utxo {
    return {
      txid: entry.txid,
      vout: entry.vout,
      valueSats: entry.value,
      address,
      isConfirmed: entry.status.confirmed,
    };
  }

  private mapTransaction(raw: MempoolTxResponse, address: string): Transaction {
    const receivedSats = raw.vout
      .filter(o => o.scriptpubkey_address === address)
      .reduce((sum, o) => sum + o.value, 0);

    const sentSats = raw.vin
      .filter(i => i.prevout?.scriptpubkey_address === address)
      .reduce((sum, i) => sum + (i.prevout?.value ?? 0), 0);

    const direction = sentSats > 0 ? 'outgoing' : 'incoming';
    const amountSats = direction === 'incoming' ? receivedSats : Math.max(0, sentSats - receivedSats);
    const createdAt = raw.status.block_time
      ? new Date(raw.status.block_time * 1000).toISOString()
      : new Date().toISOString();

    return {
      id: raw.txid,
      txid: raw.txid,
      amountSats,
      feeSats: raw.fee,
      direction,
      status: raw.status.confirmed ? 'confirmed' : 'pending',
      createdAt,
    };
  }
}
