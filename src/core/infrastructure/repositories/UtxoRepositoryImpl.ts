import type { Utxo } from '../../domain/entities/Utxo';
import type { UtxoRepository } from '../../domain/repositories/UtxoRepository';
import { UtxoStorage } from '../storage/UtxoStorage';

export class UtxoRepositoryImpl implements UtxoRepository {
  constructor(private readonly utxoStorage: UtxoStorage) {}

  listByWallet(walletId: string): Promise<Utxo[]> {
    return this.utxoStorage.load(walletId);
  }
}
