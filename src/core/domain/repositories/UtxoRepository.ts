import type { Utxo } from '../entities/Utxo';

export interface UtxoRepository {
  listByWallet(walletId: string): Promise<Utxo[]>;
  replaceAll(walletId: string, utxos: Utxo[]): Promise<void>;
  freeze(walletId: string, txid: string, vout: number): Promise<void>;
  unfreeze(walletId: string, txid: string, vout: number): Promise<void>;
  deleteByWallet(walletId: string): Promise<void>;
}
