import {
  PreviewTransactionUseCase,
  DUST_THRESHOLD_SATS,
} from '../../../src/core/domain/usecases/transaction/PreviewTransactionUseCase';
import type { UtxoRepository } from '../../../src/core/domain/repositories/UtxoRepository';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';

const WALLET_ID = 'wallet-1';
const VALID_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const FEE_RATE = 5;

function makeUtxo(valueSats: number, isConfirmed = true): Utxo {
  return { txid: 'abc', vout: 0, valueSats, address: 'bc1q...', isConfirmed };
}

function makeRepo(utxos: Utxo[] = []): jest.Mocked<UtxoRepository> {
  return {
    listByWallet: jest.fn().mockResolvedValue(utxos),
    replaceAll: jest.fn().mockResolvedValue(undefined),
    freeze: jest.fn().mockResolvedValue(undefined),
    unfreeze: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUseCase(utxos: Utxo[]) {
  return new PreviewTransactionUseCase(makeRepo(utxos));
}

describe('PreviewTransactionUseCase', () => {
  describe('valid preview', () => {
    it('calculates fee from feeRate * 180 vbytes', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
      });

      expect(result.feeSats).toBe(Math.ceil(FEE_RATE * 180));
      expect(result.estimatedVBytes).toBe(180);
    });

    it('calculates total as amount + fee', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
      });

      expect(result.totalSats).toBe(result.amountSats + result.feeSats);
    });

    it('calculates change as balance - amount - fee', async () => {
      const balance = 1_000_000;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
      });

      expect(result.changeSats).toBe(balance - result.amountSats - result.feeSats);
    });

    it('returns address and feeRate in the preview', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
      });

      expect(result.toAddress).toBe(VALID_ADDRESS);
      expect(result.feeRateSatsPerVByte).toBe(FEE_RATE);
    });

    it('uses feeRate = 1 when provided rate is <= 0', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: 0,
      });

      expect(result.feeSats).toBe(180);
    });

    it('absorbs dust change into fee when change < dust threshold', async () => {
      const feeRate = 1;
      const fee = 180;
      const amount = 100_000;
      const dustChange = DUST_THRESHOLD_SATS - 1;
      const balance = amount + fee + dustChange;

      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: amount,
        feeRateSatsPerVByte: feeRate,
      });

      expect(result.changeSats).toBe(0);
      expect(result.feeSats).toBe(fee + dustChange);
      expect(result.totalSats).toBe(amount + result.feeSats);
    });

    it('only uses confirmed UTXOs for balance calculation', async () => {
      // confirmed = 40_000, unconfirmed = 5_000_000
      // amount 40_000 + fee (180*5=900) = 40_900 > 40_000 → insufficient
      const useCase = makeUseCase([
        makeUtxo(40_000, true),
        makeUtxo(5_000_000, false),
      ]);

      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 40_000,
          feeRateSatsPerVByte: FEE_RATE,
        }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });
  });

  describe('validation errors', () => {
    it('throws INSUFFICIENT_BALANCE when amount + fee exceeds confirmed balance', async () => {
      const useCase = makeUseCase([makeUtxo(1_000)]);

      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 100_000,
          feeRateSatsPerVByte: FEE_RATE,
        }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });

    it('throws BELOW_DUST when amount is below dust threshold', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);

      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: DUST_THRESHOLD_SATS - 1,
          feeRateSatsPerVByte: FEE_RATE,
        }),
      ).rejects.toMatchObject({ code: 'BELOW_DUST' });
    });

    it('throws INVALID_AMOUNT when amount is zero', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);

      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 0,
          feeRateSatsPerVByte: FEE_RATE,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
    });

    it('throws when address is invalid', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);

      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: 'not-valid',
          amountSats: 100_000,
          feeRateSatsPerVByte: FEE_RATE,
        }),
      ).rejects.toThrow();
    });

    it('throws INSUFFICIENT_BALANCE with empty UTXOs', async () => {
      const useCase = makeUseCase([]);

      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 100_000,
          feeRateSatsPerVByte: FEE_RATE,
        }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });
  });

  describe('custom fee rate', () => {
    it('uses the provided custom fee rate for fee calculation', async () => {
      const customRate = 20;
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: customRate,
      });

      expect(result.feeSats).toBe(Math.ceil(customRate * 180));
      expect(result.feeRateSatsPerVByte).toBe(customRate);
    });
  });
});
