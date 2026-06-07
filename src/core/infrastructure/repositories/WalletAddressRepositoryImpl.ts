import type { WalletAddress, AddressChain, AddressStatus } from '../../domain/entities/WalletAddress';
import type { WalletAddressRepository } from '../../domain/repositories/WalletAddressRepository';
import { WalletAddressStorage } from '../storage/WalletAddressStorage';

export class WalletAddressRepositoryImpl implements WalletAddressRepository {
  constructor(private readonly storage: WalletAddressStorage) {}

  findByWallet(walletId: string): Promise<WalletAddress[]> {
    return this.storage.findByWallet(walletId);
  }

  findByOrigin(walletId: string, originId: string): Promise<WalletAddress[]> {
    return this.storage.findByOrigin(walletId, originId);
  }

  findByChain(walletId: string, originId: string, chain: AddressChain): Promise<WalletAddress[]> {
    return this.storage.findByChain(walletId, originId, chain);
  }

  findFreshByChain(walletId: string, originId: string, chain: AddressChain): Promise<WalletAddress[]> {
    return this.storage.findFreshByChain(walletId, originId, chain);
  }

  findByAddress(address: string): Promise<WalletAddress | null> {
    return this.storage.findByAddress(address);
  }

  save(address: WalletAddress): Promise<void> {
    return this.storage.save(address);
  }

  saveMany(addresses: WalletAddress[]): Promise<void> {
    return this.storage.saveMany(addresses);
  }

  updateStatus(id: string, status: AddressStatus, usedAt?: string): Promise<void> {
    return this.storage.updateStatus(id, status, usedAt);
  }

  updateSyncData(
    id: string,
    data: Partial<Pick<WalletAddress,
      | 'status' | 'totalReceivedSats' | 'totalSentSats' | 'txCount'
      | 'incomingTxCount' | 'outgoingTxCount' | 'hasUtxos' | 'lastSyncedAt'
    >>,
  ): Promise<void> {
    return this.storage.updateSyncData(id, data);
  }

  countFreshByChain(walletId: string, originId: string, chain: AddressChain): Promise<number> {
    return this.storage.countFreshByChain(walletId, originId, chain);
  }

  getMaxIndexByChain(walletId: string, originId: string, chain: AddressChain): Promise<number> {
    return this.storage.getMaxIndexByChain(walletId, originId, chain);
  }
}
