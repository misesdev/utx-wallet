import { RenameAddressOriginUseCase } from '../../../src/core/domain/usecases/address/RenameAddressOriginUseCase';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';
import type { AddressOriginRepository } from '../../../src/core/domain/repositories/AddressOriginRepository';
import type { WalletAddressRepository } from '../../../src/core/domain/repositories/WalletAddressRepository';

const ORIGIN: AddressOrigin = { id: 'origin-1', walletId: 'wallet-1', name: 'Old', type: 'custom', accountIndex: 1, createdAt: 'now', archivedAt: null };

function makeOriginRepo(): jest.Mocked<AddressOriginRepository> {
  return {
    findByWallet: jest.fn().mockResolvedValue([ORIGIN]),
    findById: jest.fn().mockResolvedValue(ORIGIN),
    findDefault: jest.fn(),
    getMaxAccountIndex: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn(),
    deleteByWallet: jest.fn(),
  };
}

function makeAddressRepo(): jest.Mocked<WalletAddressRepository> {
  return {
    findByWallet: jest.fn(),
    findByOrigin: jest.fn(),
    findByChain: jest.fn(),
    findFreshByChain: jest.fn(),
    findByAddress: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    updateStatus: jest.fn(),
    updateOriginName: jest.fn().mockResolvedValue(undefined),
    updateSyncData: jest.fn(),
    countFreshByChain: jest.fn(),
    getMaxIndexByChain: jest.fn(),
    deleteByOrigin: jest.fn(),
    deleteByWallet: jest.fn(),
  };
}

describe('RenameAddressOriginUseCase', () => {
  it('renames the account and updates wallet address metadata', async () => {
    const originRepo = makeOriginRepo();
    const addressRepo = makeAddressRepo();
    const useCase = new RenameAddressOriginUseCase(originRepo, addressRepo);

    const result = await useCase.execute('origin-1', 'New name');

    expect(result.name).toBe('New name');
    expect(originRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'origin-1', name: 'New name' }));
    expect(addressRepo.updateOriginName).toHaveBeenCalledWith('origin-1', 'New name');
  });

  it('rejects duplicate account names in the same wallet', async () => {
    const originRepo = makeOriginRepo();
    originRepo.findByWallet.mockResolvedValue([ORIGIN, { ...ORIGIN, id: 'other', name: 'Savings' }]);
    const useCase = new RenameAddressOriginUseCase(originRepo, makeAddressRepo());

    await expect(useCase.execute('origin-1', 'Savings')).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS' });
  });
});
