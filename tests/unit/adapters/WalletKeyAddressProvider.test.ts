import { HDWallet } from 'bitcoin-tx-lib';
import { WalletKeyAddressProvider } from '../../../src/core/infrastructure/adapters/WalletKeyAddressProvider';
import type { WalletKeyStorage, DecodedWalletKey } from '../../../src/core/infrastructure/storage/WalletKeyStorage';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const WALLET_ID = 'wallet-1';

function makeStorage(key: DecodedWalletKey): jest.Mocked<WalletKeyStorage> {
  return {
    store: jest.fn(),
    storeKey: jest.fn(),
    retrieve: jest.fn(),
    retrieveKey: jest.fn().mockResolvedValue(key),
    remove: jest.fn(),
  } as unknown as jest.Mocked<WalletKeyStorage>;
}

describe('WalletKeyAddressProvider', () => {
  describe('HD wallet from mnemonic', () => {
    it('derives different receive addresses for different account indices', async () => {
      const storage = makeStorage({ kind: 'hd', secret: MNEMONIC, mnemonic: MNEMONIC });
      const provider = new WalletKeyAddressProvider(storage);

      const addr0 = await provider.getReceiveAddress(WALLET_ID, 'mainnet', 0, 0);
      const addr1 = await provider.getReceiveAddress(WALLET_ID, 'mainnet', 0, 1);

      expect(addr0).not.toBe(addr1);
    });

    it('derives different change addresses for different account indices', async () => {
      const storage = makeStorage({ kind: 'hd', secret: MNEMONIC, mnemonic: MNEMONIC });
      const provider = new WalletKeyAddressProvider(storage);

      const c0 = await provider.getChangeAddress(WALLET_ID, 'mainnet', 0, 0);
      const c1 = await provider.getChangeAddress(WALLET_ID, 'mainnet', 0, 1);

      expect(c0).not.toBe(c1);
    });
  });

  describe('watch-only wallet (zpub/vpub secret)', () => {
    let zpub: string;

    beforeAll(() => {
      const { wallet } = HDWallet.import(MNEMONIC, undefined, { network: 'mainnet', purpose: 84 });
      zpub = wallet.getAccountXPub(0);
    });

    it('returns the same receive address for account 0 and account 1 (accountIndex clamped to 0)', async () => {
      const storage = makeStorage({ kind: 'hd', secret: zpub, mnemonic: zpub });
      const provider = new WalletKeyAddressProvider(storage);

      const addr0 = await provider.getReceiveAddress(WALLET_ID, 'mainnet', 0, 0);
      const addr1 = await provider.getReceiveAddress(WALLET_ID, 'mainnet', 0, 1);
      const addr5 = await provider.getReceiveAddress(WALLET_ID, 'mainnet', 0, 5);

      // All clamp to account 0 — same address regardless of requested accountIndex
      expect(addr1).toBe(addr0);
      expect(addr5).toBe(addr0);
    });

    it('returns the same change address for account 0 and account 1', async () => {
      const storage = makeStorage({ kind: 'hd', secret: zpub, mnemonic: zpub });
      const provider = new WalletKeyAddressProvider(storage);

      const c0 = await provider.getChangeAddress(WALLET_ID, 'mainnet', 0, 0);
      const c1 = await provider.getChangeAddress(WALLET_ID, 'mainnet', 0, 1);

      expect(c1).toBe(c0);
    });

    it('derives the correct BIP84 receive address at index 0 from zpub', async () => {
      const storage = makeStorage({ kind: 'hd', secret: zpub, mnemonic: zpub });
      const provider = new WalletKeyAddressProvider(storage);

      // Derive expected address directly from zpub via HDWallet
      const { wallet } = HDWallet.import(zpub, undefined, { network: 'mainnet', purpose: 84 });
      const expected = wallet.getAddress(0, { account: 0, change: 0 });

      const result = await provider.getReceiveAddress(WALLET_ID, 'mainnet', 0, 0);
      expect(result).toBe(expected);
    });

    it('handles vpub (testnet) watch-only wallet the same way', async () => {
      const { wallet: testnetWallet } = HDWallet.import(MNEMONIC, undefined, { network: 'testnet', purpose: 84 });
      const vpub = testnetWallet.getAccountXPub(0);

      const storage = makeStorage({ kind: 'hd', secret: vpub, mnemonic: vpub });
      const provider = new WalletKeyAddressProvider(storage);

      const addr0 = await provider.getReceiveAddress(WALLET_ID, 'testnet', 0, 0);
      const addr1 = await provider.getReceiveAddress(WALLET_ID, 'testnet', 0, 1);

      expect(addr1).toBe(addr0);
    });
  });
});
