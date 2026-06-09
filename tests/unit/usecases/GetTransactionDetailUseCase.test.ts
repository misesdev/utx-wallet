import { GetTransactionDetailUseCase } from '../../../src/core/domain/usecases/transaction/GetTransactionDetailUseCase';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { BlockchainExplorer } from '../../../src/core/domain/repositories/BlockchainExplorer';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';
import type { RemoteTransactionStatus } from '../../../src/core/domain/repositories/BlockchainProvider';

const TXID = 'aabbccdd' + '00'.repeat(28);
const CURRENT_HEIGHT = 850_000;
const TX_BLOCK_HEIGHT = 849_990;

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    txid: TXID,
    amountSats: 100_000,
    feeSats: 900,
    direction: 'outgoing',
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeConfirmedStatus(blockHeight = TX_BLOCK_HEIGHT): RemoteTransactionStatus {
  return {
    txid: TXID,
    confirmed: true,
    blockHeight,
    blockTime: 1_700_000_000,
  };
}

function makePendingStatus(): RemoteTransactionStatus {
  return { txid: TXID, confirmed: false };
}

function makeProvider(
  status: RemoteTransactionStatus = makePendingStatus(),
  currentHeight = CURRENT_HEIGHT,
): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn().mockResolvedValue(status),
    getCurrentBlockHeight: jest.fn().mockResolvedValue(currentHeight),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn(),
  };
}

function makeExplorer(): jest.Mocked<BlockchainExplorer> {
  return {
    getExplorerUrl: jest.fn().mockImplementation((txid, network) => `https://example.com/${network}/tx/${txid}`),
  };
}

function makeUseCase(
  provider = makeProvider(),
  explorer = makeExplorer(),
) {
  return new GetTransactionDetailUseCase(provider, explorer);
}

describe('GetTransactionDetailUseCase', () => {
  describe('outgoing transaction (enviada)', () => {
    it('returns direction outgoing', async () => {
      const tx = makeTx({ direction: 'outgoing' });
      const result = await makeUseCase().execute({ transaction: tx, network: 'testnet4' });
      expect(result.direction).toBe('outgoing');
    });

    it('preserves amount and fee from the original transaction', async () => {
      const tx = makeTx({ amountSats: 50_000, feeSats: 500 });
      const result = await makeUseCase().execute({ transaction: tx, network: 'testnet4' });
      expect(result.amountSats).toBe(50_000);
      expect(result.feeSats).toBe(500);
    });
  });

  describe('incoming transaction (recebida)', () => {
    it('returns direction incoming', async () => {
      const tx = makeTx({ direction: 'incoming' });
      const result = await makeUseCase().execute({ transaction: tx, network: 'testnet4' });
      expect(result.direction).toBe('incoming');
    });
  });

  describe('pending transaction', () => {
    it('sets isConfirmed to false for pending remote status', async () => {
      const tx = makeTx({ status: 'pending' });
      const provider = makeProvider(makePendingStatus());
      const result = await makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' });
      expect(result.isConfirmed).toBe(false);
    });

    it('does not set confirmations for pending transactions', async () => {
      const tx = makeTx({ status: 'pending' });
      const provider = makeProvider(makePendingStatus());
      const result = await makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' });
      expect(result.confirmations).toBeUndefined();
    });

    it('does not set blockHeight for pending transactions', async () => {
      const tx = makeTx({ status: 'pending' });
      const provider = makeProvider(makePendingStatus());
      const result = await makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' });
      expect(result.blockHeight).toBeUndefined();
    });
  });

  describe('confirmed transaction', () => {
    it('sets isConfirmed to true for confirmed remote status', async () => {
      const tx = makeTx({ status: 'pending' }); // local says pending, remote says confirmed
      const provider = makeProvider(makeConfirmedStatus());
      const result = await makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' });
      expect(result.isConfirmed).toBe(true);
    });

    it('computes confirmations as currentHeight - blockHeight + 1', async () => {
      const tx = makeTx();
      const provider = makeProvider(makeConfirmedStatus(TX_BLOCK_HEIGHT), CURRENT_HEIGHT);
      const result = await makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' });
      expect(result.confirmations).toBe(CURRENT_HEIGHT - TX_BLOCK_HEIGHT + 1);
    });

    it('sets blockHeight from remote status', async () => {
      const tx = makeTx();
      const provider = makeProvider(makeConfirmedStatus(TX_BLOCK_HEIGHT));
      const result = await makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' });
      expect(result.blockHeight).toBe(TX_BLOCK_HEIGHT);
    });

    it('sets blockTime from remote status', async () => {
      const tx = makeTx();
      const provider = makeProvider(makeConfirmedStatus());
      const result = await makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' });
      expect(result.blockTime).toBe(1_700_000_000);
    });

    it('ensures confirmations is at least 1', async () => {
      const tx = makeTx();
      // Same block — should be 1 confirmation
      const provider = makeProvider(makeConfirmedStatus(CURRENT_HEIGHT), CURRENT_HEIGHT);
      const result = await makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' });
      expect(result.confirmations).toBe(1);
    });
  });

  describe('explorer URL by network', () => {
    it('generates explorer URL for mainnet', async () => {
      const tx = makeTx();
      const result = await makeUseCase().execute({ transaction: tx, network: 'mainnet' });
      expect(result.explorerUrl).toContain('mainnet');
    });

    it('generates explorer URL for testnet4', async () => {
      const tx = makeTx();
      const result = await makeUseCase().execute({ transaction: tx, network: 'testnet4' });
      expect(result.explorerUrl).toContain('testnet4');
    });

    it('calls explorer with txid and network', async () => {
      const tx = makeTx();
      const explorer = makeExplorer();
      await makeUseCase(makeProvider(), explorer).execute({ transaction: tx, network: 'testnet4' });
      expect(explorer.getExplorerUrl).toHaveBeenCalledWith(TXID, 'testnet4');
    });

    it('returns empty explorerUrl when txid is missing', async () => {
      const tx = makeTx({ txid: undefined });
      const result = await makeUseCase().execute({ transaction: tx, network: 'mainnet' });
      expect(result.explorerUrl).toBe('');
    });
  });

  describe('remote fetch failure', () => {
    it('falls back to local status when provider throws', async () => {
      const provider = makeProvider();
      provider.getTransactionStatus.mockRejectedValue(new Error('Network error'));
      const tx = makeTx({ status: 'confirmed' });
      const result = await makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' });
      // Falls back to local status
      expect(result.isConfirmed).toBe(true);
      expect(result.confirmations).toBeUndefined();
    });

    it('does not throw when remote status fetch fails', async () => {
      const provider = makeProvider();
      provider.getTransactionStatus.mockRejectedValue(new Error('timeout'));
      const tx = makeTx();
      await expect(
        makeUseCase(provider).execute({ transaction: tx, network: 'testnet4' }),
      ).resolves.not.toThrow();
    });
  });
});
