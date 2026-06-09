import { RenameWalletUseCase } from '../../../src/core/domain/usecases/wallet/RenameWalletUseCase';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Old Name',
  network: 'testnet',
  status: 'locked',
  createdAt: '2026-06-08T00:00:00.000Z',
};

function makeRepo(overrides: Partial<jest.Mocked<WalletRepository>> = {}): jest.Mocked<WalletRepository> {
  return {
    create: jest.fn(),
    import: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    rename: jest.fn().mockResolvedValue({ ...WALLET, name: 'New Name' }),
    retrieveSeed: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

describe('RenameWalletUseCase', () => {
  it('delegates to walletRepository.rename with id and name', async () => {
    const repo = makeRepo();
    const useCase = new RenameWalletUseCase(repo);

    await useCase.execute('wallet-1', 'New Name');

    expect(repo.rename).toHaveBeenCalledWith('wallet-1', 'New Name');
  });

  it('returns the updated wallet from the repository', async () => {
    const updated = { ...WALLET, name: 'Renamed' };
    const repo = makeRepo({ rename: jest.fn().mockResolvedValue(updated) });
    const useCase = new RenameWalletUseCase(repo);

    const result = await useCase.execute('wallet-1', 'Renamed');

    expect(result).toEqual(updated);
  });

  it('propagates WALLET_NOT_FOUND when wallet does not exist', async () => {
    const repo = makeRepo({
      rename: jest.fn().mockRejectedValue(new AppError('Wallet not found', 'WALLET_NOT_FOUND')),
    });
    const useCase = new RenameWalletUseCase(repo);

    await expect(useCase.execute('unknown', 'New Name')).rejects.toMatchObject({
      code: 'WALLET_NOT_FOUND',
    });
  });

  it('propagates WALLET_EXISTS when another wallet already has that name', async () => {
    const repo = makeRepo({
      rename: jest.fn().mockRejectedValue(new AppError('Wallet "New Name" already exists', 'WALLET_EXISTS')),
    });
    const useCase = new RenameWalletUseCase(repo);

    await expect(useCase.execute('wallet-1', 'New Name')).rejects.toMatchObject({
      code: 'WALLET_EXISTS',
    });
  });

  it('calls rename with the exact id and name provided', async () => {
    const repo = makeRepo();
    const useCase = new RenameWalletUseCase(repo);

    await useCase.execute('abc-123', 'Bitcoin Savings');

    expect(repo.rename).toHaveBeenCalledTimes(1);
    expect(repo.rename).toHaveBeenCalledWith('abc-123', 'Bitcoin Savings');
  });
});
