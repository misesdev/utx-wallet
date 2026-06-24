import type { BlockchainProvider, AddressBalance, FeeRates, RemoteTransactionStatus, RawTransaction } from '../../domain/repositories/BlockchainProvider';
import type { NodeRepository } from '../../domain/repositories/NodeRepository';
import type { NetworkConfig, BitcoinNetwork } from '../../domain/entities/Network';
import type { Transaction, TransactionDirection, TransactionStatus } from '../../domain/entities/Transaction';
import type { Utxo } from '../../domain/entities/Utxo';
import type { HttpClient } from '../api/HttpClient';
import { MempoolApiClient, type MempoolTxResponse, type MempoolUtxoEntry } from '../api/MempoolApiClient';
import { NetworkConfigStorage } from '../storage/NetworkConfigStorage';

export class MempoolApiAdapter implements NodeRepository, BlockchainProvider {
  private cachedConfig: NetworkConfig;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly networkConfigStorage: NetworkConfigStorage,
    defaultConfig: NetworkConfig,
  ) {
    this.cachedConfig = defaultConfig;
  }

  // ── NodeRepository ──────────────────────────────────────────────────────────

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
    try {
      await this.clientFor('mainnet').healthcheck();
      return true;
    } catch {
      return false;
    }
  }

  // ── BlockchainProvider ──────────────────────────────────────────────────────

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
    const tx = await this.clientFor('mainnet').getTransaction(txid);
    return {
      txid: tx.txid,
      confirmed: tx.status.confirmed,
      blockHeight: tx.status.block_height,
      blockTime: tx.status.block_time,
    };
  }

  async getFeeRates(): Promise<FeeRates> {
    const rates = await this.clientFor('mainnet').getFeeRates();
    return {
      fastSatsPerVByte: rates.fastestFee,
      halfHourSatsPerVByte: rates.halfHourFee,
      hourSatsPerVByte: rates.hourFee,
      economySatsPerVByte: rates.economyFee,
      minimumSatsPerVByte: rates.minimumFee,
    };
  }

  async getCurrentBlockHeight(): Promise<number> {
    return this.clientFor('mainnet').getCurrentBlockHeight();
  }

  async broadcastTransaction(rawHex: string): Promise<string> {
    return this.clientFor('mainnet').broadcastTransaction(rawHex);
  }

  async getRawTransaction(txid: string): Promise<RawTransaction> {
    return this.clientFor('mainnet').getRawTransaction(txid);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private clientFor(network: BitcoinNetwork): MempoolApiClient {
    return MempoolApiClient.forNetwork(this.httpClient, network);
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

    const direction: TransactionDirection = sentSats > 0 ? 'outgoing' : 'incoming';
    const amountSats = direction === 'incoming'
      ? receivedSats
      : Math.max(0, sentSats - receivedSats);

    const status: TransactionStatus = raw.status.confirmed ? 'confirmed' : 'pending';
    const createdAt = raw.status.block_time
      ? new Date(raw.status.block_time * 1000).toISOString()
      : new Date().toISOString();

    return {
      id: raw.txid,
      txid: raw.txid,
      amountSats,
      feeSats: raw.fee,
      direction,
      status,
      createdAt,
    };
  }
}
