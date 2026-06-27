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

export type RawTxInput = {
  txid: string;
  vout: number;
  sequence: number;
  prevoutAddress: string;
  prevoutValue: number;
  scriptPubKey: string;
};

export type RawTxOutput = {
  address: string;
  valueSats: number;
};

export type RawTransaction = {
  txid: string;
  inputs: RawTxInput[];
  outputs: RawTxOutput[];
  feeSats: number;
  /** true if any input has sequence < 0xFFFFFFFE */
  isRbfEligible: boolean;
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
  getTransactionStatus(txid: string, network: BitcoinNetwork): Promise<RemoteTransactionStatus>;
  getCurrentBlockHeight(network: BitcoinNetwork): Promise<number>;
  getFeeRates(network: BitcoinNetwork): Promise<FeeRates>;
  broadcastTransaction(rawHex: string, network: BitcoinNetwork): Promise<string>;
  getRawTransaction(txid: string, network: BitcoinNetwork): Promise<RawTransaction>;
}
