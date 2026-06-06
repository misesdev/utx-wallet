import { AppError } from '../../application/errors/AppError';
import type { BitcoinNetwork, NetworkConfig, NodeConnectionTestResult } from '../../domain/entities/Network';
import type { BlockchainProvider, AddressBalance, FeeRates, RemoteTransactionStatus } from '../../domain/repositories/BlockchainProvider';
import type { NodeConnectionTester, NodeRepository } from '../../domain/repositories/NodeRepository';
import type { Transaction } from '../../domain/entities/Transaction';
import type { Utxo } from '../../domain/entities/Utxo';
import type { HttpClient } from '../api/HttpClient';
import { MempoolApiClient, type MempoolTxResponse, type MempoolUtxoEntry } from '../api/MempoolApiClient';
import { NetworkConfigStorage } from '../storage/NetworkConfigStorage';

type NodeNetworkResponse = {
  network: BitcoinNetwork;
};

function normalizeBaseUrl(config: NetworkConfig): string {
  const rawUrl = config.personalNodeUrl?.trim();
  if (!rawUrl) return '';
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
  const url = new URL(withProtocol);
  const port = config.personalNodePort ? `:${config.personalNodePort}` : url.port ? `:${url.port}` : '';
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return `${url.protocol}//${url.hostname}${port}${path}${url.search}`;
}

function authHeaders(config: NetworkConfig): Record<string, string> | undefined {
  const token = config.personalNodeAuthToken?.trim();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
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
      return { status: 'disconnected', expectedNetwork: config.network };
    }

    try {
      const response = await this.httpClient.get<NodeNetworkResponse>(`${baseUrl}/v1/network`, {
        headers: authHeaders(config),
        timeoutMs: 10_000,
      });

      if (response.network !== config.network) {
        return {
          status: 'network-incompatible',
          expectedNetwork: config.network,
          actualNetwork: response.network,
        };
      }

      return { status: 'connected', expectedNetwork: config.network, actualNetwork: response.network };
    } catch (err) {
      return {
        status: isAuthError(err) ? 'authentication-error' : 'disconnected',
        expectedNetwork: config.network,
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

  async getTransactionStatus(txid: string): Promise<RemoteTransactionStatus> {
    const tx = await this.clientFor(this.cachedConfig.network).getTransaction(txid);
    return {
      txid: tx.txid,
      confirmed: tx.status.confirmed,
      blockHeight: tx.status.block_height,
      blockTime: tx.status.block_time,
    };
  }

  async getCurrentBlockHeight(): Promise<number> {
    return this.clientFor(this.cachedConfig.network).getCurrentBlockHeight();
  }

  async getFeeRates(): Promise<FeeRates> {
    const rates = await this.clientFor(this.cachedConfig.network).getFeeRates();
    return {
      fastSatsPerVByte: rates.fastestFee,
      halfHourSatsPerVByte: rates.halfHourFee,
      hourSatsPerVByte: rates.hourFee,
      economySatsPerVByte: rates.economyFee,
      minimumSatsPerVByte: rates.minimumFee,
    };
  }

  async broadcastTransaction(rawHex: string): Promise<string> {
    return this.clientFor(this.cachedConfig.network).broadcastTransaction(rawHex);
  }

  private clientFor(network: BitcoinNetwork): MempoolApiClient {
    if (network !== this.cachedConfig.network) {
      throw new AppError('Personal node network is incompatible with the active wallet network', 'NETWORK_INCOMPATIBLE');
    }

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
