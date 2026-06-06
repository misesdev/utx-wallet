import { MempoolExplorerAdapter } from '../../../src/core/infrastructure/adapters/MempoolExplorerAdapter';

const TXID = 'abcdef1234567890' + '0'.repeat(48);
const adapter = new MempoolExplorerAdapter();

describe('MempoolExplorerAdapter', () => {
  describe('getExplorerUrl — network-specific URLs', () => {
    it('returns mainnet mempool URL for mainnet', () => {
      const url = adapter.getExplorerUrl(TXID, 'mainnet');
      expect(url).toBe(`https://mempool.space/tx/${TXID}`);
    });

    it('returns testnet mempool URL for testnet', () => {
      const url = adapter.getExplorerUrl(TXID, 'testnet');
      expect(url).toBe(`https://mempool.space/testnet/tx/${TXID}`);
    });

    it('returns testnet mempool URL for testnet3', () => {
      const url = adapter.getExplorerUrl(TXID, 'testnet3');
      expect(url).toBe(`https://mempool.space/testnet/tx/${TXID}`);
    });

    it('returns testnet4 mempool URL for testnet4', () => {
      const url = adapter.getExplorerUrl(TXID, 'testnet4');
      expect(url).toBe(`https://mempool.space/testnet4/tx/${TXID}`);
    });

    it('includes the txid in all URLs', () => {
      (['mainnet', 'testnet', 'testnet3', 'testnet4'] as const).forEach(network => {
        const url = adapter.getExplorerUrl(TXID, network);
        expect(url).toContain(TXID);
      });
    });

    it('mainnet URL does not contain testnet path segment', () => {
      const url = adapter.getExplorerUrl(TXID, 'mainnet');
      expect(url).not.toContain('testnet');
    });

    it('testnet4 URL contains testnet4 path segment', () => {
      const url = adapter.getExplorerUrl(TXID, 'testnet4');
      expect(url).toContain('/testnet4/');
    });
  });
});
