import { GetWalletSeedUseCase } from '../../../src/core/domain/usecases/wallet/GetWalletSeedUseCase';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { WalletRepository } from '../../../src/core/domain/repositories/WalletRepository';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function makeRepo(overrides: Partial<jest.Mocked<WalletRepository>> = {}): jest.Mocked<WalletRepository> {
  return {
    create: jest.fn(),
    import: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    rename: jest.fn(),
    retrieveSeed: jest.fn().mockResolvedValue({ mnemonic: MNEMONIC }),
    delete: jest.fn(),
    ...overrides,
  };
}

describe('GetWalletSeedUseCase', () => {
  it('delegates to walletRepository.retrieveSeed with walletId', async () => {
    const repo = makeRepo();
    const useCase = new GetWalletSeedUseCase(repo);

    await useCase.execute('wallet-1');

    expect(repo.retrieveSeed).toHaveBeenCalledWith('wallet-1');
  });

  it('returns mnemonic from the repository', async () => {
    const repo = makeRepo();
    const useCase = new GetWalletSeedUseCase(repo);

    const result = await useCase.execute('wallet-1');

    expect(result).not.toBeNull();
    expect(result!.mnemonic).toBe(MNEMONIC);
  });

  it('returns passphrase when the wallet has one', async () => {
    const repo = makeRepo({
      retrieveSeed: jest.fn().mockResolvedValue({ mnemonic: MNEMONIC, passphrase: 'secret' }),
    });
    const useCase = new GetWalletSeedUseCase(repo);

    const result = await useCase.execute('wallet-1');

    expect(result!.passphrase).toBe('secret');
  });

  it('returns null when the wallet has no stored seed', async () => {
    const repo = makeRepo({ retrieveSeed: jest.fn().mockResolvedValue(null) });
    const useCase = new GetWalletSeedUseCase(repo);

    const result = await useCase.execute('wallet-1');

    expect(result).toBeNull();
  });

  it('propagates WALLET_NOT_FOUND when wallet does not exist', async () => {
    const repo = makeRepo({
      retrieveSeed: jest.fn().mockRejectedValue(new AppError('Wallet not found', 'WALLET_NOT_FOUND')),
    });
    const useCase = new GetWalletSeedUseCase(repo);

    await expect(useCase.execute('unknown')).rejects.toMatchObject({
      code: 'WALLET_NOT_FOUND',
    });
  });
});
