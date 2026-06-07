import type { AddressOrigin } from '../../entities/AddressOrigin';
import { DEFAULT_ORIGIN_NAME } from '../../entities/AddressOrigin';
import { ADDRESS_POLICY } from '../../entities/WalletAddress';
import type { BitcoinNetwork } from '../../entities/Network';
import type { AddressOriginRepository } from '../../repositories/AddressOriginRepository';
import type { WalletAddressRepository } from '../../repositories/WalletAddressRepository';
import type { WalletAddressProvider } from '../../repositories/WalletAddressProvider';
import { derivationPathForAddress } from '../../services/AddressDerivationService';
import { AppError } from '../../../application/errors/AppError';
import { generateId } from '../../../../shared/utils/generateId';

export class CreateAddressOriginUseCase {
  constructor(
    private readonly originRepository: AddressOriginRepository,
    private readonly walletAddressRepository: WalletAddressRepository,
    private readonly walletAddressProvider: WalletAddressProvider,
  ) {}

  async execute(
    walletId: string,
    name: string,
    network: BitcoinNetwork,
  ): Promise<AddressOrigin> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new AppError('Origin name cannot be empty', 'INVALID_ORIGIN_NAME');
    }

    // Validate uniqueness by name within the wallet
    const existing = await this.originRepository.findByWallet(walletId);
    if (existing.some(o => o.name === trimmedName && !o.archivedAt)) {
      throw new AppError(`Origin "${trimmedName}" already exists`, 'ORIGIN_EXISTS');
    }

    const isDefault = trimmedName === DEFAULT_ORIGIN_NAME;

    // Next available account index (max + 1; -1 when no origins exist → first gets 0)
    const maxIndex = await this.originRepository.getMaxAccountIndex(walletId);
    const accountIndex = maxIndex + 1;

    const origin: AddressOrigin = {
      id: generateId(),
      walletId,
      name: trimmedName,
      type: isDefault ? 'default' : 'custom',
      accountIndex,
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };

    await this.originRepository.save(origin);

    // Generate initial pool: minAvailableReceive receive + minAvailableChange change
    const now = origin.createdAt;
    const addresses = [];

    for (let i = 0; i < ADDRESS_POLICY.minAvailableReceive; i++) {
      const addr = await this.walletAddressProvider.getReceiveAddress(
        walletId,
        network,
        i,
        accountIndex,
      );
      addresses.push({
        id: generateId(),
        walletId,
        originId: origin.id,
        originName: origin.name,
        address: addr,
        path: derivationPathForAddress(network, accountIndex, 'receive', i),
        accountIndex,
        chain: 'receive' as const,
        index: i,
        status: 'fresh' as const,
        totalReceivedSats: 0,
        totalSentSats: 0,
        txCount: 0,
        incomingTxCount: 0,
        outgoingTxCount: 0,
        hasUtxos: false,
        isFrozen: false,
        createdAt: now,
        usedAt: null,
        lastSyncedAt: null,
      });
    }

    for (let i = 0; i < ADDRESS_POLICY.minAvailableChange; i++) {
      const addr = await this.walletAddressProvider.getChangeAddress(
        walletId,
        network,
        i,
        accountIndex,
      );
      addresses.push({
        id: generateId(),
        walletId,
        originId: origin.id,
        originName: origin.name,
        address: addr,
        path: derivationPathForAddress(network, accountIndex, 'change', i),
        accountIndex,
        chain: 'change' as const,
        index: i,
        status: 'fresh' as const,
        totalReceivedSats: 0,
        totalSentSats: 0,
        txCount: 0,
        incomingTxCount: 0,
        outgoingTxCount: 0,
        hasUtxos: false,
        isFrozen: false,
        createdAt: now,
        usedAt: null,
        lastSyncedAt: null,
      });
    }

    await this.walletAddressRepository.saveMany(addresses);

    return origin;
  }
}
