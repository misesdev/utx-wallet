import type { AddressOrigin } from '../entities/AddressOrigin';

export interface AddressOriginRepository {
  findByWallet(walletId: string): Promise<AddressOrigin[]>;
  findById(id: string): Promise<AddressOrigin | null>;
  findDefault(walletId: string): Promise<AddressOrigin | null>;
  getMaxAccountIndex(walletId: string): Promise<number>;
  save(origin: AddressOrigin): Promise<void>;
  archive(id: string): Promise<void>;
}
