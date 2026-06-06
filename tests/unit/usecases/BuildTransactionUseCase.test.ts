import {
  BuildTransactionUseCase,
  DUST_THRESHOLD_SATS,
  type BuildTransactionParams,
} from '../../../src/core/domain/usecases/transaction/BuildTransactionUseCase';
import { FeeEstimationService } from '../../../src/core/domain/services/FeeEstimationService';
import { CoinSelectionService } from '../../../src/core/domain/services/CoinSelectionService';
import type { UtxoRepository } from '../../../src/core/domain/repositories/UtxoRepository';
import type { WalletAddressProvider } from '../../../src/core/domain/repositories/WalletAddressProvider';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';

// Valid addresses verified via bitcoin-tx-lib (ECPairKey-generated)
const MAINNET_ADDR_1 = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const MAINNET_ADDR_2 = 'bc1qp3q5wxq3t4y5yy7v6p20clzf9r5rgy0n3z5erz';
const CHANGE_ADDR    = 'bc1q2huh508fyvu04z98cvnrd2stuzyqzwe80eqark';

const WALLET_ID = 'wallet-1';
const FEE_RATE = 5;

const feeEstimation = new FeeEstimationService();
const coinSelection = new CoinSelectionService(feeEstimation);

function makeUtxo(valueSats: number, address = MAINNET_ADDR_1, vout = 0): Utxo {
  return {
    txid: `deadbeef${'00'.repeat(28)}${vout.toString().padStart(8, '0')}`,
    vout,
    valueSats,
    address,
    isConfirmed: true,
  };
}

function makeRepo(utxos: Utxo[]): jest.Mocked<UtxoRepository> {
  return {
    listByWallet: jest.fn().mockResolvedValue(utxos),
    replaceAll: jest.fn().mockResolvedValue(undefined),
    freeze: jest.fn().mockResolvedValue(undefined),
    unfreeze: jest.fn().mockResolvedValue(undefined),
  };
}

function makeChangeProvider(changeAddr = CHANGE_ADDR): jest.Mocked<WalletAddressProvider> {
  return {
    getReceiveAddress: jest.fn(),
    getChangeAddress: jest.fn().mockResolvedValue(changeAddr),
  };
}

function makeUseCase(utxos: Utxo[], changeAddr = CHANGE_ADDR) {
  return new BuildTransactionUseCase(
    makeRepo(utxos),
    coinSelection,
    feeEstimation,
    makeChangeProvider(changeAddr),
  );
}

function baseParams(overrides: Partial<BuildTransactionParams> = {}): BuildTransactionParams {
  return {
    walletId: WALLET_ID,
    walletNetwork: 'mainnet',
    toAddress: MAINNET_ADDR_2,
    amountSats: 100_000,
    feeRateSatsPerVByte: FEE_RATE,
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Fee for N inputs, 2 outputs (typical: recipient + change)
const fee = (inputs: number, outputs = 2) => feeEstimation.estimateFeeSats(inputs, outputs, FEE_RATE);

describe('BuildTransactionUseCase', () => {
  describe('UTXO único suficiente', () => {
    it('builds a transaction selecting only one UTXO when sufficient', async () => {
      const balance = 500_000;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams());

      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0].valueSats).toBe(balance);
    });

    it('returns correct status and wallet id', async () => {
      const useCase = makeUseCase([makeUtxo(500_000)]);
      const result = await useCase.execute(baseParams());

      expect(result.status).toBe('built');
      expect(result.walletId).toBe(WALLET_ID);
    });

    it('sets amountSats and feeSats correctly', async () => {
      const useCase = makeUseCase([makeUtxo(500_000)]);
      const result = await useCase.execute(baseParams({ amountSats: 100_000 }));

      expect(result.amountSats).toBe(100_000);
      expect(result.feeSats).toBe(fee(1, 2));
    });

    it('sets totalSats = amountSats + feeSats', async () => {
      const useCase = makeUseCase([makeUtxo(500_000)]);
      const result = await useCase.execute(baseParams());

      expect(result.totalSats).toBe(result.amountSats + result.feeSats);
    });

    it('includes scriptPubKey for each input derived via bitcoin-tx-lib', async () => {
      const useCase = makeUseCase([makeUtxo(500_000, MAINNET_ADDR_1)]);
      const result = await useCase.execute(baseParams());

      expect(result.inputs[0].scriptPubKey).toBeTruthy();
      expect(typeof result.inputs[0].scriptPubKey).toBe('string');
      expect(result.inputs[0].scriptPubKey.length).toBeGreaterThan(0);
    });

    it('sets the correct recipient output address and amount', async () => {
      const useCase = makeUseCase([makeUtxo(500_000)]);
      const result = await useCase.execute(baseParams({ toAddress: MAINNET_ADDR_2 }));

      const recipientOutput = result.outputs.find(o => !o.isChange)!;
      expect(recipientOutput.address).toBe(MAINNET_ADDR_2);
      expect(recipientOutput.amountSats).toBe(100_000);
    });
  });

  describe('Múltiplos UTXOs', () => {
    it('selects multiple UTXOs when a single one is insufficient', async () => {
      const u1 = makeUtxo(60_000, MAINNET_ADDR_1, 0);
      const u2 = makeUtxo(60_000, MAINNET_ADDR_1, 1);
      const useCase = makeUseCase([u1, u2]);
      const result = await useCase.execute(baseParams({ amountSats: 100_000 }));

      expect(result.inputs).toHaveLength(2);
    });

    it('sums all selected input values correctly', async () => {
      const u1 = makeUtxo(60_000, MAINNET_ADDR_1, 0);
      const u2 = makeUtxo(80_000, MAINNET_ADDR_1, 1);
      const useCase = makeUseCase([u1, u2]);
      const result = await useCase.execute(baseParams({ amountSats: 100_000 }));

      const inputTotal = result.inputs.reduce((s, i) => s + i.valueSats, 0);
      expect(inputTotal).toBeGreaterThanOrEqual(result.totalSats);
    });

    it('derives scriptPubKey for every selected input', async () => {
      const u1 = makeUtxo(60_000, MAINNET_ADDR_1, 0);
      const u2 = makeUtxo(60_000, MAINNET_ADDR_1, 1);
      const useCase = makeUseCase([u1, u2]);
      const result = await useCase.execute(baseParams({ amountSats: 100_000 }));

      result.inputs.forEach(input => {
        expect(input.scriptPubKey).toBeTruthy();
      });
    });
  });

  describe('Troco', () => {
    it('creates a change output when surplus exceeds dust threshold', async () => {
      const amount = 100_000;
      const expectedFee = fee(1, 2);
      const balance = amount + expectedFee + 10_000; // large surplus → clean change
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams({ amountSats: amount }));

      const changeOutput = result.outputs.find(o => o.isChange);
      expect(changeOutput).toBeDefined();
      expect(changeOutput!.amountSats).toBe(10_000);
    });

    it('sets the change address from WalletAddressProvider', async () => {
      const balance = 500_000;
      const useCase = makeUseCase([makeUtxo(balance)], CHANGE_ADDR);
      const result = await useCase.execute(baseParams());

      const changeOutput = result.outputs.find(o => o.isChange)!;
      expect(changeOutput.address).toBe(CHANGE_ADDR);
    });

    it('balance is conserved: inputs = amount + fee + change', async () => {
      const balance = 500_000;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams({ amountSats: 100_000 }));

      const inputTotal = result.inputs.reduce((s, i) => s + i.valueSats, 0);
      expect(inputTotal).toBe(result.amountSats + result.feeSats + result.changeSats);
    });

    it('includes change amount in changeSats field', async () => {
      const amount = 100_000;
      const expectedFee = fee(1, 2);
      const surplus = 50_000;
      const balance = amount + expectedFee + surplus;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams({ amountSats: amount }));

      expect(result.changeSats).toBe(surplus);
    });
  });

  describe('Sem troco por dust', () => {
    it('sets changeSats to 0 when change is below dust threshold', async () => {
      const amount = 100_000;
      const dust = DUST_THRESHOLD_SATS - 1; // 545 — just below threshold
      const balance = amount + fee(1, 2) + dust;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams({ amountSats: amount }));

      expect(result.changeSats).toBe(0);
    });

    it('omits the change output when change would be dust', async () => {
      const amount = 100_000;
      const dust = DUST_THRESHOLD_SATS - 1;
      const balance = amount + fee(1, 2) + dust;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams({ amountSats: amount }));

      const changeOutput = result.outputs.find(o => o.isChange);
      expect(changeOutput).toBeUndefined();
      expect(result.outputs).toHaveLength(1);
    });

    it('absorbs dust change into feeSats', async () => {
      const amount = 100_000;
      const dust = DUST_THRESHOLD_SATS - 1;
      const baseFee = fee(1, 2);
      const balance = amount + baseFee + dust;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams({ amountSats: amount }));

      expect(result.feeSats).toBe(baseFee + dust);
    });

    it('creates change output when change equals exactly the dust threshold', async () => {
      const amount = 100_000;
      const balance = amount + fee(1, 2) + DUST_THRESHOLD_SATS;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams({ amountSats: amount }));

      const changeOutput = result.outputs.find(o => o.isChange);
      expect(changeOutput).toBeDefined();
      expect(changeOutput!.amountSats).toBe(DUST_THRESHOLD_SATS);
    });
  });

  describe('Saldo insuficiente', () => {
    it('throws INSUFFICIENT_BALANCE when UTXOs cannot cover amount + fee', async () => {
      const useCase = makeUseCase([makeUtxo(500)]); // only 500 sats
      await expect(
        useCase.execute(baseParams({ amountSats: 100_000 })),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });

    it('throws INSUFFICIENT_BALANCE with empty UTXO set', async () => {
      const useCase = makeUseCase([]);
      await expect(
        useCase.execute(baseParams()),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });

    it('ignores unconfirmed UTXOs when assessing balance', async () => {
      const useCase = makeUseCase([{ ...makeUtxo(1_000_000), isConfirmed: false }]);
      await expect(
        useCase.execute(baseParams({ amountSats: 100_000 })),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });
  });

  describe('Taxa alta demais', () => {
    it('throws INSUFFICIENT_BALANCE when fee rate makes transaction unaffordable', async () => {
      // 50_000 sats balance; at 500 sat/vB fee = (10+68+62)*500 = 70_000 → exceeds balance
      const useCase = makeUseCase([makeUtxo(50_000)]);
      await expect(
        useCase.execute(baseParams({ amountSats: 1_000, feeRateSatsPerVByte: 500 })),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    });
  });

  describe('Validação de entrada', () => {
    it('throws for an invalid destination address', async () => {
      const useCase = makeUseCase([makeUtxo(500_000)]);
      await expect(
        useCase.execute(baseParams({ toAddress: 'not-valid' })),
      ).rejects.toThrow();
    });

    it('throws INVALID_AMOUNT when amountSats is 0', async () => {
      const useCase = makeUseCase([makeUtxo(500_000)]);
      await expect(
        useCase.execute(baseParams({ amountSats: 0 })),
      ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
    });

    it('throws INVALID_AMOUNT when amountSats is negative', async () => {
      const useCase = makeUseCase([makeUtxo(500_000)]);
      await expect(
        useCase.execute(baseParams({ amountSats: -100 })),
      ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
    });

    it('throws INVALID_AMOUNT when amountSats is non-integer', async () => {
      const useCase = makeUseCase([makeUtxo(500_000)]);
      await expect(
        useCase.execute(baseParams({ amountSats: 100.5 })),
      ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
    });

    it('throws BELOW_DUST when amountSats is below dust threshold', async () => {
      const useCase = makeUseCase([makeUtxo(500_000)]);
      await expect(
        useCase.execute(baseParams({ amountSats: DUST_THRESHOLD_SATS - 1 })),
      ).rejects.toMatchObject({ code: 'BELOW_DUST' });
    });

    it('accepts amountSats at exactly the dust threshold', async () => {
      const balance = DUST_THRESHOLD_SATS + fee(1, 2) + DUST_THRESHOLD_SATS;
      const useCase = makeUseCase([makeUtxo(balance)]);
      await expect(
        useCase.execute(baseParams({ amountSats: DUST_THRESHOLD_SATS })),
      ).resolves.toMatchObject({ amountSats: DUST_THRESHOLD_SATS });
    });
  });

  describe('estimatedVBytes', () => {
    it('estimates vBytes using fee estimation formula', async () => {
      const balance = 500_000;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams({ amountSats: 100_000 }));

      // 1 input, 2 outputs (recipient + change)
      expect(result.estimatedVBytes).toBe(feeEstimation.estimateVBytes(1, 2));
    });

    it('estimates vBytes with 1 output when change is absorbed', async () => {
      const amount = 100_000;
      const dust = DUST_THRESHOLD_SATS - 1;
      const balance = amount + fee(1, 2) + dust;
      const useCase = makeUseCase([makeUtxo(balance)]);
      const result = await useCase.execute(baseParams({ amountSats: amount }));

      // No change output → 1 output only
      expect(result.estimatedVBytes).toBe(feeEstimation.estimateVBytes(1, 1));
    });
  });
});
