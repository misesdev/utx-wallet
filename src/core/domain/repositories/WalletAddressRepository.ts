import type { WalletAddress, AddressChain, AddressStatus } from '../entities/WalletAddress';

export interface WalletAddressRepository {
  findByWallet(walletId: string): Promise<WalletAddress[]>;
  findByOrigin(walletId: string, originId: string): Promise<WalletAddress[]>;
  findByChain(walletId: string, originId: string, chain: AddressChain): Promise<WalletAddress[]>;
  findFreshByChain(walletId: string, originId: string, chain: AddressChain, additionalStatuses?: AddressStatus[]): Promise<WalletAddress[]>;
  findByAddress(address: string): Promise<WalletAddress | null>;
  save(address: WalletAddress): Promise<void>;
  saveMany(addresses: WalletAddress[]): Promise<void>;
  updateStatus(id: string, status: AddressStatus, usedAt?: string): Promise<void>;
  updateOriginName(originId: string, originName: string): Promise<void>;
  updateSyncData(
    id: string,
    data: Partial<Pick<WalletAddress,
      | 'status'
      | 'totalReceivedSats'
      | 'totalSentSats'
      | 'txCount'
      | 'incomingTxCount'
      | 'outgoingTxCount'
      | 'hasUtxos'
      | 'lastSyncedAt'
    >>
  ): Promise<void>;
  countFreshByChain(walletId: string, originId: string, chain: AddressChain, additionalStatuses?: AddressStatus[]): Promise<number>;
  getMaxIndexByChain(walletId: string, originId: string, chain: AddressChain): Promise<number>;
  deleteByWallet(walletId: string): Promise<void>;
}
