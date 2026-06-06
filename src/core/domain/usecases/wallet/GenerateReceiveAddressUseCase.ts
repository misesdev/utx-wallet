import type { Address } from '../../entities/Address';
import type { WalletRepository } from '../../repositories/WalletRepository';
import type { WalletAddressProvider } from '../../repositories/WalletAddressProvider';
import type { AddressRepository } from '../../repositories/AddressRepository';
import { AppError } from '../../../application/errors/AppError';
import { generateId } from '../../../../shared/utils/generateId';

export class GenerateReceiveAddressUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly walletAddressProvider: WalletAddressProvider,
    private readonly addressRepository: AddressRepository,
  ) {}

  async execute(walletId: string): Promise<Address> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new AppError('Wallet not found', 'WALLET_NOT_FOUND');
    }

    const existing = await this.addressRepository.findReceiveAddresses(walletId);
    const nextIndex = existing.length;

    const addressValue = await this.walletAddressProvider.getReceiveAddress(
      walletId,
      wallet.network,
      nextIndex,
    );

    const address: Address = {
      id: generateId(),
      accountId: walletId,
      value: addressValue,
      network: wallet.network,
      type: 'p2wpkh',
      isChange: false,
      index: nextIndex,
      isUsed: false,
    };

    await this.addressRepository.save(address);

    return address;
  }
}
