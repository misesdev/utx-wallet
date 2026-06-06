import { DeleteWalletUseCase } from '../../../src/core/domain/usecases/wallet/DeleteWalletUseCase';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';

function makeRepo(overrides: Partial<WalletRepository> = {}): WalletRepository {
  return {
    create: jest.fn(),
    import: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(async () => null),
    delete: jest.fn(async () => {}),
    ...overrides,
  };
}

describe('DeleteWalletUseCase', () => {
  it('delegates deletion to the repository', async () => {
    const repo = makeRepo();
    const useCase = new DeleteWalletUseCase(repo);

    await useCase.execute('wallet-1');

    expect(repo.delete).toHaveBeenCalledWith('wallet-1');
    expect(repo.delete).toHaveBeenCalledTimes(1);
  });

  it('resolves without error on successful deletion', async () => {
    const repo = makeRepo({ delete: jest.fn(async () => {}) });
    const useCase = new DeleteWalletUseCase(repo);

    await expect(useCase.execute('wallet-1')).resolves.toBeUndefined();
  });

  it('propagates errors thrown by the repository', async () => {
    const repo = makeRepo({
      delete: jest.fn(async () => { throw new Error('WALLET_NOT_FOUND'); }),
    });
    const useCase = new DeleteWalletUseCase(repo);

    await expect(useCase.execute('unknown-id')).rejects.toThrow('WALLET_NOT_FOUND');
  });
});
