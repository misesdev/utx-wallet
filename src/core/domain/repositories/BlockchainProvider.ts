import type { Transaction } from '../entities/Transaction';
import type { Utxo } from '../entities/Utxo';
import type { BitcoinNetwork } from '../entities/Network';

export type AddressBalance = {
  confirmedSats: number;
  unconfirmedSats: number;
};

export type FeeRates = {
  fastSatsPerVByte: number;
  halfHourSatsPerVByte: number;
  hourSatsPerVByte: number;
  economySatsPerVByte: number;
  minimumSatsPerVByte: number;
};

export type RemoteTransactionStatus = {
  txid: string;
  confirmed: boolean;
  blockHeight?: number;
  blockTime?: number;
};

/**
 * Provider-agnostic interface for querying Bitcoin blockchain data.
 * Implementations can be swapped (Mempool, Esplora, personal node, etc.)
 * without changing callers.
 */
export interface BlockchainProvider {
  getBalance(address: string, network: BitcoinNetwork): Promise<AddressBalance>;
  getUtxos(address: string, network: BitcoinNetwork): Promise<Utxo[]>;
  getTransactions(address: string, network: BitcoinNetwork): Promise<Transaction[]>;
  getTransactionStatus(txid: string): Promise<RemoteTransactionStatus>;
  getCurrentBlockHeight(): Promise<number>;
  getFeeRates(): Promise<FeeRates>;
  broadcastTransaction(rawHex: string): Promise<string>;
}
