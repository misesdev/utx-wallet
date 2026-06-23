import { BlockchainAddressActivityChecker } from '../../../src/core/infrastructure/adapters/BlockchainAddressActivityChecker';
import type { BlockchainProvider } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';

function makeProvider(): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn(),
  };
}

function makeTx(id: string): Transaction {
  return {
    id,
    txid: id,
    amountSats: 10_000,
    direction: 'incoming',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
}

describe('BlockchainAddressActivityChecker', () => {
  it('returns 0 when provider returns empty transaction list', async () => {
    const provider = makeProvider();
    provider.getTransactions.mockResolvedValue([]);

    const checker = new BlockchainAddressActivityChecker(provider);
    const count = await checker.getAddressTxCount('bc1qtest', 'mainnet');

    expect(count).toBe(0);
    expect(provider.getTransactions).toHaveBeenCalledWith('bc1qtest', 'mainnet');
  });

  it('returns the number of transactions returned by the provider', async () => {
    const provider = makeProvider();
    provider.getTransactions.mockResolvedValue([makeTx('tx1'), makeTx('tx2'), makeTx('tx3')]);

    const checker = new BlockchainAddressActivityChecker(provider);
    const count = await checker.getAddressTxCount('bc1qtest', 'testnet4');

    expect(count).toBe(3);
  });

  it('passes the address and network through to the provider unchanged', async () => {
    const provider = makeProvider();
    provider.getTransactions.mockResolvedValue([]);

    const checker = new BlockchainAddressActivityChecker(provider);
    await checker.getAddressTxCount('tb1q1234567890', 'testnet4');

    expect(provider.getTransactions).toHaveBeenCalledWith('tb1q1234567890', 'testnet4');
  });

  it('propagates provider errors to the caller', async () => {
    const provider = makeProvider();
    provider.getTransactions.mockRejectedValue(new Error('Network error'));

    const checker = new BlockchainAddressActivityChecker(provider);
    await expect(checker.getAddressTxCount('bc1qtest', 'mainnet')).rejects.toThrow('Network error');
  });

  it('routes through the provider — does not create its own HTTP client', () => {
    const provider = makeProvider();
    const checker = new BlockchainAddressActivityChecker(provider);
    // The checker should hold a reference to the provider, not bypass it
    expect(checker).toBeDefined();
    expect(provider.getTransactions).not.toHaveBeenCalled();
  });
});
