/**
 * Integration: HD Address Manager
 *
 * Validates the complete HD address management policy:
 * - Origin creation (default + custom)
 * - Pool management (min 3 fresh receive + 3 fresh change per origin)
 * - BIP84 derivation path format
 * - Deterministic address derivation via bitcoin-tx-lib
 * - Status transitions (fresh → reserved → received → spent_once / change / inconsistent)
 * - CoinSelection address-grouping rule
 * - Multi-origin independence
 */
import { HDWallet } from 'bitcoin-tx-lib';
import { WalletKeyStorage } from '../../src/core/infrastructure/storage/WalletKeyStorage';
import { WalletStorage } from '../../src/core/infrastructure/storage/WalletStorage';
import { WalletRepositoryImpl } from '../../src/core/infrastructure/repositories/WalletRepositoryImpl';
import { WalletAddressStorage } from '../../src/core/infrastructure/storage/WalletAddressStorage';
import { AddressOriginStorage } from '../../src/core/infrastructure/storage/AddressOriginStorage';
import { WalletAddressRepositoryImpl } from '../../src/core/infrastructure/repositories/WalletAddressRepositoryImpl';
import { AddressOriginRepositoryImpl } from '../../src/core/infrastructure/repositories/AddressOriginRepositoryImpl';
import { WalletKeyAddressProvider } from '../../src/core/infrastructure/adapters/WalletKeyAddressProvider';
import { ImportWalletUseCase } from '../../src/core/domain/usecases/wallet/ImportWalletUseCase';
import { CreateAddressOriginUseCase } from '../../src/core/domain/usecases/address/CreateAddressOriginUseCase';
import { ListAddressOriginsUseCase } from '../../src/core/domain/usecases/address/ListAddressOriginsUseCase';
import { GetNextReceiveAddressUseCase } from '../../src/core/domain/usecases/address/GetNextReceiveAddressUseCase';
import { GetNextChangeAddressUseCase } from '../../src/core/domain/usecases/address/GetNextChangeAddressUseCase';
import { EnsureAddressPoolUseCase } from '../../src/core/domain/usecases/address/EnsureAddressPoolUseCase';
import { SyncAddressStatusUseCase } from '../../src/core/domain/usecases/address/SyncAddressStatusUseCase';
import { CoinSelectionService } from '../../src/core/domain/services/CoinSelectionService';
import { FeeEstimationService } from '../../src/core/domain/services/FeeEstimationService';
import { UtxoRepositoryImpl } from '../../src/core/infrastructure/repositories/UtxoRepositoryImpl';
import { UtxoStorage } from '../../src/core/infrastructure/storage/UtxoStorage';
import type { BlockchainProvider } from '../../src/core/domain/repositories/BlockchainProvider';
import type { Utxo } from '../../src/core/domain/entities/Utxo';
import type { Transaction } from '../../src/core/domain/entities/Transaction';
import { createSecureStorageMock } from '../mocks/storage';
import { InMemoryDatabase } from './helpers/InMemoryDatabase';
import { DEFAULT_ORIGIN_NAME } from '../../src/core/domain/entities/AddressOrigin';

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function deriveAddress(index: number, opts: { change: 0 | 1; account?: number } = { change: 0 }) {
  const { wallet } = HDWallet.import(TEST_MNEMONIC, undefined, {
    network: 'testnet',
    purpose: 84,
  });
  return wallet.getAddress(index, { account: opts.account ?? 0, change: opts.change });
}

function makeBlockchainProvider(
  utxosPerAddress: Map<string, Utxo[]> = new Map(),
  txsPerAddress: Map<string, Transaction[]> = new Map(),
): BlockchainProvider {
  return {
    getUtxos: jest.fn(async (address: string) => utxosPerAddress.get(address) ?? []),
    getTransactions: jest.fn(async (address: string) => txsPerAddress.get(address) ?? []),
    getBalance: jest.fn(async () => ({ confirmedSats: 0, unconfirmedSats: 0 })),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(async () => 0),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
  } as unknown as BlockchainProvider;
}

function makeSetup() {
  const secureStorage = createSecureStorageMock();
  const db = new InMemoryDatabase();

  const walletKeyStorage = new WalletKeyStorage(secureStorage);
  const walletStorage = new WalletStorage(secureStorage);
  const walletRepository = new WalletRepositoryImpl(walletStorage, walletKeyStorage);
  const walletAddressProvider = new WalletKeyAddressProvider(walletKeyStorage);

  const walletAddressStorage = new WalletAddressStorage(db);
  const addressOriginStorage = new AddressOriginStorage(db);
  const walletAddressRepository = new WalletAddressRepositoryImpl(walletAddressStorage);
  const addressOriginRepository = new AddressOriginRepositoryImpl(addressOriginStorage);
  const utxoStorage = new UtxoStorage(db);
  const utxoRepository = new UtxoRepositoryImpl(utxoStorage);

  const ensureAddressPool = new EnsureAddressPoolUseCase(
    walletAddressRepository,
    addressOriginRepository,
    walletAddressProvider,
  );
  const createOrigin = new CreateAddressOriginUseCase(
    addressOriginRepository,
    walletAddressRepository,
    walletAddressProvider,
  );
  const listOrigins = new ListAddressOriginsUseCase(addressOriginRepository);
  const getNextReceive = new GetNextReceiveAddressUseCase(
    walletAddressRepository,
    addressOriginRepository,
    ensureAddressPool,
  );
  const getNextChange = new GetNextChangeAddressUseCase(
    walletAddressRepository,
    addressOriginRepository,
    ensureAddressPool,
  );

  const importWallet = new ImportWalletUseCase(walletRepository);

  const feeEstimation = new FeeEstimationService();
  const coinSelection = new CoinSelectionService(feeEstimation);

  return {
    importWallet,
    createOrigin,
    listOrigins,
    getNextReceive,
    getNextChange,
    ensureAddressPool,
    walletAddressRepository,
    addressOriginRepository,
    utxoRepository,
    coinSelection,
    walletAddressProvider,
    makeSyncAddressStatus: (blockchain: BlockchainProvider) =>
      new SyncAddressStatusUseCase(
        walletAddressRepository,
        addressOriginRepository,
        utxoRepository,
        blockchain,
        ensureAddressPool,
      ),
  };
}

describe('Integration: HD Address Manager', () => {
  // ── 1. Origin creation ────────────────────────────────────────────────────

  it('creates Default origin with accountIndex=0', async () => {
    const { importWallet, createOrigin } = makeSetup();
    const wallet = await importWallet.execute('W1', TEST_MNEMONIC);

    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    expect(origin.name).toBe(DEFAULT_ORIGIN_NAME);
    expect(origin.type).toBe('default');
    expect(origin.accountIndex).toBe(0);
    expect(origin.walletId).toBe(wallet.id);
  });

  it('assigns sequential accountIndex to custom origins', async () => {
    const { importWallet, createOrigin } = makeSetup();
    const wallet = await importWallet.execute('W2', TEST_MNEMONIC);

    const o0 = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');
    const o1 = await createOrigin.execute(wallet.id, 'BIPA', 'testnet4');
    const o2 = await createOrigin.execute(wallet.id, 'Binance', 'testnet4');

    expect(o0.accountIndex).toBe(0);
    expect(o1.accountIndex).toBe(1);
    expect(o2.accountIndex).toBe(2);
  });

  it('rejects origin with duplicate name within wallet', async () => {
    const { importWallet, createOrigin } = makeSetup();
    const wallet = await importWallet.execute('W3', TEST_MNEMONIC);

    await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    await expect(
      createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4'),
    ).rejects.toMatchObject({ code: 'ORIGIN_EXISTS' });
  });

  it('rejects origin with empty name', async () => {
    const { importWallet, createOrigin } = makeSetup();
    const wallet = await importWallet.execute('W4', TEST_MNEMONIC);

    await expect(createOrigin.execute(wallet.id, '   ', 'testnet4')).rejects.toMatchObject({
      code: 'INVALID_ORIGIN_NAME',
    });
  });

  // ── 2. Pool management ────────────────────────────────────────────────────

  it('initialises pool with 3 fresh receive + 5 fresh change on origin creation', async () => {
    const { importWallet, createOrigin, walletAddressRepository } = makeSetup();
    const wallet = await importWallet.execute('W5', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const freshReceive = await walletAddressRepository.countFreshByChain(wallet.id, origin.id, 'receive');
    const freshChange = await walletAddressRepository.countFreshByChain(wallet.id, origin.id, 'change');

    expect(freshReceive).toBe(3);
    expect(freshChange).toBe(5); // minAvailableChange=5 > minAvailableReceive=3
  });

  it('EnsureAddressPool replenishes receive to minimum after reserving', async () => {
    const { importWallet, createOrigin, getNextReceive, walletAddressRepository } = makeSetup();
    const wallet = await importWallet.execute('W6', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    // Reserve all 3 fresh receive addresses
    await getNextReceive.execute(wallet.id, 'testnet4', origin.id, true);
    await getNextReceive.execute(wallet.id, 'testnet4', origin.id, true);
    await getNextReceive.execute(wallet.id, 'testnet4', origin.id, true);

    const freshReceive = await walletAddressRepository.countFreshByChain(wallet.id, origin.id, 'receive');
    expect(freshReceive).toBe(3); // replenished back to 3
  });

  it('EnsureAddressPool replenishes change pool back to minAvailableChange (5) after reservation', async () => {
    const { importWallet, createOrigin, getNextChange, walletAddressRepository } = makeSetup();
    const wallet = await importWallet.execute('W7', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    // Reserve 3 change addresses; each reservation triggers ensureAddressPool which
    // replenishes back to minAvailableChange=5 so the pool always stays full
    await getNextChange.execute(wallet.id, 'testnet4', origin.id, true);
    await getNextChange.execute(wallet.id, 'testnet4', origin.id, true);
    await getNextChange.execute(wallet.id, 'testnet4', origin.id, true);

    const freshChange = await walletAddressRepository.countFreshByChain(wallet.id, origin.id, 'change');
    expect(freshChange).toBe(5);
  });

  // ── 3. Address selection rules ────────────────────────────────────────────

  it('GetNextReceiveAddress returns the lowest-index fresh address', async () => {
    const { importWallet, createOrigin, getNextReceive } = makeSetup();
    const wallet = await importWallet.execute('W8', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addr = await getNextReceive.execute(wallet.id, 'testnet4', origin.id);
    expect(addr.index).toBe(0);
    expect(addr.chain).toBe('receive');
  });

  it('GetNextReceiveAddress reserve=true marks address as reserved', async () => {
    const { importWallet, createOrigin, getNextReceive, walletAddressRepository } = makeSetup();
    const wallet = await importWallet.execute('W9', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addr = await getNextReceive.execute(wallet.id, 'testnet4', origin.id, true);
    expect(addr.status).toBe('reserved');

    const stored = await walletAddressRepository.findByAddress(addr.address);
    expect(stored?.status).toBe('reserved');
  });

  it('GetNextReceiveAddress successive calls return sequential indices after reserving', async () => {
    const { importWallet, createOrigin, getNextReceive } = makeSetup();
    const wallet = await importWallet.execute('W10', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const a0 = await getNextReceive.execute(wallet.id, 'testnet4', origin.id, true);
    const a1 = await getNextReceive.execute(wallet.id, 'testnet4', origin.id, true);
    const a2 = await getNextReceive.execute(wallet.id, 'testnet4', origin.id, true);

    expect(a0.index).toBe(0);
    expect(a1.index).toBe(1);
    expect(a2.index).toBe(2);
    expect(a0.address).not.toBe(a1.address);
    expect(a1.address).not.toBe(a2.address);
  });

  it('GetNextChangeAddress returns address from change chain', async () => {
    const { importWallet, createOrigin, getNextChange } = makeSetup();
    const wallet = await importWallet.execute('W11', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addr = await getNextChange.execute(wallet.id, 'testnet4', origin.id);
    expect(addr.chain).toBe('change');
    expect(addr.index).toBe(0);
  });

  it('uses Default origin when no originId is provided', async () => {
    const { importWallet, createOrigin, getNextReceive } = makeSetup();
    const wallet = await importWallet.execute('W12', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addr = await getNextReceive.execute(wallet.id, 'testnet4', undefined);
    expect(addr.originId).toBe(origin.id);
  });

  // ── 4. BIP84 derivation path ──────────────────────────────────────────────

  it('receive address has correct BIP84 path: m/84\'/1\'/0\'/0/0 for testnet4 account 0', async () => {
    const { importWallet, createOrigin, getNextReceive } = makeSetup();
    const wallet = await importWallet.execute('W13', TEST_MNEMONIC);
    await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addr = await getNextReceive.execute(wallet.id, 'testnet4');
    expect(addr.path).toBe("m/84'/1'/0'/0/0");
  });

  it('change address has correct BIP84 path: m/84\'/1\'/0\'/1/0 for testnet4 account 0', async () => {
    const { importWallet, createOrigin, getNextChange } = makeSetup();
    const wallet = await importWallet.execute('W14', TEST_MNEMONIC);
    await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addr = await getNextChange.execute(wallet.id, 'testnet4');
    expect(addr.path).toBe("m/84'/1'/0'/1/0");
  });

  it('custom origin address uses correct accountIndex in path', async () => {
    const { importWallet, createOrigin, getNextReceive } = makeSetup();
    const wallet = await importWallet.execute('W15', TEST_MNEMONIC);
    await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');
    const bipa = await createOrigin.execute(wallet.id, 'BIPA', 'testnet4');

    const addr = await getNextReceive.execute(wallet.id, 'testnet4', bipa.id);
    expect(addr.path).toBe("m/84'/1'/1'/0/0");
    expect(addr.accountIndex).toBe(1);
  });

  // ── 5. Deterministic derivation ───────────────────────────────────────────

  it('derives the correct address matching bitcoin-tx-lib for account 0 receive index 0', async () => {
    const { importWallet, createOrigin, getNextReceive } = makeSetup();
    const wallet = await importWallet.execute('W16', TEST_MNEMONIC);
    await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addr = await getNextReceive.execute(wallet.id, 'testnet4');
    const expected = deriveAddress(0, { change: 0, account: 0 });
    expect(addr.address).toBe(expected);
  });

  it('derives correct addresses for custom origin account 1', async () => {
    const { importWallet, createOrigin, getNextReceive } = makeSetup();
    const wallet = await importWallet.execute('W17', TEST_MNEMONIC);
    await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');
    const custom = await createOrigin.execute(wallet.id, 'Custom', 'testnet4');

    const addr = await getNextReceive.execute(wallet.id, 'testnet4', custom.id);
    const expected = deriveAddress(0, { change: 0, account: 1 });
    expect(addr.address).toBe(expected);
    expect(addr.address).not.toBe(deriveAddress(0, { change: 0, account: 0 }));
  });

  // ── 6. Address status sync ────────────────────────────────────────────────

  it('SyncAddressStatus keeps fresh status when no transactions', async () => {
    const { importWallet, createOrigin, walletAddressRepository, makeSyncAddressStatus } = makeSetup();
    const wallet = await importWallet.execute('W18', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const blockchain = makeBlockchainProvider();
    const sync = makeSyncAddressStatus(blockchain);
    await sync.execute(wallet.id, 'testnet4');

    const addrs = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    expect(addrs.every(a => a.status === 'fresh')).toBe(true);
  });

  it('SyncAddressStatus marks receive address as received when only incoming txs', async () => {
    const { importWallet, createOrigin, walletAddressRepository, makeSyncAddressStatus } = makeSetup();
    const wallet = await importWallet.execute('W19', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addrs = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const receiveAddr = addrs.find(a => a.chain === 'receive')!;

    const txsMap = new Map<string, Transaction[]>([
      [receiveAddr.address, [{ id: 'tx1', txid: 'tx1', amountSats: 10000, direction: 'incoming', status: 'confirmed', createdAt: new Date().toISOString() }]],
    ]);
    const blockchain = makeBlockchainProvider(new Map(), txsMap);
    const sync = makeSyncAddressStatus(blockchain);
    await sync.execute(wallet.id, 'testnet4');

    const updated = await walletAddressRepository.findByAddress(receiveAddr.address);
    expect(updated?.status).toBe('received');
    expect(updated?.incomingTxCount).toBe(1);
    expect(updated?.totalReceivedSats).toBe(10000);
  });

  it('SyncAddressStatus marks receive address as spent_once when outgoing tx exists', async () => {
    const { importWallet, createOrigin, walletAddressRepository, makeSyncAddressStatus } = makeSetup();
    const wallet = await importWallet.execute('W20', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addrs = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const receiveAddr = addrs.find(a => a.chain === 'receive')!;

    const txsMap = new Map<string, Transaction[]>([
      [receiveAddr.address, [
        { id: 'tx1', txid: 'tx1', amountSats: 10000, direction: 'incoming', status: 'confirmed', createdAt: new Date().toISOString() },
        { id: 'tx2', txid: 'tx2', amountSats: 10000, direction: 'outgoing', status: 'confirmed', createdAt: new Date().toISOString() },
      ]],
    ]);
    const blockchain = makeBlockchainProvider(new Map(), txsMap);
    const sync = makeSyncAddressStatus(blockchain);
    await sync.execute(wallet.id, 'testnet4');

    const updated = await walletAddressRepository.findByAddress(receiveAddr.address);
    expect(updated?.status).toBe('spent_once');
  });

  it('SyncAddressStatus marks address as "received" when spent but still holds UTXOs (partial spend)', async () => {
    // A receive address that has both outgoing txs and remaining UTXOs represents a
    // partial spend (e.g. two UTXOs received, one spent). The address still holds funds
    // and should be reachable as "received", not permanently stuck as "inconsistent".
    const { importWallet, createOrigin, walletAddressRepository, utxoRepository, makeSyncAddressStatus } = makeSetup();
    const wallet = await importWallet.execute('W21', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addrs = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const receiveAddr = addrs.find(a => a.chain === 'receive')!;

    // Store a UTXO for this address (remaining unspent output)
    await utxoRepository.replaceAll(wallet.id, [
      { txid: 'utxo1', vout: 0, valueSats: 5000, address: receiveAddr.address, isConfirmed: true },
    ]);

    // Also has an outgoing transaction (one of multiple UTXOs was spent as input)
    const txsMap = new Map<string, Transaction[]>([
      [receiveAddr.address, [
        { id: 'tx1', txid: 'tx1', amountSats: 10000, direction: 'outgoing', status: 'confirmed', createdAt: new Date().toISOString() },
      ]],
    ]);
    const blockchain = makeBlockchainProvider(new Map(), txsMap);
    const sync = makeSyncAddressStatus(blockchain);
    await sync.execute(wallet.id, 'testnet4');

    const updated = await walletAddressRepository.findByAddress(receiveAddr.address);
    expect(updated?.status).toBe('received');
  });

  it('SyncAddressStatus marks change address as change when it has incoming txs', async () => {
    const { importWallet, createOrigin, walletAddressRepository, makeSyncAddressStatus } = makeSetup();
    const wallet = await importWallet.execute('W22', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addrs = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const changeAddr = addrs.find(a => a.chain === 'change')!;

    const txsMap = new Map<string, Transaction[]>([
      [changeAddr.address, [
        { id: 'tx1', txid: 'tx1', amountSats: 3000, direction: 'incoming', status: 'confirmed', createdAt: new Date().toISOString() },
      ]],
    ]);
    const blockchain = makeBlockchainProvider(new Map(), txsMap);
    const sync = makeSyncAddressStatus(blockchain);
    await sync.execute(wallet.id, 'testnet4');

    const updated = await walletAddressRepository.findByAddress(changeAddr.address);
    expect(updated?.status).toBe('change');
  });

  it('SyncAddressStatus keeps pool satisfied when received addresses cover the minimum', async () => {
    // After 2 of 3 initial receive addresses become `received`, the pool
    // (fresh + received = 1 + 2 = 3) is still at the minimum — no new fresh addresses needed.
    const { importWallet, createOrigin, walletAddressRepository, makeSyncAddressStatus } = makeSetup();
    const wallet = await importWallet.execute('W23', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addrs = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const receiveAddrs = addrs.filter(a => a.chain === 'receive').slice(0, 2);
    const txsMap = new Map<string, Transaction[]>(
      receiveAddrs.map(a => [a.address, [{ id: 'tx-' + a.index, txid: 'tx-' + a.index, amountSats: 1000, direction: 'incoming' as const, status: 'confirmed' as const, createdAt: new Date().toISOString() }]])
    );
    const blockchain = makeBlockchainProvider(new Map(), txsMap);
    const sync = makeSyncAddressStatus(blockchain);
    await sync.execute(wallet.id, 'testnet4');

    // `received` addresses (key not exposed) still count toward the pool
    const allAfterSync = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const receiveAvailable = allAfterSync.filter(
      a => a.chain === 'receive' && (a.status === 'fresh' || a.status === 'received'),
    );
    expect(receiveAvailable.length).toBeGreaterThanOrEqual(3);
  });

  it('received address is returned by GetNextReceiveAddress when it has the lowest index', async () => {
    // After addr0 receives payment (status=received), it still has a lower index than
    // addr1 and addr2 (both fresh) — it must be returned as the next receive address.
    const { importWallet, createOrigin, getNextReceive, walletAddressRepository, makeSyncAddressStatus } = makeSetup();
    const wallet = await importWallet.execute('W26', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addrs = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const addr0 = addrs.find(a => a.chain === 'receive' && a.index === 0)!;

    // Simulate addr0 receiving a payment
    const txsMap = new Map<string, Transaction[]>([
      [addr0.address, [{ id: 'tx-0', txid: 'tx-0', amountSats: 5000, direction: 'incoming', status: 'confirmed', createdAt: new Date().toISOString() }]],
    ]);
    const blockchain = makeBlockchainProvider(new Map(), txsMap);
    await makeSyncAddressStatus(blockchain).execute(wallet.id, 'testnet4');

    // addr0 is now `received` — it is the oldest non-discarded address
    const next = await getNextReceive.execute(wallet.id, 'testnet4', origin.id);
    expect(next.index).toBe(0);
    expect(next.status).toBe('received');
  });

  it('received addresses count toward pool — no extra addresses generated', async () => {
    // All 3 initial receive addresses become `received`: pool (fresh+received=3) is satisfied.
    // EnsureAddressPool must NOT generate new fresh addresses in this case.
    const { importWallet, createOrigin, walletAddressRepository, makeSyncAddressStatus } = makeSetup();
    const wallet = await importWallet.execute('W27', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addrs = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const receiveAddrs = addrs.filter(a => a.chain === 'receive');
    const txsMap = new Map<string, Transaction[]>(
      receiveAddrs.map(a => [
        a.address,
        [{ id: 'tx-' + a.index, txid: 'tx-' + a.index, amountSats: 1000, direction: 'incoming' as const, status: 'confirmed' as const, createdAt: new Date().toISOString() }],
      ])
    );
    const blockchain = makeBlockchainProvider(new Map(), txsMap);
    await makeSyncAddressStatus(blockchain).execute(wallet.id, 'testnet4');

    // Pool: all 3 are `received` → pool satisfied → no new fresh addresses
    const allAfter = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const freshReceive = allAfter.filter(a => a.chain === 'receive' && a.status === 'fresh');
    expect(freshReceive).toHaveLength(0); // no new fresh generated

    const availableReceive = allAfter.filter(
      a => a.chain === 'receive' && (a.status === 'fresh' || a.status === 'received'),
    );
    expect(availableReceive.length).toBeGreaterThanOrEqual(3); // pool still satisfied
  });

  it('pool replenishes when spent_once reduces available below minimum', async () => {
    // addr0 becomes spent_once (private key exposed) → pool drops to 2 → replenished to 3
    const { importWallet, createOrigin, walletAddressRepository, utxoRepository, makeSyncAddressStatus } = makeSetup();
    const wallet = await importWallet.execute('W28', TEST_MNEMONIC);
    const origin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');

    const addrs = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const addr0 = addrs.find(a => a.chain === 'receive' && a.index === 0)!;

    // addr0 sent from (outgoing tx, no UTXOs) → spent_once
    await utxoRepository.replaceAll(wallet.id, []); // no UTXOs at addr0
    const txsMap = new Map<string, Transaction[]>([
      [addr0.address, [
        { id: 'tx-in', txid: 'tx-in', amountSats: 5000, direction: 'incoming', status: 'confirmed', createdAt: new Date().toISOString() },
        { id: 'tx-out', txid: 'tx-out', amountSats: 4000, direction: 'outgoing', status: 'confirmed', createdAt: new Date().toISOString() },
      ]],
    ]);
    const blockchain = makeBlockchainProvider(new Map(), txsMap);
    await makeSyncAddressStatus(blockchain).execute(wallet.id, 'testnet4');

    // addr0 is spent_once → available = 2 (addr1, addr2 still fresh) < 3 → replenished
    const allAfter = await walletAddressRepository.findByOrigin(wallet.id, origin.id);
    const availableReceive = allAfter.filter(
      a => a.chain === 'receive' && (a.status === 'fresh' || a.status === 'received'),
    );
    expect(availableReceive.length).toBeGreaterThanOrEqual(3);

    // A new fresh address must have been generated (addr3)
    const freshReceive = allAfter.filter(a => a.chain === 'receive' && a.status === 'fresh');
    expect(freshReceive.length).toBeGreaterThanOrEqual(1);
  });

  // ── 7. CoinSelection address grouping ─────────────────────────────────────

  it('CoinSelection selects all UTXOs from an address when any one is chosen', () => {
    const { coinSelection } = makeSetup();

    const addr1 = 'tb1qaddr1';
    const addr2 = 'tb1qaddr2';

    const utxos = [
      { txid: 'tx1', vout: 0, valueSats: 50_000, address: addr1, isConfirmed: true },
      { txid: 'tx2', vout: 0, valueSats: 30_000, address: addr1, isConfirmed: true }, // same addr
      { txid: 'tx3', vout: 0, valueSats: 200_000, address: addr2, isConfirmed: true },
    ];

    // The addr2 group (200k) is large enough; addr1 group (80k) is second largest
    const { selectedUtxos } = coinSelection.select(utxos, 180_000, 5);

    // addr2's 200k covers 180k + fee; should be just the addr2 group
    expect(selectedUtxos).toHaveLength(1);
    expect(selectedUtxos[0].address).toBe(addr2);
  });

  it('CoinSelection includes all UTXOs from addr when the whole group is needed', () => {
    const { coinSelection } = makeSetup();

    const addr1 = 'tb1qgroupaddr1';
    const utxos = [
      { txid: 'tx1', vout: 0, valueSats: 40_000, address: addr1, isConfirmed: true },
      { txid: 'tx2', vout: 1, valueSats: 40_000, address: addr1, isConfirmed: true },
    ];

    // Selecting addr1 group (80k) to cover 50k + fee
    const { selectedUtxos } = coinSelection.select(utxos, 50_000, 5);

    // Must include BOTH UTXOs from addr1
    expect(selectedUtxos).toHaveLength(2);
    expect(selectedUtxos.every(u => u.address === addr1)).toBe(true);
  });

  it('CoinSelection skips frozen UTXOs', () => {
    const { coinSelection } = makeSetup();

    const utxos = [
      { txid: 'tx1', vout: 0, valueSats: 500_000, address: 'tb1qfrozen', isConfirmed: true, isFrozen: true },
      { txid: 'tx2', vout: 0, valueSats: 200_000, address: 'tb1qavailable', isConfirmed: true, isFrozen: false },
    ];

    const { selectedUtxos } = coinSelection.select(utxos, 100_000, 5);
    expect(selectedUtxos.every(u => !u.isFrozen)).toBe(true);
  });

  // ── 8. Multi-origin independence ──────────────────────────────────────────

  it('two origins have independent address pools with different addresses', async () => {
    const { importWallet, createOrigin, walletAddressRepository } = makeSetup();
    const wallet = await importWallet.execute('W24', TEST_MNEMONIC);

    const defaultOrigin = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');
    const customOrigin = await createOrigin.execute(wallet.id, 'Custom', 'testnet4');

    const defaultAddrs = await walletAddressRepository.findByOrigin(wallet.id, defaultOrigin.id);
    const customAddrs = await walletAddressRepository.findByOrigin(wallet.id, customOrigin.id);

    const defaultAddrValues = new Set(defaultAddrs.map(a => a.address));
    const customAddrValues = new Set(customAddrs.map(a => a.address));

    // No address overlap between origins
    for (const addr of customAddrValues) {
      expect(defaultAddrValues.has(addr)).toBe(false);
    }
  });

  it('ListAddressOrigins filters archived origins', async () => {
    const { importWallet, createOrigin, listOrigins, addressOriginRepository } = makeSetup();
    const wallet = await importWallet.execute('W25', TEST_MNEMONIC);

    const o1 = await createOrigin.execute(wallet.id, DEFAULT_ORIGIN_NAME, 'testnet4');
    const o2 = await createOrigin.execute(wallet.id, 'ToArchive', 'testnet4');
    await addressOriginRepository.archive(o2.id);

    const active = await listOrigins.execute(wallet.id);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(o1.id);
  });
});
