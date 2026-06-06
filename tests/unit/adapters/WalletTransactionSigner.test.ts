import { HDWallet, Address } from 'bitcoin-tx-lib';
import { WalletTransactionSigner } from '../../../src/core/infrastructure/adapters/WalletTransactionSigner';
import { WalletKeyStorage } from '../../../src/core/infrastructure/storage/WalletKeyStorage';
import type { BuiltTransaction } from '../../../src/core/domain/entities/BuiltTransaction';
import { createSecureStorageMock } from '../../mocks/storage';

// Standard BIP-39 test mnemonic (all "abandon", publicly known)
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const WALLET_ID = 'test-wallet-1';
const NETWORK = 'testnet4' as const;

function deriveTestnetAddress(index: number, change: 0 | 1 = 0): string {
  const { wallet } = HDWallet.import(TEST_MNEMONIC, undefined, {
    network: 'testnet',
    purpose: 84,
  });
  return wallet.getPairKey(index, { change }).getAddress();
}

function deriveScriptPubKey(address: string): string {
  return Address.getScriptPubkey(address);
}

function makeStorage(mnemonic: string | null): WalletKeyStorage {
  const secure = createSecureStorageMock() as jest.Mocked<ReturnType<typeof createSecureStorageMock>>;
  const storage = new WalletKeyStorage(secure);
  if (mnemonic !== null) {
    secure.getItem.mockImplementation((key: string) => {
      if (key === `wallet_secret:${WALLET_ID}`) return Promise.resolve(mnemonic);
      return Promise.resolve(null);
    });
  } else {
    secure.getItem.mockResolvedValue(null);
  }
  return storage;
}

function makeBuiltTx(
  inputAddress: string,
  recipientAddress: string,
  inputTxid = 'a'.repeat(64),
): BuiltTransaction {
  const scriptPubKey = deriveScriptPubKey(inputAddress);
  return {
    id: 'built-1',
    walletId: WALLET_ID,
    inputs: [
      { txid: inputTxid, vout: 0, valueSats: 100_000, address: inputAddress, scriptPubKey },
    ],
    outputs: [
      { address: recipientAddress, amountSats: 80_000, isChange: false },
      { address: inputAddress, amountSats: 19_100, isChange: true },
    ],
    amountSats: 80_000,
    feeSats: 900,
    totalSats: 80_900,
    changeSats: 19_100,
    feeRateSatsPerVByte: 5,
    estimatedVBytes: 180,
    status: 'built',
    createdAt: new Date().toISOString(),
  };
}

describe('WalletTransactionSigner', () => {
  const receiveAddr0 = deriveTestnetAddress(0, 0);
  const receiveAddr1 = deriveTestnetAddress(1, 0);
  const changeAddr0 = deriveTestnetAddress(0, 1);

  describe('sign — success', () => {
    it('produces a non-empty rawHex for a valid transaction', async () => {
      const signer = new WalletTransactionSigner(makeStorage(TEST_MNEMONIC));
      // Use a second receive address as recipient (doesn't need to be in wallet)
      const built = makeBuiltTx(receiveAddr0, receiveAddr1);

      const result = await signer.sign(built, WALLET_ID, NETWORK);

      expect(result.rawHex).toBeTruthy();
      expect(result.rawHex.length).toBeGreaterThan(0);
    });

    it('produces a non-empty txid', async () => {
      const signer = new WalletTransactionSigner(makeStorage(TEST_MNEMONIC));
      const built = makeBuiltTx(receiveAddr0, receiveAddr1);

      const result = await signer.sign(built, WALLET_ID, NETWORK);

      expect(result.txid).toBeTruthy();
      expect(result.txid.length).toBe(64);
    });

    it('attaches the original builtTransaction to the result', async () => {
      const signer = new WalletTransactionSigner(makeStorage(TEST_MNEMONIC));
      const built = makeBuiltTx(receiveAddr0, receiveAddr1);

      const result = await signer.sign(built, WALLET_ID, NETWORK);

      expect(result.builtTransaction).toBe(built);
    });

    it('signs with an address on the change chain (change=1)', async () => {
      const signer = new WalletTransactionSigner(makeStorage(TEST_MNEMONIC));
      // Use change address as the input — should still find the key
      const built = makeBuiltTx(changeAddr0, receiveAddr1);

      const result = await signer.sign(built, WALLET_ID, NETWORK);

      expect(result.rawHex).toBeTruthy();
    });

    it('signs with a second receive address (index=1)', async () => {
      const signer = new WalletTransactionSigner(makeStorage(TEST_MNEMONIC));
      const built = makeBuiltTx(receiveAddr1, receiveAddr0);

      const result = await signer.sign(built, WALLET_ID, NETWORK);

      expect(result.rawHex).toBeTruthy();
    });
  });

  describe('sign — failures', () => {
    it('throws WALLET_NOT_FOUND when wallet secret is missing', async () => {
      const signer = new WalletTransactionSigner(makeStorage(null));
      const built = makeBuiltTx(receiveAddr0, receiveAddr1);

      await expect(signer.sign(built, WALLET_ID, NETWORK)).rejects.toMatchObject({
        code: 'WALLET_NOT_FOUND',
      });
    });

    it('throws KEY_NOT_FOUND when input address is not in the wallet', async () => {
      const signer = new WalletTransactionSigner(makeStorage(TEST_MNEMONIC));
      // Use a completely foreign address as input
      const foreignAddress = receiveAddr1;
      // Build a tx that claims an address from a different wallet
      const { wallet: otherWallet } = HDWallet.import(
        'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
        undefined,
        { network: 'testnet', purpose: 84 },
      );
      const foreignAddr = otherWallet.getPairKey(0, { change: 0 }).getAddress();
      const built = makeBuiltTx(foreignAddr, foreignAddress);

      await expect(signer.sign(built, WALLET_ID, NETWORK)).rejects.toMatchObject({
        code: 'KEY_NOT_FOUND',
      });
    });
  });
});
