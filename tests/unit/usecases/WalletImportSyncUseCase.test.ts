import type { BitcoinNetwork } from '../../../src/core/domain/entities/Network';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';
import type { AddressOriginRepository } from '../../../src/core/domain/repositories/AddressOriginRepository';
import type { WalletRepository, RawWalletKey } from '../../../src/core/domain/repositories/WalletRepository';
import type { CreateAddressOriginUseCase } from '../../../src/core/domain/usecases/address/CreateAddressOriginUseCase';
import type { SyncAccountUseCase, SyncAccountResult } from '../../../src/core/domain/usecases/wallet/SyncAccountUseCase';
import {
  WalletImportSyncUseCase,
  type ImportSyncProgress,
} from '../../../src/core/domain/usecases/wallet/WalletImportSyncUseCase';
import { DEFAULT_ORIGIN_NAME } from '../../../src/core/domain/entities/AddressOrigin';
import { AppError } from '../../../src/core/application/errors/AppError';

const WALLET_ID = 'wallet-1';
const NETWORK: BitcoinNetwork = 'testnet';

function makeOrigin(name: string, accountIndex: number): AddressOrigin {
  return {
    id: `origin-${accountIndex}`,
    walletId: WALLET_ID,
    name,
    type: name === DEFAULT_ORIGIN_NAME ? 'default' : 'custom',
    accountIndex,
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };
}

function makeAccountResult(overrides: Partial<SyncAccountResult> = {}): SyncAccountResult {
  return {
    newUtxos: 0,
    spentUtxos: 0,
    newTransactions: 0,
    syncedAt: new Date().toISOString(),
    hasActivity: false,
    ...overrides,
  };
}

function makeWalletRepo(key?: Partial<RawWalletKey> | null): jest.Mocked<WalletRepository> {
  const defaultKey: RawWalletKey = {
    kind: 'hd',
    secret: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  };
  return {
    retrieveRawKey: jest.fn().mockResolvedValue(
      key === null ? null : { ...defaultKey, ...key },
    ),
  } as unknown as jest.Mocked<WalletRepository>;
}

function makeOriginRepo(existing: AddressOrigin[] = []): jest.Mocked<AddressOriginRepository> {
  return {
    findByWallet: jest.fn().mockResolvedValue(existing),
    archive: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AddressOriginRepository>;
}

function makeCreateOrigin(
  factory?: (name: string) => AddressOrigin,
): jest.Mocked<CreateAddressOriginUseCase> {
  let callIndex = 0;
  return {
    execute: jest.fn().mockImplementation(async (_walletId: string, name: string) => {
      const origin = factory ? factory(name) : makeOrigin(name, callIndex);
      callIndex++;
      return origin;
    }),
  } as unknown as jest.Mocked<CreateAddressOriginUseCase>;
}

function makeSyncAccount(
  results: SyncAccountResult[] = [],
): jest.Mocked<SyncAccountUseCase> {
  let callIndex = 0;
  const defaultResult = makeAccountResult();
  return {
    execute: jest.fn().mockImplementation(async () => {
      const result = results[callIndex] ?? defaultResult;
      callIndex++;
      return result;
    }),
  } as unknown as jest.Mocked<SyncAccountUseCase>;
}

function makeUseCase(opts: {
  walletRepo?: jest.Mocked<WalletRepository>;
  originRepo?: jest.Mocked<AddressOriginRepository>;
  createOrigin?: jest.Mocked<CreateAddressOriginUseCase>;
  syncAccount?: jest.Mocked<SyncAccountUseCase>;
} = {}) {
  const walletRepo = opts.walletRepo ?? makeWalletRepo();
  const originRepo = opts.originRepo ?? makeOriginRepo();
  const createOrigin = opts.createOrigin ?? makeCreateOrigin();
  const syncAccount = opts.syncAccount ?? makeSyncAccount();
  const useCase = new WalletImportSyncUseCase(walletRepo, originRepo, createOrigin, syncAccount);
  return { useCase, walletRepo, originRepo, createOrigin, syncAccount };
}

describe('WalletImportSyncUseCase', () => {
  describe('fresh wallet — no history', () => {
    it('creates Default origin for account 0', async () => {
      const { useCase, createOrigin } = makeUseCase();

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(createOrigin.execute).toHaveBeenCalledWith(WALLET_ID, DEFAULT_ORIGIN_NAME, NETWORK);
      expect(result.origins).toHaveLength(1);
      expect(result.origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
    });

    it('returns zero counts for a fresh wallet', async () => {
      const { useCase } = makeUseCase();
      const result = await useCase.execute(WALLET_ID, NETWORK);
      expect(result.newTransactions).toBe(0);
      expect(result.newUtxos).toBe(0);
    });

    it('calls syncAccount once for account 0', async () => {
      const { useCase, syncAccount } = makeUseCase();
      await useCase.execute(WALLET_ID, NETWORK);
      expect(syncAccount.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('sequential account discovery', () => {
    it('creates a second origin as probe when account 0 has activity, then archives it (no activity)', async () => {
      const syncAccount = makeSyncAccount([
        makeAccountResult({ hasActivity: true, newTransactions: 1 }),
        makeAccountResult({ hasActivity: false }),
      ]);
      const createOrigin = makeCreateOrigin(name => makeOrigin(name, name === DEFAULT_ORIGIN_NAME ? 0 : 1));
      const originRepo = makeOriginRepo();
      const { useCase } = makeUseCase({ syncAccount, createOrigin, originRepo });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      // Account 1 (probe, no activity) must be archived and excluded from origins
      expect(result.origins).toHaveLength(1);
      expect(result.origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
      expect(originRepo.archive).toHaveBeenCalledWith('origin-1');
    });

    it('archives probe account and stops — only active accounts in origins', async () => {
      const syncAccount = makeSyncAccount([
        makeAccountResult({ hasActivity: true }),
        makeAccountResult({ hasActivity: false }),
      ]);
      const originRepo = makeOriginRepo();
      const { useCase } = makeUseCase({ syncAccount, originRepo });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      // Synced 2 accounts (0 active, 1 probe); account 1 archived and excluded; account 2 never created
      expect(syncAccount.execute).toHaveBeenCalledTimes(2);
      expect(result.origins).toHaveLength(1);
      expect(originRepo.archive).toHaveBeenCalledTimes(1);
    });

    it('does not stop at account 0 even when it has no activity', async () => {
      // Account 0 always runs regardless of hasActivity
      const syncAccount = makeSyncAccount([
        makeAccountResult({ hasActivity: false }),
      ]);
      const { useCase } = makeUseCase({ syncAccount });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(syncAccount.execute).toHaveBeenCalledTimes(1);
      expect(result.origins).toHaveLength(1);
    });

    it('aggregates newUtxos and newTransactions only from active accounts (excludes probe)', async () => {
      const syncAccount = makeSyncAccount([
        makeAccountResult({ hasActivity: true, newUtxos: 3, newTransactions: 2 }),
        makeAccountResult({ hasActivity: false, newUtxos: 0, newTransactions: 0 }),
      ]);
      const { useCase } = makeUseCase({ syncAccount });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      // Probe account (account 1) is archived and its counts are not included
      expect(result.newUtxos).toBe(3);
      expect(result.newTransactions).toBe(2);
    });

    it('creates origins with sequential names, probe account is archived and excluded', async () => {
      const syncAccount = makeSyncAccount([
        makeAccountResult({ hasActivity: true }),
        makeAccountResult({ hasActivity: true }),
        makeAccountResult({ hasActivity: false }),
      ]);
      const createOrigin = jest.fn().mockImplementation((_wid: string, name: string) =>
        Promise.resolve(makeOrigin(name, name === DEFAULT_ORIGIN_NAME ? 0 : parseInt(name.split(' ')[1], 10))),
      );
      const originRepo = makeOriginRepo();
      const { useCase } = makeUseCase({
        syncAccount,
        originRepo,
        createOrigin: { execute: createOrigin } as unknown as jest.Mocked<CreateAddressOriginUseCase>,
      });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      // Account 2 (no activity) archived; only Default + Account 1 imported
      expect(result.origins.map(o => o.name)).toEqual([DEFAULT_ORIGIN_NAME, 'Account 1']);
      expect(originRepo.archive).toHaveBeenCalledTimes(1);
    });
  });

  describe('watch-only wallet (zpub/vpub) — single account only', () => {
    const ZPUB_SECRET = 'zpub6rFR7y4Q2AijBEexyz';

    it('creates only Default origin even when account 0 has activity', async () => {
      const walletRepo = makeWalletRepo({ secret: ZPUB_SECRET });
      const syncAccount = makeSyncAccount([
        makeAccountResult({ hasActivity: true }),
      ]);
      const { useCase } = makeUseCase({ walletRepo, syncAccount });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.origins).toHaveLength(1);
      expect(syncAccount.execute).toHaveBeenCalledTimes(1);
    });

    it('returns non-zero counts for active watch-only wallet', async () => {
      const walletRepo = makeWalletRepo({ secret: ZPUB_SECRET });
      const syncAccount = makeSyncAccount([
        makeAccountResult({ hasActivity: true, newTransactions: 5, newUtxos: 2 }),
      ]);
      const { useCase } = makeUseCase({ walletRepo, syncAccount });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.newTransactions).toBe(5);
      expect(result.newUtxos).toBe(2);
    });

    it('behaves as multi-account for mnemonic wallet', async () => {
      const syncAccount = makeSyncAccount([
        makeAccountResult({ hasActivity: true }),
        makeAccountResult({ hasActivity: false }),
      ]);
      const { useCase } = makeUseCase({ syncAccount });

      await useCase.execute(WALLET_ID, NETWORK);

      expect(syncAccount.execute).toHaveBeenCalledTimes(2);
    });

    it('falls back to multi-account when key is null', async () => {
      const walletRepo = makeWalletRepo(null);
      const syncAccount = makeSyncAccount([
        makeAccountResult({ hasActivity: true }),
        makeAccountResult({ hasActivity: false }),
      ]);
      const { useCase } = makeUseCase({ walletRepo, syncAccount });

      await useCase.execute(WALLET_ID, NETWORK);

      expect(syncAccount.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('idempotency — re-import of already-created origin', () => {
    it('returns existing origin when createOriginUseCase throws ORIGIN_EXISTS', async () => {
      const existingOrigin = makeOrigin(DEFAULT_ORIGIN_NAME, 0);
      const originRepo = makeOriginRepo([existingOrigin]);
      const createOrigin = {
        execute: jest.fn().mockRejectedValue(
          new AppError('Origin "Default" already exists', 'ORIGIN_EXISTS'),
        ),
      } as unknown as jest.Mocked<CreateAddressOriginUseCase>;
      const { useCase } = makeUseCase({ originRepo, createOrigin });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.origins).toHaveLength(1);
      expect(result.origins[0].id).toBe(existingOrigin.id);
    });
  });

  describe('progress reporting', () => {
    it('emits discovering phase events adapted from SyncAccount progress', async () => {
      const syncAccount = {
        execute: jest.fn().mockImplementation(
          async (_wid: string, _oid: string, onProgress: ((p: { currentIndex: number; totalAddresses: number; currentAddress: string; phase: string }) => void) | undefined) => {
            onProgress?.({ currentIndex: 0, totalAddresses: 3, currentAddress: 'addr-A', phase: 'utxos' });
            onProgress?.({ currentIndex: 1, totalAddresses: 3, currentAddress: 'addr-B', phase: 'utxos' });
            return makeAccountResult({ hasActivity: false });
          },
        ),
      } as unknown as jest.Mocked<SyncAccountUseCase>;
      const { useCase } = makeUseCase({ syncAccount });
      const events: ImportSyncProgress[] = [];

      await useCase.execute(WALLET_ID, NETWORK, (p) => events.push(p));

      const discovering = events.filter(e => e.phase === 'discovering');
      expect(discovering.length).toBeGreaterThan(0);
      expect(discovering[0].accountIndex).toBe(0);
      expect(discovering[0].addressIndex).toBe(0);
    });

    it('emits syncing phase event after account with activity completes', async () => {
      const syncAccount = makeSyncAccount([makeAccountResult({ hasActivity: true })]);
      const { useCase } = makeUseCase({ syncAccount });
      const events: ImportSyncProgress[] = [];

      await useCase.execute(WALLET_ID, NETWORK, (p) => events.push(p));

      const syncing = events.find(e => e.phase === 'syncing');
      expect(syncing).toBeDefined();
      expect(syncing?.txFound).toBe(true);
    });

    it('does not emit syncing phase when account has no activity', async () => {
      const { useCase } = makeUseCase();
      const events: ImportSyncProgress[] = [];

      await useCase.execute(WALLET_ID, NETWORK, (p) => events.push(p));

      expect(events.find(e => e.phase === 'syncing')).toBeUndefined();
    });
  });
});
