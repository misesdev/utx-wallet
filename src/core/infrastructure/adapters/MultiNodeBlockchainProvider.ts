import { AppError } from '../../application/errors/AppError';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { PersonalNode } from '../../domain/entities/PersonalNode';
import type {
  AddressBalance,
  BlockchainProvider,
  FeeRates,
  RawTransaction,
  RemoteTransactionStatus,
} from '../../domain/repositories/BlockchainProvider';
import type { Transaction } from '../../domain/entities/Transaction';
import type { Utxo } from '../../domain/entities/Utxo';
import type { HttpClient } from '../api/HttpClient';
import { MempoolApiClient, type MempoolTxResponse, type MempoolUtxoEntry } from '../api/MempoolApiClient';
import type { NetworkConfigStorage } from '../storage/NetworkConfigStorage';
import { normalizeNodeUrl, nodeAuthHeaders } from './PersonalNodeAdapter';

function isClientError(err: unknown): boolean {
  if (err instanceof AppError && err.code === 'HTTP_ERROR') {
    const match = err.message.match(/HTTP (\d+)/);
    if (match) {
      const status = parseInt(match[1], 10);
      return status >= 400 && status < 500;
    }
  }
  return false;
}

export class MultiNodeBlockchainProvider implements BlockchainProvider {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly configStorage: NetworkConfigStorage,
    private readonly publicFallback: BlockchainProvider,
  ) {}

  async getBalance(address: string, network: BitcoinNetwork): Promise<AddressBalance> {
    return this.withPriority(
      network,
      client => client.getAddress(address).then(data => ({
        confirmedSats: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
        unconfirmedSats: data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum,
      })),
      () => this.publicFallback.getBalance(address, network),
    );
  }

  async getUtxos(address: string, network: BitcoinNetwork): Promise<Utxo[]> {
    return this.withPriority(
      network,
      client => client.getAddressUtxos(address).then(entries =>
        entries.map(e => this.mapUtxo(e, address)),
      ),
      () => this.publicFallback.getUtxos(address, network),
    );
  }

  async getTransactions(address: string, network: BitcoinNetwork): Promise<Transaction[]> {
    return this.withPriority(
      network,
      client => client.getAddressTransactions(address).then(txs =>
        txs.map(tx => this.mapTransaction(tx, address)),
      ),
      () => this.publicFallback.getTransactions(address, network),
    );
  }

  async getTransactionStatus(txid: string): Promise<RemoteTransactionStatus> {
    const config = await this.configStorage.load();
    const network = config?.network ?? 'mainnet';
    return this.withPriority(
      network,
      client => client.getTransaction(txid).then(tx => ({
        txid: tx.txid,
        confirmed: tx.status.confirmed,
        blockHeight: tx.status.block_height,
        blockTime: tx.status.block_time,
      })),
      () => this.publicFallback.getTransactionStatus(txid),
    );
  }

  async getCurrentBlockHeight(): Promise<number> {
    const config = await this.configStorage.load();
    const network = config?.network ?? 'mainnet';
    return this.withPriority(
      network,
      client => client.getCurrentBlockHeight(),
      () => this.publicFallback.getCurrentBlockHeight(),
    );
  }

  async getFeeRates(): Promise<FeeRates> {
    const config = await this.configStorage.load();
    const network = config?.network ?? 'mainnet';
    return this.withPriority(
      network,
      client => client.getFeeRates().then(rates => ({
        fastSatsPerVByte: rates.fastestFee,
        halfHourSatsPerVByte: rates.halfHourFee,
        hourSatsPerVByte: rates.hourFee,
        economySatsPerVByte: rates.economyFee,
        minimumSatsPerVByte: rates.minimumFee,
      })),
      () => this.publicFallback.getFeeRates(),
    );
  }

  async broadcastTransaction(rawHex: string): Promise<string> {
    const config = await this.configStorage.load();
    const network = config?.network ?? 'mainnet';
    return this.withPriority(
      network,
      client => client.broadcastTransaction(rawHex),
      () => this.publicFallback.broadcastTransaction(rawHex),
    );
  }

  async getRawTransaction(txid: string): Promise<RawTransaction> {
    const config = await this.configStorage.load();
    const network = config?.network ?? 'mainnet';
    return this.withPriority(
      network,
      client => client.getRawTransaction(txid),
      () => this.publicFallback.getRawTransaction(txid),
    );
  }

  private async withPriority<T>(
    network: BitcoinNetwork,
    fn: (client: MempoolApiClient) => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    const config = await this.configStorage.load();
    const nodes = (config?.personalNodes ?? [])
      .filter(n => n.network === network)
      .sort((a, b) => a.priority - b.priority);

    if (nodes.length === 0) {
      if (config?.allowPublicFallback === true) return fallback();
      throw new AppError(`No personal nodes configured for ${network}`, 'PERSONAL_NODE_NOT_CONFIGURED');
    }

    let lastError: unknown;
    for (const node of nodes) {
      try {
        return await fn(this.makeClient(node));
      } catch (err) {
        if (isClientError(err)) throw err;
        lastError = err;
      }
    }

    if (config?.allowPublicFallback === true) return fallback();
    throw lastError!;
  }

  private makeClient(node: PersonalNode): MempoolApiClient {
    const baseUrl = normalizeNodeUrl(node.url, node.port);
    if (!baseUrl) {
      throw new AppError('Personal node URL is not configured', 'PERSONAL_NODE_NOT_CONFIGURED');
    }
    return new MempoolApiClient(this.httpClient, baseUrl, nodeAuthHeaders(node.authToken));
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
