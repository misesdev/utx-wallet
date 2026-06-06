import { SignTransactionUseCase } from '../../../src/core/domain/usecases/transaction/SignTransactionUseCase';
import type { TransactionSigner } from '../../../src/core/domain/repositories/TransactionSigner';
import type { BuiltTransaction } from '../../../src/core/domain/entities/BuiltTransaction';
import type { SignedTransaction } from '../../../src/core/domain/entities/SignedTransaction';

const WALLET_ID = 'wallet-1';
const NETWORK = 'testnet4' as const;

const BUILT: BuiltTransaction = {
  id: 'built-1',
  walletId: WALLET_ID,
  inputs: [
    {
      txid: 'aabbccdd' + '00'.repeat(28),
      vout: 0,
      valueSats: 500_000,
      address: 'tb1qaddress',
      scriptPubKey: '00140000000000000000000000000000000000000000',
    },
  ],
  outputs: [
    { address: 'tb1qrecipient', amountSats: 100_000, isChange: false },
    { address: 'tb1qchange', amountSats: 399_100, isChange: true },
  ],
  amountSats: 100_000,
  feeSats: 900,
  totalSats: 100_900,
  changeSats: 399_100,
  feeRateSatsPerVByte: 5,
  estimatedVBytes: 180,
  status: 'built',
  createdAt: new Date().toISOString(),
};

const SIGNED: SignedTransaction = {
  rawHex: 'deadbeef',
  txid: '1234abcd' + '00'.repeat(28),
  builtTransaction: BUILT,
};

function makeSigner(): jest.Mocked<TransactionSigner> {
  return { sign: jest.fn().mockResolvedValue(SIGNED) };
}

describe('SignTransactionUseCase', () => {
  it('delegates to the signer with correct params', async () => {
    const signer = makeSigner();
    const useCase = new SignTransactionUseCase(signer);

    const result = await useCase.execute({
      builtTransaction: BUILT,
      walletId: WALLET_ID,
      network: NETWORK,
    });

    expect(signer.sign).toHaveBeenCalledTimes(1);
    expect(signer.sign).toHaveBeenCalledWith(BUILT, WALLET_ID, NETWORK);
    expect(result).toEqual(SIGNED);
  });

  it('returns the signed transaction returned by the signer', async () => {
    const signer = makeSigner();
    const useCase = new SignTransactionUseCase(signer);

    const result = await useCase.execute({
      builtTransaction: BUILT,
      walletId: WALLET_ID,
      network: NETWORK,
    });

    expect(result.rawHex).toBe(SIGNED.rawHex);
    expect(result.txid).toBe(SIGNED.txid);
    expect(result.builtTransaction).toBe(BUILT);
  });

  it('propagates errors thrown by the signer', async () => {
    const signer = makeSigner();
    signer.sign.mockRejectedValue(new Error('KEY_NOT_FOUND'));
    const useCase = new SignTransactionUseCase(signer);

    await expect(
      useCase.execute({ builtTransaction: BUILT, walletId: WALLET_ID, network: NETWORK }),
    ).rejects.toThrow('KEY_NOT_FOUND');
  });

  it('works with mainnet network', async () => {
    const signer = makeSigner();
    const useCase = new SignTransactionUseCase(signer);

    await useCase.execute({
      builtTransaction: BUILT,
      walletId: WALLET_ID,
      network: 'mainnet',
    });

    expect(signer.sign).toHaveBeenCalledWith(BUILT, WALLET_ID, 'mainnet');
  });
});
