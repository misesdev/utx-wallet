import type { Utxo } from '../../domain/entities/Utxo';
import type { UtxoRepository } from '../../domain/repositories/UtxoRepository';
import { UtxoStorage } from '../storage/UtxoStorage';

export class UtxoRepositoryImpl implements UtxoRepository {
  constructor(private readonly utxoStorage: UtxoStorage) {}

  listByWallet(walletId: string): Promise<Utxo[]> {
    return this.utxoStorage.load(walletId);
  }

  replaceAll(walletId: string, utxos: Utxo[]): Promise<void> {
    return this.utxoStorage.save(walletId, utxos);
  }

  freeze(walletId: string, txid: string, vout: number): Promise<void> {
    return this.utxoStorage.freeze(walletId, txid, vout);
  }

  unfreeze(walletId: string, txid: string, vout: number): Promise<void> {
    return this.utxoStorage.unfreeze(walletId, txid, vout);
  }
}
