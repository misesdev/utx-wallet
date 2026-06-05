import type { Utxo } from '../entities/Utxo';

export interface UtxoRepository {
  listByWallet(walletId: string): Promise<Utxo[]>;
}
