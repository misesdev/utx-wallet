import { AccelerateTransactionUseCase } from '../../../src/core/domain/usecases/transaction/AccelerateTransactionUseCase';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { BlockchainProvider, RawTransaction } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { IFeeEstimationService } from '../../../src/core/domain/services/FeeEstimationService';
import type { SignTransactionUseCase } from '../../../src/core/domain/usecases/transaction/SignTransactionUseCase';
import type { BroadcastTransactionUseCase } from '../../../src/core/domain/usecases/transaction/BroadcastTransactionUseCase';
import type { SignedTransaction } from '../../../src/core/domain/entities/SignedTransaction';
import type { GetRbfInfoParams } from '../../../src/core/domain/usecases/transaction/AccelerateTransactionUseCase';
import { DUST_THRESHOLD_SATS } from '../../../src/core/domain/usecases/transaction/BuildTransactionUseCase';

const WALLET_ID = 'wallet-1';
const TXID = 'aaaa' + '00'.repeat(30);
const TO_ADDRESS = 'tb1qrecipient000000000000000000000000000';
const CHANGE_ADDRESS = 'tb1qchange0000000000000000000000000000000';

const RBF_RAW_TX: RawTransaction = {
  txid: TXID,
  inputs: [
    {
      txid: 'prev' + '00'.repeat(30),
      vout: 0,
      sequence: 0xFFFFFFFD, // RBF signal
      prevoutAddress: 'tb1qsender',
      prevoutValue: 1_000_000,
      scriptPubKey: '00140000000000000000000000000000000000000000',
    },
  ],
  outputs: [
    { address: TO_ADDRESS, valueSats: 800_000 },
    { address: CHANGE_ADDRESS, valueSats: 196_000 },
  ],
  feeSats: 4_000,
  isRbfEligible: true,
};

const NON_RBF_RAW_TX: RawTransaction = {
  ...RBF_RAW_TX,
  inputs: [{ ...RBF_RAW_TX.inputs[0], sequence: 0xFFFFFFFF }],
  isRbfEligible: false,
};

const SIGNED_TX: SignedTransaction = {
  rawHex: 'deadbeef',
  txid: 'new-txid' + '00'.repeat(28),
  builtTransaction: {
    id: 'built-1',
    walletId: WALLET_ID,
    inputs: [],
    outputs: [
      { address: TO_ADDRESS, amountSats: 800_000, isChange: false },
      { address: CHANGE_ADDRESS, amountSats: 190_000, isChange: true },
    ],
    amountSats: 800_000,
    feeSats: 10_000,
    totalSats: 1_000_000,
    changeSats: 190_000,
    feeRateSatsPerVByte: 10,
    estimatedVBytes: 1000,
    status: 'built',
    createdAt: new Date().toISOString(),
  },
};

const BROADCAST_RESULT = { txid: SIGNED_TX.txid, transaction: { id: SIGNED_TX.txid, txid: SIGNED_TX.txid, amountSats: 800_000, direction: 'outgoing' as const, status: 'pending' as const, createdAt: new Date().toISOString() } };

function makeBlockchainProvider(rawTx: RawTransaction = RBF_RAW_TX): jest.Mocked<BlockchainProvider> {
  return {
    getBalance: jest.fn(),
    getUtxos: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionStatus: jest.fn(),
    getCurrentBlockHeight: jest.fn(),
    getFeeRates: jest.fn(),
    broadcastTransaction: jest.fn(),
    getRawTransaction: jest.fn().mockResolvedValue(rawTx),
  };
}

function makeFeeEstimation(vBytes = 180): jest.Mocked<IFeeEstimationService> {
  return {
    estimateVBytes: jest.fn().mockReturnValue(vBytes),
    estimateFeeSats: jest.fn().mockReturnValue(vBytes),
  };
}

function makeSignUseCase(): jest.Mocked<SignTransactionUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(SIGNED_TX),
  } as unknown as jest.Mocked<SignTransactionUseCase>;
}

function makeBroadcastUseCase(): jest.Mocked<BroadcastTransactionUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(BROADCAST_RESULT),
  } as unknown as jest.Mocked<BroadcastTransactionUseCase>;
}

function makeUseCase(
  blockchainProvider = makeBlockchainProvider(),
  feeEstimation = makeFeeEstimation(),
  signUseCase = makeSignUseCase(),
  broadcastUseCase = makeBroadcastUseCase(),
) {
  return new AccelerateTransactionUseCase(
    blockchainProvider,
    feeEstimation,
    signUseCase,
    broadcastUseCase,
  );
}

const BASE_PARAMS: GetRbfInfoParams = {
  txid: TXID,
  toAddress: TO_ADDRESS,
  walletIsWatchOnly: false,
  isConfirmed: false,
};

describe('AccelerateTransactionUseCase', () => {
  describe('getRbfInfo', () => {
    it('returns ineligible for watch-only wallet', async () => {
      const useCase = makeUseCase();
      const info = await useCase.getRbfInfo({ ...BASE_PARAMS, walletIsWatchOnly: true });
      expect(info.isRbfEligible).toBe(false);
      expect(info.ineligibilityReason).toBe('watch-only');
    });

    it('does not call blockchainProvider for watch-only wallet', async () => {
      const blockchainProvider = makeBlockchainProvider();
      const useCase = makeUseCase(blockchainProvider);
      await useCase.getRbfInfo({ ...BASE_PARAMS, walletIsWatchOnly: true });
      expect(blockchainProvider.getRawTransaction).not.toHaveBeenCalled();
    });

    it('returns ineligible for already-confirmed transaction', async () => {
      const useCase = makeUseCase();
      const info = await useCase.getRbfInfo({ ...BASE_PARAMS, isConfirmed: true });
      expect(info.isRbfEligible).toBe(false);
      expect(info.ineligibilityReason).toBe('already-confirmed');
    });

    it('does not call blockchainProvider for confirmed transaction', async () => {
      const blockchainProvider = makeBlockchainProvider();
      const useCase = makeUseCase(blockchainProvider);
      await useCase.getRbfInfo({ ...BASE_PARAMS, isConfirmed: true });
      expect(blockchainProvider.getRawTransaction).not.toHaveBeenCalled();
    });

    it('returns ineligible when no RBF signal in inputs', async () => {
      const useCase = makeUseCase(makeBlockchainProvider(NON_RBF_RAW_TX));
      const info = await useCase.getRbfInfo(BASE_PARAMS);
      expect(info.isRbfEligible).toBe(false);
      expect(info.ineligibilityReason).toBe('no-rbf-signal');
    });

    it('returns ineligible when toAddress not found in outputs', async () => {
      const rawTx: RawTransaction = {
        ...RBF_RAW_TX,
        outputs: [
          { address: 'some-other-address', valueSats: 800_000 },
          { address: CHANGE_ADDRESS, valueSats: 196_000 },
        ],
      };
      const useCase = makeUseCase(makeBlockchainProvider(rawTx));
      const info = await useCase.getRbfInfo(BASE_PARAMS);
      expect(info.isRbfEligible).toBe(false);
      expect(info.ineligibilityReason).toBe('no-change');
    });

    it('returns ineligible when no change output exists', async () => {
      const rawTx: RawTransaction = {
        ...RBF_RAW_TX,
        outputs: [
          { address: TO_ADDRESS, valueSats: 996_000 },
          // no change output
        ],
      };
      const useCase = makeUseCase(makeBlockchainProvider(rawTx));
      const info = await useCase.getRbfInfo(BASE_PARAMS);
      expect(info.isRbfEligible).toBe(false);
      expect(info.ineligibilityReason).toBe('no-change');
    });

    it('returns correct info for an eligible transaction', async () => {
      const feeEstimation = makeFeeEstimation(180);
      const useCase = makeUseCase(makeBlockchainProvider(RBF_RAW_TX), feeEstimation);
      const info = await useCase.getRbfInfo(BASE_PARAMS);

      expect(info.isRbfEligible).toBe(true);
      expect(info.originalTxid).toBe(TXID);
      expect(info.toAddress).toBe(TO_ADDRESS);
      expect(info.recipientAmountSats).toBe(800_000);
      expect(info.changeAddress).toBe(CHANGE_ADDRESS);
      expect(info.changeAmountSats).toBe(196_000);
      expect(info.currentFeeSats).toBe(4_000);
      expect(info.estimatedVBytes).toBe(180);
      expect(info.rawInputs).toHaveLength(1);
    });

    it('calculates currentFeeRate as ceil(feeSats / vBytes)', async () => {
      const feeEstimation = makeFeeEstimation(200);
      const rawTx = { ...RBF_RAW_TX, feeSats: 901 };
      const useCase = makeUseCase(makeBlockchainProvider(rawTx), feeEstimation);
      const info = await useCase.getRbfInfo(BASE_PARAMS);
      // 901 / 200 = 4.505 → ceil = 5
      expect(info.currentFeeRate).toBe(5);
    });
  });

  describe('execute', () => {
    const ELIGIBLE_INFO = {
      originalTxid: TXID,
      isRbfEligible: true,
      toAddress: TO_ADDRESS,
      recipientAmountSats: 800_000,
      changeAddress: CHANGE_ADDRESS,
      changeAmountSats: 196_000,
      currentFeeSats: 4_000,
      currentFeeRate: 5,
      estimatedVBytes: 180,
      rawInputs: RBF_RAW_TX.inputs,
    };

    it('throws NOT_RBF_ELIGIBLE when rbfInfo is not eligible', async () => {
      const useCase = makeUseCase();
      const ineligibleInfo = { ...ELIGIBLE_INFO, isRbfEligible: false };
      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          walletNetwork: 'testnet',
          rbfInfo: ineligibleInfo,
          newFeeRateSatsPerVByte: 10,
        }),
      ).rejects.toThrow(AppError);
    });

    it('throws FEE_NOT_HIGHER when new fee does not exceed current fee', async () => {
      const useCase = makeUseCase(undefined, makeFeeEstimation(180));
      // 180 * 1 = 180 sats, current is 4000 → not higher
      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          walletNetwork: 'testnet',
          rbfInfo: ELIGIBLE_INFO,
          newFeeRateSatsPerVByte: 1,
        }),
      ).rejects.toThrow(AppError);
    });

    it('throws INSUFFICIENT_FUNDS when change would be negative', async () => {
      const useCase = makeUseCase(undefined, makeFeeEstimation(180));
      // totalInput=1_000_000, recipient=800_000, fee=180*1200=216_000 → change=-16_000
      await expect(
        useCase.execute({
          walletId: WALLET_ID,
          walletNetwork: 'testnet',
          rbfInfo: ELIGIBLE_INFO,
          newFeeRateSatsPerVByte: 1200,
        }),
      ).rejects.toThrow(AppError);
    });

    it('calls signTransaction and broadcastTransaction on success', async () => {
      const signUseCase = makeSignUseCase();
      const broadcastUseCase = makeBroadcastUseCase();
      const useCase = makeUseCase(undefined, makeFeeEstimation(180), signUseCase, broadcastUseCase);

      await useCase.execute({
        walletId: WALLET_ID,
        walletNetwork: 'testnet',
        rbfInfo: ELIGIBLE_INFO,
        newFeeRateSatsPerVByte: 30, // 180*30=5400 > 4000, change=1000000-800000-5400=194600 >= 0
      });

      expect(signUseCase.execute).toHaveBeenCalledTimes(1);
      expect(broadcastUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('returns the broadcast result', async () => {
      const useCase = makeUseCase(undefined, makeFeeEstimation(180));
      const result = await useCase.execute({
        walletId: WALLET_ID,
        walletNetwork: 'testnet',
        rbfInfo: ELIGIBLE_INFO,
        newFeeRateSatsPerVByte: 30,
      });

      expect(result.txid).toBe(BROADCAST_RESULT.txid);
    });

    it('omits change output when change < DUST_THRESHOLD', async () => {
      const signUseCase = makeSignUseCase();
      const useCase = makeUseCase(undefined, makeFeeEstimation(180), signUseCase);

      // Adjust to leave change just below dust: total=1_000_000, recipient=800_000
      // need fee such that change < 546: fee > 199_454
      // 180 * 1109 = 199620 → change = 1_000_000 - 800_000 - 199_620 = 380 < 546
      await useCase.execute({
        walletId: WALLET_ID,
        walletNetwork: 'testnet',
        rbfInfo: ELIGIBLE_INFO,
        newFeeRateSatsPerVByte: 1109,
      });

      const callArgs = signUseCase.execute.mock.calls[0][0];
      const builtTx = callArgs.builtTransaction;
      // Change output should be omitted since change < DUST_THRESHOLD_SATS
      const changeOutput = builtTx.outputs.find((o: { isChange: boolean }) => o.isChange);
      expect(changeOutput).toBeUndefined();
    });

    it('includes change output when change >= DUST_THRESHOLD', async () => {
      const signUseCase = makeSignUseCase();
      const useCase = makeUseCase(undefined, makeFeeEstimation(180), signUseCase);

      await useCase.execute({
        walletId: WALLET_ID,
        walletNetwork: 'testnet',
        rbfInfo: ELIGIBLE_INFO,
        newFeeRateSatsPerVByte: 30, // change = 1_000_000 - 800_000 - 5400 = 194600
      });

      const callArgs = signUseCase.execute.mock.calls[0][0];
      const builtTx = callArgs.builtTransaction;
      const changeOutput = builtTx.outputs.find((o: { isChange: boolean }) => o.isChange);
      expect(changeOutput).toBeDefined();
      expect(changeOutput!.amountSats).toBe(194_600);
    });

    it('passes walletId and walletNetwork to signTransaction', async () => {
      const signUseCase = makeSignUseCase();
      const useCase = makeUseCase(undefined, makeFeeEstimation(180), signUseCase);

      await useCase.execute({
        walletId: WALLET_ID,
        walletNetwork: 'testnet',
        rbfInfo: ELIGIBLE_INFO,
        newFeeRateSatsPerVByte: 30,
      });

      const callArgs = signUseCase.execute.mock.calls[0][0];
      expect(callArgs.walletId).toBe(WALLET_ID);
      expect(callArgs.network).toBe('testnet');
    });
  });

  describe('DUST_THRESHOLD_SATS constant', () => {
    it('is 546 sats as per BIP-141 dust limit', () => {
      expect(DUST_THRESHOLD_SATS).toBe(546);
    });
  });
});
