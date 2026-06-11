import { SelectWalletUseCase } from '../../../src/core/domain/usecases/wallet/SelectWalletUseCase';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';

const wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
} as const;

function makeRepo(overrides: Partial<WalletRepository> = {}): WalletRepository {
  return {
    create: jest.fn(),
    import: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(async () => null),
    rename: jest.fn(),
    retrieveSeed: jest.fn(),
    retrieveRawKey: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

describe('SelectWalletUseCase', () => {
  it('returns the wallet when found', async () => {
    const repo = makeRepo({ findById: jest.fn(async () => wallet) });
    const useCase = new SelectWalletUseCase(repo);

    await expect(useCase.execute('wallet-1')).resolves.toEqual(wallet);
    expect(repo.findById).toHaveBeenCalledWith('wallet-1');
  });

  it('returns null when the wallet does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn(async () => null) });
    const useCase = new SelectWalletUseCase(repo);

    await expect(useCase.execute('unknown-id')).resolves.toBeNull();
  });

  it('delegates to the repository exactly once per call', async () => {
    const repo = makeRepo({ findById: jest.fn(async () => wallet) });
    const useCase = new SelectWalletUseCase(repo);

    await useCase.execute('wallet-1');
    expect(repo.findById).toHaveBeenCalledTimes(1);
  });
});
