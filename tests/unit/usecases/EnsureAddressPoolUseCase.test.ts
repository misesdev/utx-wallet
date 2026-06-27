import { EnsureAddressPoolUseCase } from '../../../src/core/domain/usecases/address/EnsureAddressPoolUseCase';
import { ADDRESS_POLICY } from '../../../src/core/domain/entities/WalletAddress';
import type { WalletAddressRepository } from '../../../src/core/domain/repositories/WalletAddressRepository';
import type { AddressOriginRepository } from '../../../src/core/domain/repositories/AddressOriginRepository';
import type { WalletAddressProvider } from '../../../src/core/domain/repositories/WalletAddressProvider';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';
import { DEFAULT_ORIGIN_NAME } from '../../../src/core/domain/entities/AddressOrigin';

const WALLET_ID = 'wallet-1';
const ORIGIN_ID = 'origin-1';
const NETWORK = 'testnet' as const;

function makeOrigin(overrides: Partial<AddressOrigin> = {}): AddressOrigin {
  return {
    id: ORIGIN_ID,
    walletId: WALLET_ID,
    name: DEFAULT_ORIGIN_NAME,
    type: 'default',
    accountIndex: 0,
    archivedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAddressRepo(overrides: {
  countFresh?: number;
  maxIndex?: number;
} = {}): jest.Mocked<WalletAddressRepository> {
  return {
    findByWallet: jest.fn().mockResolvedValue([]),
    findByOrigin: jest.fn().mockResolvedValue([]),
    findByChain: jest.fn().mockResolvedValue([]),
    findFreshByChain: jest.fn().mockResolvedValue([]),
    findByAddress: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    saveMany: jest.fn().mockResolvedValue(undefined),
    updateOriginName: jest.fn().mockResolvedValue(undefined),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    updateSyncData: jest.fn().mockResolvedValue(undefined),
    countFreshByChain: jest.fn().mockResolvedValue(overrides.countFresh ?? 0),
    getMaxIndexByChain: jest.fn().mockResolvedValue(overrides.maxIndex ?? -1),
    nextIndex: jest.fn().mockResolvedValue(0),
  } as unknown as jest.Mocked<WalletAddressRepository>;
}

function makeOriginRepo(origin: AddressOrigin | null = makeOrigin()): jest.Mocked<AddressOriginRepository> {
  return {
    findByWallet: jest.fn().mockResolvedValue(origin ? [origin] : []),
    findById: jest.fn().mockResolvedValue(origin),
    findDefault: jest.fn().mockResolvedValue(origin),
    save: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AddressOriginRepository>;
}

function makeAddressProvider(): jest.Mocked<WalletAddressProvider> {
  return {
    getReceiveAddress: jest.fn().mockImplementation((_wid, _net, idx) => Promise.resolve(`tb1receive${idx}`)),
    getChangeAddress: jest.fn().mockImplementation((_wid, _net, idx) => Promise.resolve(`tb1change${idx}`)),
  };
}

function createUseCase(
  addressRepo = makeAddressRepo(),
  originRepo = makeOriginRepo(),
  addressProvider = makeAddressProvider(),
) {
  return { useCase: new EnsureAddressPoolUseCase(addressRepo, originRepo, addressProvider), addressRepo, addressProvider };
}

describe('EnsureAddressPoolUseCase', () => {
  describe('receive chain — minimum pool (minAvailableReceive = 3)', () => {
    it('creates 3 receive addresses when pool is empty', async () => {
      const { useCase, addressRepo } = createUseCase(makeAddressRepo({ countFresh: 0, maxIndex: -1 }));
      await useCase.execute(WALLET_ID, NETWORK);
      const saved = (addressRepo.saveMany as jest.Mock).mock.calls[0][0];
      const receiveCreated = saved.filter((a: { chain: string }) => a.chain === 'receive');
      expect(receiveCreated).toHaveLength(ADDRESS_POLICY.minAvailableReceive);
    });

    it('creates no receive addresses when pool already has minAvailableReceive', async () => {
      const { useCase, addressRepo } = createUseCase(
        makeAddressRepo({ countFresh: ADDRESS_POLICY.minAvailableReceive, maxIndex: 2 }),
      );
      await useCase.execute(WALLET_ID, NETWORK);
      const allSaved = (addressRepo.saveMany as jest.Mock).mock.calls.flatMap(c => c[0]);
      const receiveCreated = allSaved.filter((a: { chain: string }) => a.chain === 'receive');
      expect(receiveCreated).toHaveLength(0);
    });

    it('creates only the missing receive addresses when partially populated', async () => {
      const { useCase, addressRepo } = createUseCase(makeAddressRepo({ countFresh: 1, maxIndex: 0 }));
      await useCase.execute(WALLET_ID, NETWORK);
      const allSaved = (addressRepo.saveMany as jest.Mock).mock.calls.flatMap(c => c[0]);
      const receiveCreated = allSaved.filter((a: { chain: string }) => a.chain === 'receive');
      expect(receiveCreated).toHaveLength(ADDRESS_POLICY.minAvailableReceive - 1);
    });
  });

  describe('change chain — pool uses minAvailableChange (5)', () => {
    it('creates minAvailableChange (5) change addresses when pool is empty', async () => {
      const { useCase, addressRepo } = createUseCase(makeAddressRepo({ countFresh: 0, maxIndex: -1 }));
      await useCase.execute(WALLET_ID, NETWORK);
      const allSaved = (addressRepo.saveMany as jest.Mock).mock.calls.flatMap(c => c[0]);
      const changeCreated = allSaved.filter((a: { chain: string }) => a.chain === 'change');
      expect(changeCreated).toHaveLength(ADDRESS_POLICY.minAvailableChange);
    });

    it('does NOT create more change addresses when pool already has minAvailableChange', async () => {
      const { useCase, addressRepo } = createUseCase(
        makeAddressRepo({ countFresh: ADDRESS_POLICY.minAvailableChange, maxIndex: ADDRESS_POLICY.minAvailableChange - 1 }),
      );
      await useCase.execute(WALLET_ID, NETWORK);
      const allSaved = (addressRepo.saveMany as jest.Mock).mock.calls.flatMap(c => c[0]);
      const changeCreated = allSaved.filter((a: { chain: string }) => a.chain === 'change');
      expect(changeCreated).toHaveLength(0);
    });

    it('creates only missing change addresses when partially populated', async () => {
      const existing = 2;
      const { useCase, addressRepo } = createUseCase(makeAddressRepo({ countFresh: existing, maxIndex: existing - 1 }));
      await useCase.execute(WALLET_ID, NETWORK);
      const allSaved = (addressRepo.saveMany as jest.Mock).mock.calls.flatMap(c => c[0]);
      const changeCreated = allSaved.filter((a: { chain: string }) => a.chain === 'change');
      expect(changeCreated).toHaveLength(ADDRESS_POLICY.minAvailableChange - existing);
    });

    it('change pool (5) is larger than receive pool (3) and within gapLimit (20)', () => {
      // Pool must be > minAvailableReceive (intentionally larger for automatic change addresses)
      // and must be ≤ gapLimit so wallet-import discovery never misses funds
      expect(ADDRESS_POLICY.minAvailableChange).toBeGreaterThan(ADDRESS_POLICY.minAvailableReceive);
      expect(ADDRESS_POLICY.minAvailableChange).toBeLessThanOrEqual(ADDRESS_POLICY.gapLimit);
      expect(ADDRESS_POLICY.minAvailableChange).toBe(5);
    });
  });

  describe('archived origin is skipped', () => {
    it('does not create any addresses for an archived origin', async () => {
      const archived = makeOrigin({ archivedAt: '2026-01-01T00:00:00.000Z' });
      const { useCase, addressRepo } = createUseCase(
        makeAddressRepo(),
        makeOriginRepo(archived),
      );
      await useCase.execute(WALLET_ID, NETWORK);
      expect(addressRepo.saveMany).not.toHaveBeenCalled();
    });
  });

  describe('specific originId filtering', () => {
    it('only processes the specified origin when originId is provided', async () => {
      const originRepo = makeOriginRepo(makeOrigin());
      const { useCase } = createUseCase(makeAddressRepo(), originRepo);
      await useCase.execute(WALLET_ID, NETWORK, ORIGIN_ID);
      expect(originRepo.findById).toHaveBeenCalledWith(ORIGIN_ID);
      expect(originRepo.findByWallet).not.toHaveBeenCalled();
    });

    it('processes all origins when originId is omitted', async () => {
      const originRepo = makeOriginRepo(makeOrigin());
      const { useCase } = createUseCase(makeAddressRepo(), originRepo);
      await useCase.execute(WALLET_ID, NETWORK);
      expect(originRepo.findByWallet).toHaveBeenCalledWith(WALLET_ID);
    });
  });

  describe('address indices are sequential', () => {
    it('starts from maxIndex+1 when addresses already exist', async () => {
      const existingMax = 4;
      const { useCase, addressRepo } = createUseCase(makeAddressRepo({ countFresh: 1, maxIndex: existingMax }));
      await useCase.execute(WALLET_ID, NETWORK);
      const allSaved = (addressRepo.saveMany as jest.Mock).mock.calls.flatMap(c => c[0]);
      const changeAddrs = allSaved.filter((a: { chain: string }) => a.chain === 'change');
      changeAddrs.forEach((a: { index: number }) => {
        expect(a.index).toBeGreaterThan(existingMax);
      });
    });

    it('starts from index 0 when no addresses exist yet', async () => {
      const { useCase, addressRepo } = createUseCase(makeAddressRepo({ countFresh: 0, maxIndex: -1 }));
      await useCase.execute(WALLET_ID, NETWORK);
      const allSaved = (addressRepo.saveMany as jest.Mock).mock.calls.flatMap(c => c[0]);
      const changeAddrs = allSaved.filter((a: { chain: string }) => a.chain === 'change');
      const indices = changeAddrs.map((a: { index: number }) => a.index).sort((a: number, b: number) => a - b);
      expect(indices[0]).toBe(0);
      expect(indices[indices.length - 1]).toBe(ADDRESS_POLICY.minAvailableChange - 1);
    });
  });
});
