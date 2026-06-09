import type { AddressOrigin } from '../../domain/entities/AddressOrigin';
import type { AddressOriginRepository } from '../../domain/repositories/AddressOriginRepository';
import { AddressOriginStorage } from '../storage/AddressOriginStorage';

export class AddressOriginRepositoryImpl implements AddressOriginRepository {
  constructor(private readonly storage: AddressOriginStorage) {}

  findByWallet(walletId: string): Promise<AddressOrigin[]> {
    return this.storage.findByWallet(walletId);
  }

  findById(id: string): Promise<AddressOrigin | null> {
    return this.storage.findById(id);
  }

  findDefault(walletId: string): Promise<AddressOrigin | null> {
    return this.storage.findDefault(walletId);
  }

  getMaxAccountIndex(walletId: string): Promise<number> {
    return this.storage.getMaxAccountIndex(walletId);
  }

  save(origin: AddressOrigin): Promise<void> {
    return this.storage.save(origin);
  }

  archive(id: string): Promise<void> {
    return this.storage.archive(id);
  }

  deleteByWallet(walletId: string): Promise<void> {
    return this.storage.deleteByWallet(walletId);
  }
}
