import { CreateWalletUseCase } from '../../../src/core/domain/usecases/wallet/CreateWalletUseCase';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';

const wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
} as const;

describe('CreateWalletUseCase', () => {
  it('delegates wallet creation to the repository', async () => {
    const repository: WalletRepository = {
      create: jest.fn(async () => wallet),
      import: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      rename: jest.fn(),
      retrieveSeed: jest.fn(),
    retrieveRawKey: jest.fn(),
      delete: jest.fn(),
    };
    const useCase = new CreateWalletUseCase(repository);

    await expect(useCase.execute('Primary')).resolves.toEqual(wallet);
    expect(repository.create).toHaveBeenCalledWith('Primary');
  });
});
