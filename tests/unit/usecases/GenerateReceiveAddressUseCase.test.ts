import { GenerateReceiveAddressUseCase } from '../../../src/core/domain/usecases/wallet/GenerateReceiveAddressUseCase';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';
import type { WalletAddressProvider } from '../../../src/core/domain/repositories/WalletAddressProvider';
import type { AddressRepository } from '../../../src/core/domain/repositories/AddressRepository';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { Address } from '../../../src/core/domain/entities/Address';

const WALLET_ID = 'wallet-1';

const WALLET: Wallet = {
  id: WALLET_ID,
  name: 'Test Wallet',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};

const ADDRESS_VALUE = 'tb1qreceive000';

function makeWalletRepo(wallet: Wallet | null = WALLET): jest.Mocked<WalletRepository> {
  return {
    create: jest.fn(),
    import: jest.fn(),
    list: jest.fn(),
    findById: jest.fn().mockResolvedValue(wallet),
    rename: jest.fn(),
    retrieveSeed: jest.fn(),
    delete: jest.fn(),
  };
}

function makeAddressProvider(address = ADDRESS_VALUE): jest.Mocked<WalletAddressProvider> {
  return {
    getReceiveAddress: jest.fn().mockResolvedValue(address),
    getChangeAddress: jest.fn().mockResolvedValue('tb1qchange000'),
  };
}

function makeAddressRepo(existing: Address[] = []): jest.Mocked<AddressRepository> {
  return {
    findByWallet: jest.fn().mockResolvedValue(existing),
    findReceiveAddresses: jest.fn().mockResolvedValue(existing),
    findChangeAddresses: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    saveMany: jest.fn().mockResolvedValue(undefined),
    markUsed: jest.fn().mockResolvedValue(undefined),
    deleteByWallet: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUseCase(
  walletRepo = makeWalletRepo(),
  addressProvider = makeAddressProvider(),
  addressRepo = makeAddressRepo(),
) {
  return new GenerateReceiveAddressUseCase(walletRepo, addressProvider, addressRepo);
}

describe('GenerateReceiveAddressUseCase', () => {
  describe('address generation', () => {
    it('returns address at index 0 when no existing addresses', async () => {
      const useCase = makeUseCase();
      const result = await useCase.execute(WALLET_ID);

      expect(result.value).toBe(ADDRESS_VALUE);
      expect(result.index).toBe(0);
      expect(result.isChange).toBe(false);
      expect(result.isUsed).toBe(false);
    });

    it('requests address at index equal to existing count', async () => {
      const existing: Address[] = [
        { id: 'a1', accountId: WALLET_ID, value: 'tb1q0', network: 'testnet4', type: 'p2wpkh', isChange: false, index: 0, isUsed: false },
        { id: 'a2', accountId: WALLET_ID, value: 'tb1q1', network: 'testnet4', type: 'p2wpkh', isChange: false, index: 1, isUsed: true },
      ];
      const addressProvider = makeAddressProvider();
      const useCase = makeUseCase(makeWalletRepo(), addressProvider, makeAddressRepo(existing));

      const result = await useCase.execute(WALLET_ID);

      expect(addressProvider.getReceiveAddress).toHaveBeenCalledWith(WALLET_ID, 'testnet4', 2);
      expect(result.index).toBe(2);
    });

    it('saves the generated address to the repository', async () => {
      const addressRepo = makeAddressRepo();
      const useCase = makeUseCase(makeWalletRepo(), makeAddressProvider(), addressRepo);

      await useCase.execute(WALLET_ID);

      expect(addressRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ value: ADDRESS_VALUE, isChange: false, isUsed: false }),
      );
    });

    it('sets the correct network from the wallet', async () => {
      const useCase = makeUseCase();
      const result = await useCase.execute(WALLET_ID);

      expect(result.network).toBe('testnet4');
    });

    it('sets address type to p2wpkh', async () => {
      const useCase = makeUseCase();
      const result = await useCase.execute(WALLET_ID);

      expect(result.type).toBe('p2wpkh');
    });
  });

  describe('error handling', () => {
    it('throws WALLET_NOT_FOUND when wallet does not exist', async () => {
      const useCase = makeUseCase(makeWalletRepo(null));

      await expect(useCase.execute(WALLET_ID)).rejects.toMatchObject({
        code: 'WALLET_NOT_FOUND',
      });
    });

    it('propagates error from address provider', async () => {
      const addressProvider = makeAddressProvider();
      addressProvider.getReceiveAddress.mockRejectedValue(new AppError('Key not found', 'WALLET_NOT_FOUND'));

      const useCase = makeUseCase(makeWalletRepo(), addressProvider);

      await expect(useCase.execute(WALLET_ID)).rejects.toMatchObject({
        code: 'WALLET_NOT_FOUND',
      });
    });
  });
});
