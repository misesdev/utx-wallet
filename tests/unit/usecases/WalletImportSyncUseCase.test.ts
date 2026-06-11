import type { BitcoinNetwork } from '../../../src/core/domain/entities/Network';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';
import type { AddressOrigin } from '../../../src/core/domain/entities/AddressOrigin';
import type { WalletAddress } from '../../../src/core/domain/entities/WalletAddress';
import type { WalletAddressProvider } from '../../../src/core/domain/repositories/WalletAddressProvider';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { TransactionRepository } from '../../../src/core/domain/repositories/TransactionRepository';
import type { UtxoRepository } from '../../../src/core/domain/repositories/UtxoRepository';
import type { WalletAddressRepository } from '../../../src/core/domain/repositories/WalletAddressRepository';
import type { AddressOriginRepository } from '../../../src/core/domain/repositories/AddressOriginRepository';
import type { WalletRepository, RawWalletKey } from '../../../src/core/domain/repositories/WalletRepository';
import type { CreateAddressOriginUseCase } from '../../../src/core/domain/usecases/address/CreateAddressOriginUseCase';
import type { SyncBalanceUseCase } from '../../../src/core/domain/usecases/wallet/SyncBalanceUseCase';
import {
  WalletImportSyncUseCase,
  type ImportSyncProgress,
} from '../../../src/core/domain/usecases/wallet/WalletImportSyncUseCase';
import { DEFAULT_ORIGIN_NAME } from '../../../src/core/domain/entities/AddressOrigin';
import { ADDRESS_POLICY } from '../../../src/core/domain/entities/WalletAddress';
import { AppError } from '../../../src/core/application/errors/AppError';

const WALLET_ID = 'wallet-1';
const NETWORK: BitcoinNetwork = 'testnet';
const POOL_SIZE = ADDRESS_POLICY.minAvailableReceive; // 3

// ─── Factories ────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2),
    txid: 'txid-' + Math.random().toString(36).slice(2),
    amountSats: 100_000,
    direction: 'incoming',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeUtxo(address: string): Utxo {
  return {
    txid: 'utxo-txid-' + Math.random().toString(36).slice(2),
    vout: 0,
    valueSats: 100_000,
    address,
    isConfirmed: true,
  };
}

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

// Address provider returns deterministic addresses keyed by (account, chain, index)
function makeAddressProvider(): WalletAddressProvider {
  return {
    getReceiveAddress: jest.fn(
      async (_w: string, _n: BitcoinNetwork, index: number, account: number) =>
        `receive-${account}-${index}`,
    ),
    getChangeAddress: jest.fn(
      async (_w: string, _n: BitcoinNetwork, index: number, account: number) =>
        `change-${account}-${index}`,
    ),
  };
}

function makeBlockchainProvider(
  txMap: Map<string, Transaction[]> = new Map(),
  utxoMap: Map<string, Utxo[]> = new Map(),
): jest.Mocked<BlockchainProvider> {
  return {
    getTransactions: jest.fn(async (address: string, _network: BitcoinNetwork) => txMap.get(address) ?? []),
    getUtxos: jest.fn(async (address: string, _network: BitcoinNetwork) => utxoMap.get(address) ?? []),
    getBalance: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn(),
  } as jest.Mocked<BlockchainProvider>;
}

function makeTransactionRepository(
  existing: Transaction[] = [],
): jest.Mocked<TransactionRepository> {
  const stored = [...existing];
  return {
    list: jest.fn(async () => stored),
    upsertAll: jest.fn(async (_walletId: string, txs: Transaction[]) => {
      stored.push(...txs);
    }),
    deleteByWallet: jest.fn(),
  } as unknown as jest.Mocked<TransactionRepository>;
}

function makeUtxoRepository(existing: Utxo[] = []): jest.Mocked<UtxoRepository> {
  let stored = [...existing];
  return {
    listByWallet: jest.fn(async () => stored),
    replaceAll: jest.fn(async (_walletId: string, utxos: Utxo[]) => {
      stored = [...utxos];
    }),
    findByAddress: jest.fn(),
    save: jest.fn(),
    deleteByWallet: jest.fn(),
  } as unknown as jest.Mocked<UtxoRepository>;
}

function makeWalletAddressRepository(): jest.Mocked<WalletAddressRepository> {
  const saved: WalletAddress[] = [];
  return {
    saveMany: jest.fn(async (addresses: WalletAddress[]) => {
      saved.push(...addresses);
    }),
    findByWallet: jest.fn(async () => saved),
    countFreshByChain: jest.fn(async () => 0),
    getMaxIndexByChain: jest.fn(async () => -1),
    updateSyncData: jest.fn(),
    deleteByWallet: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<WalletAddressRepository>;
}

function makeOriginRepository(
  existing: AddressOrigin[] = [],
): jest.Mocked<AddressOriginRepository> {
  return {
    findByWallet: jest.fn(async () => existing),
    findById: jest.fn(async () => null),
    findDefault: jest.fn(async () => null),
    getMaxAccountIndex: jest.fn(async () => -1),
    save: jest.fn(),
    archive: jest.fn(),
    deleteByWallet: jest.fn(),
  } as unknown as jest.Mocked<AddressOriginRepository>;
}

function makeCreateOriginUseCase(
  origins: AddressOrigin[] = [],
): jest.Mocked<CreateAddressOriginUseCase> {
  let callIndex = 0;
  const created = [...origins];
  return {
    execute: jest.fn(async (_walletId: string, name: string) => {
      if (callIndex < created.length) return created[callIndex++];
      const origin = makeOrigin(name, callIndex++);
      return origin;
    }),
  } as unknown as jest.Mocked<CreateAddressOriginUseCase>;
}

function makeSyncBalance(): jest.Mocked<SyncBalanceUseCase> {
  return { execute: jest.fn(async () => {}) } as unknown as jest.Mocked<SyncBalanceUseCase>;
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

function makeUseCase(opts: {
  txMap?: Map<string, Transaction[]>;
  utxoMap?: Map<string, Utxo[]>;
  origins?: AddressOrigin[];
  existingTxs?: Transaction[];
  existingUtxos?: Utxo[];
  existingOrigins?: AddressOrigin[];
  walletRepository?: jest.Mocked<WalletRepository> | null;
}): {
  useCase: WalletImportSyncUseCase;
  blockchain: jest.Mocked<BlockchainProvider>;
  txRepo: jest.Mocked<TransactionRepository>;
  utxoRepo: jest.Mocked<UtxoRepository>;
  addressRepo: jest.Mocked<WalletAddressRepository>;
  originRepo: jest.Mocked<AddressOriginRepository>;
  createOrigin: jest.Mocked<CreateAddressOriginUseCase>;
  syncBalance: jest.Mocked<SyncBalanceUseCase>;
} {
  const blockchain = makeBlockchainProvider(opts.txMap, opts.utxoMap);
  const txRepo = makeTransactionRepository(opts.existingTxs);
  const utxoRepo = makeUtxoRepository(opts.existingUtxos);
  const addressRepo = makeWalletAddressRepository();
  const originRepo = makeOriginRepository(opts.existingOrigins);
  const createOrigin = makeCreateOriginUseCase(opts.origins);
  const balance = makeSyncBalance();

  const useCase = new WalletImportSyncUseCase(
    makeAddressProvider(),
    blockchain,
    txRepo,
    utxoRepo,
    addressRepo,
    originRepo,
    createOrigin,
    balance,
    null,
    opts.walletRepository !== undefined ? opts.walletRepository : null,
  );

  return { useCase, blockchain, txRepo, utxoRepo, addressRepo, originRepo, createOrigin, syncBalance: balance };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WalletImportSyncUseCase', () => {
  describe('fresh wallet — no history', () => {
    it('creates Default origin for fresh wallet', async () => {
      const defaultOrigin = makeOrigin(DEFAULT_ORIGIN_NAME, 0);
      const { useCase, createOrigin } = makeUseCase({ origins: [defaultOrigin] });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.origins).toHaveLength(1);
      expect(result.origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
      expect(createOrigin.execute).toHaveBeenCalledWith(WALLET_ID, DEFAULT_ORIGIN_NAME, NETWORK);
    });

    it('returns zero new transactions for a fresh wallet', async () => {
      const { useCase } = makeUseCase({ origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)] });
      const result = await useCase.execute(WALLET_ID, NETWORK);
      expect(result.newTransactions).toBe(0);
    });

    it('returns zero new UTXOs for a fresh wallet', async () => {
      const { useCase } = makeUseCase({ origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)] });
      const result = await useCase.execute(WALLET_ID, NETWORK);
      expect(result.newUtxos).toBe(0);
    });

    it('does not query UTXOs for fresh addresses', async () => {
      const { useCase, blockchain } = makeUseCase({ origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)] });
      await useCase.execute(WALLET_ID, NETWORK);
      expect(blockchain.getUtxos).not.toHaveBeenCalled();
    });
  });

  describe('single account with activity on receive chain', () => {
    // 1 active (index 0) + 3 fresh (1, 2, 3): batch(0-2)→totalFresh=2→batch(3)→totalFresh=3→STOP
    const ACTIVE_ADDRESS = 'receive-0-0';
    const TX = makeTx({ txid: 'tx-abc', address: ACTIVE_ADDRESS });
    const UTXO = makeUtxo(ACTIVE_ADDRESS);

    function buildScenario() {
      const txMap = new Map([[ACTIVE_ADDRESS, [TX]]]);
      const utxoMap = new Map([[ACTIVE_ADDRESS, [UTXO]]]);
      return makeUseCase({
        txMap,
        utxoMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });
    }

    it('queries getTransactions for the active address', async () => {
      const { useCase, blockchain } = buildScenario();
      await useCase.execute(WALLET_ID, NETWORK);
      expect(blockchain.getTransactions).toHaveBeenCalledWith(ACTIVE_ADDRESS, NETWORK);
    });

    it('persists the transaction found', async () => {
      const { useCase, txRepo } = buildScenario();
      await useCase.execute(WALLET_ID, NETWORK);
      expect(txRepo.upsertAll).toHaveBeenCalled();
      const saved = (txRepo.upsertAll as jest.Mock).mock.calls[0][1] as Transaction[];
      expect(saved.some(t => t.txid === TX.txid)).toBe(true);
    });

    it('queries UTXOs only for the active address, not fresh ones', async () => {
      const { useCase, blockchain } = buildScenario();
      await useCase.execute(WALLET_ID, NETWORK);
      expect(blockchain.getUtxos).toHaveBeenCalledWith(ACTIVE_ADDRESS, NETWORK);
      const utxoCalls = (blockchain.getUtxos as jest.Mock).mock.calls.map(c => c[0]);
      expect(utxoCalls.every((addr: string) => addr === ACTIVE_ADDRESS)).toBe(true);
    });

    it('persists UTXOs found at active address', async () => {
      const { useCase, utxoRepo } = buildScenario();
      await useCase.execute(WALLET_ID, NETWORK);
      const savedUtxos = (utxoRepo.replaceAll as jest.Mock).mock.calls[0][1] as Utxo[];
      expect(savedUtxos.some(u => u.txid === UTXO.txid)).toBe(true);
    });

    it('extends the address pool with addresses beyond minPool', async () => {
      const { useCase, addressRepo } = buildScenario();
      await useCase.execute(WALLET_ID, NETWORK);
      const saveCalls = (addressRepo.saveMany as jest.Mock).mock.calls;
      const allSaved = saveCalls.flatMap(([addrs]: [WalletAddress[]]) => addrs);
      const savedIndices = allSaved.map((a: WalletAddress) => a.index);
      expect(savedIndices.some(i => i >= POOL_SIZE)).toBe(true);
    });

    it('marks an active address at index >= poolSize as received status', async () => {
      // Index 0 is handled by createOriginUseCase (mocked), so extendAddressPool skips it.
      // To test status marking we need an active address at index >= minPool (3).
      // Trace: batch1(0-2): addr0 active, addr1/2 fresh → totalFresh=2
      //        batch2(3): addr3 active → totalFresh stays 2
      //        batch3(4): addr4 fresh → totalFresh=3 → STOP
      // addr3 has index≥3 → extendAddressPool saves it with status='received'
      const DEEP_ACTIVE = 'receive-0-3';
      const txMap = new Map([[ACTIVE_ADDRESS, [TX]], [DEEP_ACTIVE, [makeTx()]]]);
      const utxoMap = new Map([[ACTIVE_ADDRESS, [UTXO]]]);
      const { useCase, addressRepo } = makeUseCase({
        txMap,
        utxoMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      const allSaved = (addressRepo.saveMany as jest.Mock).mock.calls
        .flatMap(([addrs]: [WalletAddress[]]) => addrs);
      const deepAddr = allSaved.find((a: WalletAddress) => a.address === DEEP_ACTIVE);
      expect(deepAddr?.status).toBe('received');
    });

    it('counts the transaction as new', async () => {
      const { useCase } = buildScenario();
      const result = await useCase.execute(WALLET_ID, NETWORK);
      expect(result.newTransactions).toBe(1);
    });

    it('counts the UTXO as new', async () => {
      const { useCase } = buildScenario();
      const result = await useCase.execute(WALLET_ID, NETWORK);
      expect(result.newUtxos).toBe(1);
    });

    it('calls syncBalance after UTXO sync', async () => {
      const { useCase, syncBalance } = buildScenario();
      await useCase.execute(WALLET_ID, NETWORK);
      expect(syncBalance.execute).toHaveBeenCalledWith(WALLET_ID);
    });
  });

  describe('multiple accounts discovered', () => {
    it('creates two origins when account 1 has activity', async () => {
      const txMap = new Map([
        ['receive-0-0', [makeTx()]],
        ['receive-1-0', [makeTx()]],
      ]);
      const { useCase, createOrigin } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0), makeOrigin('Account 1', 1)],
      });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.origins).toHaveLength(2);
      expect(createOrigin.execute).toHaveBeenCalledTimes(2);
      expect(createOrigin.execute).toHaveBeenNthCalledWith(1, WALLET_ID, DEFAULT_ORIGIN_NAME, NETWORK);
      expect(createOrigin.execute).toHaveBeenNthCalledWith(2, WALLET_ID, 'Account 1', NETWORK);
    });

    it('stops discovering when the next account has no activity', async () => {
      const txMap = new Map([['receive-0-0', [makeTx()]]]);
      const { useCase, createOrigin } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      expect(createOrigin.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('change chain scanning', () => {
    it('scans change chain in parallel and finds UTXOs there', async () => {
      const CHANGE_ADDR = 'change-0-0';
      const TX = makeTx({ address: CHANGE_ADDR, direction: 'outgoing' });
      const UTXO = makeUtxo(CHANGE_ADDR);
      const txMap = new Map([
        ['receive-0-0', [makeTx()]],
        [CHANGE_ADDR, [TX]],
      ]);
      const utxoMap = new Map([[CHANGE_ADDR, [UTXO]]]);
      const { useCase, blockchain, utxoRepo } = makeUseCase({
        txMap,
        utxoMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      expect(blockchain.getTransactions).toHaveBeenCalledWith(CHANGE_ADDR, NETWORK);
      expect(blockchain.getUtxos).toHaveBeenCalledWith(CHANGE_ADDR, NETWORK);
      const savedUtxos = (utxoRepo.replaceAll as jest.Mock).mock.calls[0][1] as Utxo[];
      expect(savedUtxos.some(u => u.txid === UTXO.txid)).toBe(true);
    });
  });

  describe('transaction deduplication', () => {
    it('merges outgoing + incoming of the same txid into a net outgoing amount', async () => {
      const txid = 'shared-txid';
      const ADDR_A = 'receive-0-0';
      const ADDR_B = 'change-0-0';
      const outTx = makeTx({ txid, address: ADDR_A, direction: 'outgoing', amountSats: 50_000 });
      const inTx  = makeTx({ txid, address: ADDR_B, direction: 'incoming', amountSats: 10_000 });
      const txMap = new Map([[ADDR_A, [outTx]], [ADDR_B, [inTx]]]);
      const { useCase, txRepo } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      const allSaved = (txRepo.upsertAll as jest.Mock).mock.calls
        .flatMap(([_id, txs]: [string, Transaction[]]) => txs);
      const merged = allSaved.filter((t: Transaction) => t.txid === txid);
      expect(merged).toHaveLength(1);
      expect(merged[0].direction).toBe('outgoing');
      expect(merged[0].amountSats).toBe(40_000);
    });
  });

  describe('progress reporting', () => {
    it('emits discovering phase events during address scan', async () => {
      const { useCase } = makeUseCase({ origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)] });
      const events: ImportSyncProgress[] = [];

      await useCase.execute(WALLET_ID, NETWORK, (p) => events.push(p));

      expect(events.filter(e => e.phase === 'discovering').length).toBeGreaterThan(0);
    });

    it('emits a syncing phase event before UTXO sync when activity exists', async () => {
      const ADDR = 'receive-0-0';
      const txMap = new Map([[ADDR, [makeTx()]]]);
      const utxoMap = new Map([[ADDR, [makeUtxo(ADDR)]]]);
      const { useCase } = makeUseCase({
        txMap,
        utxoMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });
      const events: ImportSyncProgress[] = [];

      await useCase.execute(WALLET_ID, NETWORK, (p) => events.push(p));

      expect(events.find(e => e.phase === 'syncing')).toBeDefined();
    });

    it('emits txFound=true for addresses with transactions', async () => {
      const ADDR = 'receive-0-0';
      const txMap = new Map([[ADDR, [makeTx()]]]);
      const { useCase } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });
      const events: ImportSyncProgress[] = [];

      await useCase.execute(WALLET_ID, NETWORK, (p) => events.push(p));

      const found = events.find(e => e.phase === 'discovering' && e.txFound);
      expect(found).toBeDefined();
      expect(found?.addressIndex).toBe(0);
    });
  });

  describe('idempotency — re-import of already-created origin', () => {
    it('returns existing origin when createOriginUseCase throws ORIGIN_EXISTS', async () => {
      const existingOrigin = makeOrigin(DEFAULT_ORIGIN_NAME, 0);
      const txMap = new Map([['receive-0-0', [makeTx()]]]);
      const originRepo = makeOriginRepository([existingOrigin]);
      const createOrigin = {
        execute: jest.fn().mockRejectedValue(
          new AppError('Origin "Default" already exists', 'ORIGIN_EXISTS'),
        ),
      } as unknown as jest.Mocked<CreateAddressOriginUseCase>;

      const useCase = new WalletImportSyncUseCase(
        makeAddressProvider(),
        makeBlockchainProvider(txMap),
        makeTransactionRepository(),
        makeUtxoRepository(),
        makeWalletAddressRepository(),
        originRepo,
        createOrigin,
        makeSyncBalance(),
      );

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.origins).toHaveLength(1);
      expect(result.origins[0].id).toBe(existingOrigin.id);
    });
  });

  describe('adaptive batch behaviour (totalFresh pool-policy stopping condition)', () => {
    it('scans exactly poolSize (3) addresses on a fresh receive chain', async () => {
      // Fresh wallet: all addresses empty → each chain stops at totalFresh = poolSize (3)
      // Batch1 (indices 0-2): all fresh → totalFresh=3 → STOP
      const { useCase, blockchain } = makeUseCase({
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      const receiveCalls = (blockchain.getTransactions as jest.Mock).mock.calls
        .filter(([addr]: [string]) => addr.startsWith('receive-0-'));
      expect(receiveCalls).toHaveLength(POOL_SIZE); // 3
    });

    it('scans poolSize more addresses beyond the last active one', async () => {
      // Active at receive-0-0: batch(0-2) → totalFresh=2; toGenerate=1 → batch(3) → totalFresh=3 → STOP
      // Total: 4 receive chain calls (1 active + 3 fresh)
      const txMap = new Map([['receive-0-0', [makeTx()]]]);
      const { useCase, blockchain } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      const receiveCalls = (blockchain.getTransactions as jest.Mock).mock.calls
        .filter(([addr]: [string]) => addr.startsWith('receive-0-'));
      // 1 active + 3 fresh = 4 total
      expect(receiveCalls.length).toBe(POOL_SIZE + 1);
    });

    it('counts non-consecutive fresh addresses — avoids over-scanning when early addresses are fresh', async () => {
      // Scenario: indices 0=fresh, 1=fresh, 2=active, 3=fresh
      // totalFresh: batch(0-2) → totalFresh=2; toGenerate=1 → batch(3) → totalFresh=3 → STOP (4 calls)
      // Old tailFresh: batch(0-2) → tailFresh=1 (reset at 2); toGenerate=2 → batch(3-4) → tailFresh=2;
      //               toGenerate=1 → batch(5) → tailFresh=3 → STOP (6 calls)
      const txMap = new Map([['receive-0-2', [makeTx()]]]);
      const { useCase, blockchain } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      const receiveCalls = (blockchain.getTransactions as jest.Mock).mock.calls
        .filter(([addr]: [string]) => addr.startsWith('receive-0-'));
      // Indices 0(fresh), 1(fresh), 2(active), 3(fresh) → STOP at 4 — not 6
      expect(receiveCalls.length).toBe(4);
    });

    it('policy already satisfied: [fresh,fresh,active,fresh] stops at 4, not 6', async () => {
      // This is the canonical user scenario: addr1=unused, addr2=unused, addr3=used, addr4=unused
      // totalFresh=2 after first batch (indices 0,1 fresh, index 2 active) → toGenerate=1
      // After index 3 (fresh) → totalFresh=3 → STOP
      const txMap = new Map([['receive-0-2', [makeTx()]]]);
      const { useCase, blockchain } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      const receiveCalls = (blockchain.getTransactions as jest.Mock).mock.calls
        .filter(([addr]: [string]) => addr.startsWith('receive-0-'));
      // Policy (3 fresh) satisfied by indices 0, 1, 3 — no extra scanning needed
      expect(receiveCalls.length).toBe(4); // NOT 6
    });

    it('scans the correct number of addresses for a deep change chain', async () => {
      // 8 active change addresses (0-7) + 3 fresh (8-10)
      // batch(0-2): 3 active → batch(3-5): 3 active → batch(6-8): 2 active + 1 fresh → totalFresh=1
      // toGenerate=2 → batch(9-10): 2 fresh → totalFresh=3 → STOP
      // Total: 11 change addresses
      const txMap = new Map(
        Array.from({ length: 8 }, (_, i) => [`change-0-${i}`, [makeTx()]] as [string, Transaction[]]),
      );
      const { useCase, blockchain } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      const changeCalls = (blockchain.getTransactions as jest.Mock).mock.calls
        .filter(([addr]: [string]) => addr.startsWith('change-0-'));
      // 8 active + 3 fresh = 11
      expect(changeCalls.length).toBe(11);
    });

    it('batches are queried in parallel within each iteration', async () => {
      // All 3 addresses in the first batch (0, 1, 2) must be requested together
      const { useCase, blockchain } = makeUseCase({
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
      });

      await useCase.execute(WALLET_ID, NETWORK);

      const receiveCalls = (blockchain.getTransactions as jest.Mock).mock.calls
        .filter(([addr]: [string]) => addr.startsWith('receive-0-'))
        .map(([addr]: [string]) => addr);
      expect(receiveCalls).toContain('receive-0-0');
      expect(receiveCalls).toContain('receive-0-1');
      expect(receiveCalls).toContain('receive-0-2');
    });
  });

  describe('error resilience', () => {
    it('treats getTransactions errors as no-activity and continues scanning', async () => {
      const blockchain = makeBlockchainProvider();
      (blockchain.getTransactions as jest.Mock).mockRejectedValueOnce(new Error('timeout'));

      const useCase = new WalletImportSyncUseCase(
        makeAddressProvider(),
        blockchain,
        makeTransactionRepository(),
        makeUtxoRepository(),
        makeWalletAddressRepository(),
        makeOriginRepository(),
        makeCreateOriginUseCase([makeOrigin(DEFAULT_ORIGIN_NAME, 0)]),
        makeSyncBalance(),
      );

      await expect(useCase.execute(WALLET_ID, NETWORK)).resolves.toBeDefined();
    });

    it('skips failed UTXO queries and returns partial results', async () => {
      const ADDR_A = 'receive-0-0';
      const ADDR_B = 'change-0-0';
      const UTXO_A = makeUtxo(ADDR_A);
      const txMap = new Map([
        [ADDR_A, [makeTx({ address: ADDR_A })]],
        [ADDR_B, [makeTx({ address: ADDR_B })]],
      ]);
      const blockchain = makeBlockchainProvider(txMap);
      // Set ordering: ADDR_A added first (receive chain scanned first)
      (blockchain.getUtxos as jest.Mock)
        .mockResolvedValueOnce([UTXO_A])
        .mockRejectedValueOnce(new Error('API error'));

      const useCase = new WalletImportSyncUseCase(
        makeAddressProvider(),
        blockchain,
        makeTransactionRepository(),
        makeUtxoRepository(),
        makeWalletAddressRepository(),
        makeOriginRepository(),
        makeCreateOriginUseCase([makeOrigin(DEFAULT_ORIGIN_NAME, 0)]),
        makeSyncBalance(),
      );

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.newUtxos).toBe(1);
    });
  });

  describe('watch-only wallet (zpub/vpub secret) — single account only', () => {
    const ZPUB_SECRET = 'zpub6rFR7y4Q2AijBEexyz'; // dummy zpub prefix for test

    it('creates only the Default origin for a watch-only wallet even when addresses appear active', async () => {
      // All receive-0-* and receive-1-* have transactions — without the guard,
      // the loop would create origins for accounts 0 and 1 (and more).
      const txMap = new Map([
        ['receive-0-0', [makeTx()]],
        ['receive-1-0', [makeTx()]],
        ['receive-2-0', [makeTx()]],
      ]);
      const walletRepo = makeWalletRepository({ secret: ZPUB_SECRET });
      const { useCase, createOrigin } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
        walletRepository: walletRepo,
      });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.origins).toHaveLength(1);
      expect(result.origins[0].name).toBe(DEFAULT_ORIGIN_NAME);
      expect(createOrigin.execute).toHaveBeenCalledTimes(1);
    });

    it('still syncs transactions found on account 0 for a watch-only wallet', async () => {
      const TX = makeTx({ txid: 'tx-watch-only' });
      const UTXO = makeUtxo('receive-0-0');
      const txMap = new Map([['receive-0-0', [TX]]]);
      const utxoMap = new Map([['receive-0-0', [UTXO]]]);
      const walletRepo = makeWalletRepository({ secret: ZPUB_SECRET });
      const { useCase, txRepo, utxoRepo } = makeUseCase({
        txMap,
        utxoMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0)],
        walletRepository: walletRepo,
      });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.newTransactions).toBe(1);
      expect(result.newUtxos).toBe(1);
      expect(txRepo.upsertAll).toHaveBeenCalled();
      const saved = (txRepo.upsertAll as jest.Mock).mock.calls[0][1] as Transaction[];
      expect(saved.some(t => t.txid === TX.txid)).toBe(true);
      const savedUtxos = (utxoRepo.replaceAll as jest.Mock).mock.calls[0][1] as Utxo[];
      expect(savedUtxos.some(u => u.txid === UTXO.txid)).toBe(true);
    });

    it('behaves as normal multi-account when walletRepository is not provided', async () => {
      const txMap = new Map([
        ['receive-0-0', [makeTx()]],
        ['receive-1-0', [makeTx()]],
      ]);
      // No walletRepository → falls back to default MAX_ACCOUNTS behaviour
      const { useCase, createOrigin } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0), makeOrigin('Account 1', 1)],
      });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.origins).toHaveLength(2);
      expect(createOrigin.execute).toHaveBeenCalledTimes(2);
    });

    it('returns false for isWatchOnly when walletRepository returns null', async () => {
      // walletRepository present but returns null key → treated as non-watch-only
      const walletRepo = makeWalletRepository(null);
      const txMap = new Map([
        ['receive-0-0', [makeTx()]],
        ['receive-1-0', [makeTx()]],
      ]);
      const { useCase, createOrigin } = makeUseCase({
        txMap,
        origins: [makeOrigin(DEFAULT_ORIGIN_NAME, 0), makeOrigin('Account 1', 1)],
        walletRepository: walletRepo,
      });

      const result = await useCase.execute(WALLET_ID, NETWORK);

      expect(result.origins).toHaveLength(2);
      expect(createOrigin.execute).toHaveBeenCalledTimes(2);
    });
  });
});
