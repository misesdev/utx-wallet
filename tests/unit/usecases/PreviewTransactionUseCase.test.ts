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
    deleteByWallet: jest.fn().mockResolvedValue(undefined),
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
      // amount 40_001 > confirmedSats 40_000 → fails even in SFA mode
      const useCase = makeUseCase([
        makeUtxo(40_000, true),
        makeUtxo(5_000_000, false),
      ]);

      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 40_001,
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

  describe('subtractFeeFromAmount mode', () => {
    it('recipient gets amountSats minus fee', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
        subtractFeeFromAmount: true,
      });
      expect(result.recipientAmountSats).toBe(100_000 - Math.ceil(FEE_RATE * 180));
    });

    it('totalSats equals the requested amountSats', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
        subtractFeeFromAmount: true,
      });
      expect(result.totalSats).toBe(100_000);
    });

    it('change is balance minus amountSats', async () => {
      const balance = 1_000_000;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
        subtractFeeFromAmount: true,
      });
      expect(result.changeSats).toBe(balance - 100_000);
    });

    it('throws INSUFFICIENT_BALANCE when amountSats exceeds confirmed balance', async () => {
      const useCase = makeUseCase([makeUtxo(50_000)]);
      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 100_000,
          feeRateSatsPerVByte: FEE_RATE,
          subtractFeeFromAmount: true,
        }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });

    it('throws BELOW_DUST when recipient would get less than dust threshold', async () => {
      // fee=180*50=9000, amount=9_100 → recipient=100, which is below 546
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 9_100,
          feeRateSatsPerVByte: 50,
          subtractFeeFromAmount: true,
        }),
      ).rejects.toMatchObject({ code: 'BELOW_DUST' });
    });

    it('sets subtractFeeFromAmount=true in result', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
        subtractFeeFromAmount: true,
      });
      expect(result.subtractFeeFromAmount).toBe(true);
    });

    it('sets subtractFeeFromAmount=false for default mode', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
      });
      expect(result.subtractFeeFromAmount).toBe(false);
    });

    it('recipientAmountSats equals amountSats in default mode', async () => {
      const useCase = makeUseCase([makeUtxo(1_000_000)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
      });
      expect(result.recipientAmountSats).toBe(100_000);
    });
  });

  describe('SFA mode max balance (send all)', () => {
    it('succeeds when amountSats equals full confirmed balance', async () => {
      const balance = 50_000;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: balance,
        feeRateSatsPerVByte: FEE_RATE,
        subtractFeeFromAmount: true,
      });
      expect(result.changeSats).toBe(0);
      expect(result.recipientAmountSats).toBe(balance - result.feeSats);
      expect(result.subtractFeeFromAmount).toBe(true);
    });

    it('throws INSUFFICIENT_BALANCE when amountSats exceeds full balance in SFA mode', async () => {
      const useCase = makeUseCase([makeUtxo(50_000)]);
      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 50_001,
          feeRateSatsPerVByte: FEE_RATE,
          subtractFeeFromAmount: true,
        }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });
  });

  describe('auto-drain (standard mode + max balance)', () => {
    it('auto-switches to SFA when amount + fee exceeds balance but amount fits', async () => {
      const balance = 50_000;
      const useCase = makeUseCase([makeUtxo(balance)]);
      // Standard mode: amount + fee > balance → auto-drain → SFA result
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: balance,
        feeRateSatsPerVByte: FEE_RATE,
      });
      expect(result.subtractFeeFromAmount).toBe(true);
      expect(result.changeSats).toBe(0);
      expect(result.recipientAmountSats).toBe(balance - result.feeSats);
    });

    it('auto-drain: totalSats equals requested amountSats', async () => {
      const balance = 50_000;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: balance,
        feeRateSatsPerVByte: FEE_RATE,
      });
      expect(result.totalSats).toBe(balance);
    });

    it('standard mode stays standard when there is room for fee', async () => {
      const balance = 200_000;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
      });
      expect(result.subtractFeeFromAmount).toBe(false);
      expect(result.recipientAmountSats).toBe(100_000);
    });

    it('still throws INSUFFICIENT_BALANCE when amount itself exceeds balance', async () => {
      const useCase = makeUseCase([makeUtxo(50_000)]);
      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 50_001,
          feeRateSatsPerVByte: FEE_RATE,
        }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });
  });

  describe('allowedAddresses (account isolation)', () => {
    function makeUtxoAt(valueSats: number, address: string, isConfirmed = true): Utxo {
      return { txid: 'abc', vout: 0, valueSats, address, isConfirmed };
    }

    it('restricts balance check to allowed addresses', async () => {
      const origin = 'addr-origin';
      const other  = 'addr-other';
      const repo = makeRepo([
        makeUtxoAt(200_000, origin),
        makeUtxoAt(800_000, other),
      ]);
      const useCase = new PreviewTransactionUseCase(repo);

      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 100_000,
        feeRateSatsPerVByte: FEE_RATE,
        allowedAddresses: [origin],
      });

      // change = 200k - 100k - fee (based on origin balance only)
      const fee = Math.ceil(FEE_RATE * 180);
      expect(result.changeSats).toBe(200_000 - 100_000 - fee);
    });

    it('throws INSUFFICIENT_BALANCE when allowed UTXOs have insufficient funds', async () => {
      const origin = 'addr-origin';
      const other  = 'addr-other';
      const repo = makeRepo([
        makeUtxoAt(50_000, origin),   // only 50k in origin
        makeUtxoAt(5_000_000, other), // 5M in other — should not count
      ]);
      const useCase = new PreviewTransactionUseCase(repo);

      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          toAddress: VALID_ADDRESS,
          amountSats: 100_000,
          feeRateSatsPerVByte: FEE_RATE,
          allowedAddresses: [origin],
        }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });

    it('uses all UTXOs when allowedAddresses is undefined', async () => {
      const addr1 = 'addr-1';
      const addr2 = 'addr-2';
      const repo = makeRepo([makeUtxoAt(300_000, addr1), makeUtxoAt(300_000, addr2)]);
      const useCase = new PreviewTransactionUseCase(repo);

      const result = await useCase.execute({
        walletId: WALLET_ID,
        toAddress: VALID_ADDRESS,
        amountSats: 400_000,
        feeRateSatsPerVByte: FEE_RATE,
      });

      // 600k total is enough; would fail if filtered
      expect(result.amountSats).toBe(400_000);
    });
  });
});
