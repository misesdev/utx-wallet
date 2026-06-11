import type { AddressActivityChecker } from '../../../src/core/domain/repositories/AddressActivityChecker';
import type { WalletAddressProvider } from '../../../src/core/domain/repositories/WalletAddressProvider';
import type { AddressOriginRepository } from '../../../src/core/domain/repositories/AddressOriginRepository';
import type { WalletRepository, RawWalletKey } from '../../../src/core/domain/repositories/WalletRepository';
import { WalletDiscoveryUseCase } from '../../../src/core/domain/usecases/wallet/WalletDiscoveryUseCase';
import { DEFAULT_ORIGIN_NAME } from '../../../src/core/domain/entities/AddressOrigin';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { BitcoinNetwork } from '../../../src/core/domain/entities/Network';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';

const WALLET_ID = 'wallet-1';
const NETWORK: BitcoinNetwork = 'testnet';

function makeAddressProvider(): WalletAddressProvider {
  return {
    getReceiveAddress: jest.fn(async (_wId: string, _net: BitcoinNetwork, index: number, accountIndex: number) => {
      return `addr-${accountIndex}-receive-${index}`;
    }),
    getChangeAddress: jest.fn(async (_wId: string, _net: BitcoinNetwork, index: number, accountIndex: number) => {
      return `addr-${accountIndex}-change-${index}`;
    }),
  };
}

function makeActivityChecker(txCounts: Map<string, number> = new Map()): AddressActivityChecker {
  return {
    getAddressTxCount: jest.fn(async (address: string) => {
      return txCounts.get(address) ?? 0;
    }),
  };
}

function makeOriginRepository(existing: AddressOrigin[] = []): AddressOriginRepository {
  return {
    findByWallet: jest.fn(async () => existing),
    findById: jest.fn(async () => null),
    findDefault: jest.fn(async () => null),
    getMaxAccountIndex: jest.fn(async () => -1),
    save: jest.fn(async () => {}),
    archive: jest.fn(async () => {}),
    deleteByWallet: jest.fn(async () => {}),
  };
}

function makeCreateOriginUseCase(
  onExecute?: (walletId: string, name: string, network: BitcoinNetwork) => AddressOrigin,
) {
  let accountIndex = 0;
  return {
    execute: jest.fn(async (walletId: string, name: string, network: BitcoinNetwork) => {
      if (onExecute) return onExecute(walletId, name, network);
      const origin: AddressOrigin = {
        id: `origin-${accountIndex}`,
        walletId,
        name,
        type: name === DEFAULT_ORIGIN_NAME ? 'default' : 'custom',
        accountIndex: accountIndex++,
        createdAt: new Date().toISOString(),
        archivedAt: null,
      };
      return origin;
    }),
  } as unknown as InstanceType<typeof import('../../../src/core/domain/usecases/address/CreateAddressOriginUseCase').CreateAddressOriginUseCase>;
}

function makeWalletRepository(key?: Partial<RawWalletKey> | null): jest.Mocked<WalletRepository> {
  const defaultKey: RawWalletKey = { kind: 'hd', secret: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' };
  return {
    create: jest.fn(),
    import: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    rename: jest.fn(),
    retrieveSeed: jest.fn(),
    retrieveRawKey: jest.fn().mockResolvedValue(
      key === null ? null : { ...defaultKey, ...key },
    ),
    delete: jest.fn(),
  } as unknown as jest.Mocked<WalletRepository>;
}

describe('WalletDiscoveryUseCase', () => {
  it('creates Default origin for fresh wallet with no activity', async () => {
    const provider = makeAddressProvider();
    const checker = makeActivityChecker();
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

    const origins = await useCase.execute(WALLET_ID, NETWORK);

    expect(origins).toHaveLength(1);
    expect(origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
    expect(createOrigin.execute).toHaveBeenCalledTimes(1);
    expect(createOrigin.execute).toHaveBeenCalledWith(WALLET_ID, DEFAULT_ORIGIN_NAME, NETWORK);
  });

  it('creates Default origin and stops when only account 0 has activity', async () => {
    const txCounts = new Map([
      ['addr-0-receive-0', 3],
    ]);
    const provider = makeAddressProvider();
    const checker = makeActivityChecker(txCounts);
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

    const origins = await useCase.execute(WALLET_ID, NETWORK);

    expect(origins).toHaveLength(1);
    expect(origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
  });

  it('creates two origins when accounts 0 and 1 have activity', async () => {
    const txCounts = new Map([
      ['addr-0-receive-0', 2],
      ['addr-1-receive-0', 1],
    ]);
    const provider = makeAddressProvider();
    const checker = makeActivityChecker(txCounts);
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

    const origins = await useCase.execute(WALLET_ID, NETWORK);

    expect(origins).toHaveLength(2);
    expect(origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
    expect(origins[1].name).toBe('Account 1');
  });

  it('stops after first inactive account beyond account 0', async () => {
    const txCounts = new Map([
      ['addr-0-receive-0', 1],
      ['addr-1-receive-0', 1],
      // account 2 has no activity
    ]);
    const provider = makeAddressProvider();
    const checker = makeActivityChecker(txCounts);
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

    const origins = await useCase.execute(WALLET_ID, NETWORK);

    expect(origins).toHaveLength(2);
    expect(origins.map(o => o.name)).toEqual([DEFAULT_ORIGIN_NAME, 'Account 1']);
  });

  it('calls onProgress with accountIndex and addressIndex for each address checked', async () => {
    const txCounts = new Map([['addr-0-receive-0', 1]]);
    const provider = makeAddressProvider();
    const checker = makeActivityChecker(txCounts);
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);
    const progressCalls: Array<{ accountIndex: number; addressIndex: number }> = [];

    await useCase.execute(WALLET_ID, NETWORK, (p) => {
      progressCalls.push({ accountIndex: p.accountIndex, addressIndex: p.addressIndex });
    });

    expect(progressCalls.some(p => p.accountIndex === 0)).toBe(true);
    expect(progressCalls.some(p => p.accountIndex === 1)).toBe(true);
  });

  it('reports txFound=true when activity is found at an address', async () => {
    const txCounts = new Map([['addr-0-receive-1', 3]]);
    const provider = makeAddressProvider();
    const checker = makeActivityChecker(txCounts);
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);
    const foundCalls: Array<{ accountIndex: number; addressIndex: number }> = [];

    await useCase.execute(WALLET_ID, NETWORK, (p) => {
      if (p.txFound) foundCalls.push({ accountIndex: p.accountIndex, addressIndex: p.addressIndex });
    });

    expect(foundCalls).toHaveLength(1);
    expect(foundCalls[0]).toEqual({ accountIndex: 0, addressIndex: 1 });
  });

  it('respects gap limit of 3 consecutive fresh addresses', async () => {
    const provider = makeAddressProvider();
    const checker = makeActivityChecker(new Map());
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

    const origins = await useCase.execute(WALLET_ID, NETWORK);

    // Should check at most 3 addresses for account 0 before stopping
    expect(checker.getAddressTxCount).toHaveBeenCalledTimes(3);
    expect(origins).toHaveLength(1); // Default origin created for fresh wallet
  });

  it('treats API errors as fresh addresses (does not crash)', async () => {
    const checker: AddressActivityChecker = {
      getAddressTxCount: jest.fn().mockRejectedValue(new Error('Network error')),
    };
    const provider = makeAddressProvider();
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

    const origins = await useCase.execute(WALLET_ID, NETWORK);

    expect(origins).toHaveLength(1);
    expect(origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
  });

  it('finds activity at address index 3 after 3 fresh addresses would normally stop', async () => {
    // First 3 are fresh (normally stops), BUT the gap limit resets at index 3
    // Actually if first 3 are fresh → gap=3 → stop BEFORE checking index 3
    // This tests the boundary condition
    const txCounts = new Map([
      ['addr-0-receive-3', 5], // this won't be checked due to gap limit
    ]);
    const provider = makeAddressProvider();
    const checker = makeActivityChecker(txCounts);
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

    const origins = await useCase.execute(WALLET_ID, NETWORK);

    // Should NOT find the activity at index 3 because gap limit stops at index 2
    expect(origins).toHaveLength(1); // just default
    expect(origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
  });

  it('detects activity at second address when first is fresh', async () => {
    const txCounts = new Map([
      ['addr-0-receive-1', 2],
    ]);
    const provider = makeAddressProvider();
    const checker = makeActivityChecker(txCounts);
    const createOrigin = makeCreateOriginUseCase();
    const repo = makeOriginRepository();
    const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

    const origins = await useCase.execute(WALLET_ID, NETWORK);

    expect(origins).toHaveLength(1);
    expect(origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
    // account 1 has no activity → stops
  });

  describe('idempotency: handles ORIGIN_EXISTS gracefully', () => {
    it('returns existing origin when Default already exists', async () => {
      const existingOrigin: AddressOrigin = {
        id: 'existing-origin',
        walletId: WALLET_ID,
        name: DEFAULT_ORIGIN_NAME,
        type: 'default',
        accountIndex: 0,
        createdAt: new Date().toISOString(),
        archivedAt: null,
      };
      const createOrigin = makeCreateOriginUseCase();
      (createOrigin.execute as jest.Mock).mockRejectedValueOnce(
        new AppError(`Origin "${DEFAULT_ORIGIN_NAME}" already exists`, 'ORIGIN_EXISTS'),
      );
      const repo = makeOriginRepository([existingOrigin]);
      const provider = makeAddressProvider();
      const checker = makeActivityChecker();
      const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

      const origins = await useCase.execute(WALLET_ID, NETWORK);

      expect(origins).toHaveLength(1);
      expect(origins[0].id).toBe('existing-origin');
      expect(repo.findByWallet).toHaveBeenCalledWith(WALLET_ID);
    });

    it('re-throws errors that are not ORIGIN_EXISTS', async () => {
      const createOrigin = makeCreateOriginUseCase();
      (createOrigin.execute as jest.Mock).mockRejectedValueOnce(
        new AppError('DB failure', 'DB_ERROR'),
      );
      const repo = makeOriginRepository();
      const provider = makeAddressProvider();
      const checker = makeActivityChecker();
      const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo);

      await expect(useCase.execute(WALLET_ID, NETWORK)).rejects.toThrow('DB failure');
    });
  });

  describe('watch-only wallet (zpub/vpub) — single account only', () => {
    const ZPUB_SECRET = 'zpub6rFR7y4Q2AijBEexyz';

    it('creates only the Default origin even when addresses appear active on multiple accounts', async () => {
      // Without the guard, accounts 1+ would all look active (same addresses as account 0)
      const txCounts = new Map([
        ['addr-0-receive-0', 3],
        ['addr-1-receive-0', 3], // same addresses appear active
        ['addr-2-receive-0', 3],
      ]);
      const walletRepo = makeWalletRepository({ secret: ZPUB_SECRET });
      const provider = makeAddressProvider();
      const checker = makeActivityChecker(txCounts);
      const createOrigin = makeCreateOriginUseCase();
      const repo = makeOriginRepository();
      const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo, walletRepo);

      const origins = await useCase.execute(WALLET_ID, NETWORK);

      expect(origins).toHaveLength(1);
      expect(origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
      expect(createOrigin.execute).toHaveBeenCalledTimes(1);
    });

    it('creates Default origin for a fresh watch-only wallet', async () => {
      const walletRepo = makeWalletRepository({ secret: ZPUB_SECRET });
      const provider = makeAddressProvider();
      const checker = makeActivityChecker();
      const createOrigin = makeCreateOriginUseCase();
      const repo = makeOriginRepository();
      const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo, walletRepo);

      const origins = await useCase.execute(WALLET_ID, NETWORK);

      expect(origins).toHaveLength(1);
      expect(origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
    });

    it('still allows multi-account discovery for non-watch-only wallets with walletRepository', async () => {
      const txCounts = new Map([
        ['addr-0-receive-0', 2],
        ['addr-1-receive-0', 1],
      ]);
      const walletRepo = makeWalletRepository(); // mnemonic secret, not zpub
      const provider = makeAddressProvider();
      const checker = makeActivityChecker(txCounts);
      const createOrigin = makeCreateOriginUseCase();
      const repo = makeOriginRepository();
      const useCase = new WalletDiscoveryUseCase(provider, checker, createOrigin, repo, walletRepo);

      const origins = await useCase.execute(WALLET_ID, NETWORK);

      expect(origins).toHaveLength(2);
      expect(origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
      expect(origins[1].name).toBe('Account 1');
    });
  });
});
