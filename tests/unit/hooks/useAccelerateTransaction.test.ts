import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAccelerateTransaction } from '../../../src/presentation/hooks/useAccelerateTransaction';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { RbfInfo } from '../../../src/core/domain/entities/RbfInfo';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { GetRbfInfoParams, AccelerateTransactionParams } from '../../../src/core/domain/usecases/transaction/AccelerateTransactionUseCase';
import type { BroadcastResult } from '../../../src/core/domain/usecases/transaction/BroadcastTransactionUseCase';

const TXID = 'aaaa' + '00'.repeat(30);
const TO_ADDRESS = 'tb1qrecipient000000000000000000000000000';
const CHANGE_ADDRESS = 'tb1qchange0000000000000000000000000000000';
const NEW_TXID = 'bbbb' + '00'.repeat(30);

const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Test Wallet',
  network: 'testnet',
  status: 'locked',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const ELIGIBLE_RBF_INFO: RbfInfo = {
  originalTxid: TXID,
  isRbfEligible: true,
  toAddress: TO_ADDRESS,
  recipientAmountSats: 800_000,
  changeAddress: CHANGE_ADDRESS,
  changeAmountSats: 196_000,
  currentFeeSats: 4_000,
  currentFeeRate: 5,
  estimatedVBytes: 180,
  rawInputs: [
    {
      txid: 'prev' + '00'.repeat(30),
      vout: 0,
      sequence: 0xFFFFFFFD,
      prevoutAddress: 'tb1qsender',
      prevoutValue: 1_000_000,
      scriptPubKey: '00140000000000000000000000000000000000000000',
    },
  ],
};


const BROADCAST_RESULT: BroadcastResult = {
  txid: NEW_TXID,
  transaction: {
    id: NEW_TXID,
    txid: NEW_TXID,
    amountSats: 800_000,
    direction: 'outgoing',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
};

const mockGetRbfInfo = jest.fn<Promise<RbfInfo>, [GetRbfInfoParams]>();
const mockAccelerate = jest.fn<Promise<BroadcastResult>, [AccelerateTransactionParams]>();
let mockSelectedWallet: Wallet | null = WALLET;

jest.mock('../../../src/app/providers/AccelerateProvider', () => ({
  useAccelerate: () => ({
    getRbfInfo: mockGetRbfInfo,
    accelerate: mockAccelerate,
  }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: mockSelectedWallet,
  }),
}));

describe('useAccelerateTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = WALLET;
    mockGetRbfInfo.mockResolvedValue(ELIGIBLE_RBF_INFO);
    mockAccelerate.mockResolvedValue(BROADCAST_RESULT);
  });

  describe('initial load', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      expect(result.current.isLoadingInfo).toBe(true);
    });

    it('calls getRbfInfo on mount with correct params', async () => {
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));
      expect(mockGetRbfInfo).toHaveBeenCalledWith({
        txid: TXID,
        toAddress: TO_ADDRESS,
        walletIsWatchOnly: false,
        isConfirmed: false,
        walletNetwork: WALLET.network,
      });
    });

    it('sets rbfInfo after loading', async () => {
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));
      expect(result.current.rbfInfo).toEqual(ELIGIBLE_RBF_INFO);
    });

    it('sets default newFeeRate to currentFeeRate + 1 when eligible', async () => {
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));
      expect(result.current.newFeeRateSatsPerVByte).toBe(ELIGIBLE_RBF_INFO.currentFeeRate + 1);
    });

    it('sets infoError when getRbfInfo throws', async () => {
      mockGetRbfInfo.mockRejectedValue(new AppError('Network error', 'NETWORK_ERROR'));
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));
      expect(result.current.infoError).toBe('Network error');
    });

    it('detects watch-only wallet from status', async () => {
      mockSelectedWallet = { ...WALLET, status: 'watch-only' };
      renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(mockGetRbfInfo).toHaveBeenCalled());
      expect(mockGetRbfInfo).toHaveBeenCalledWith(
        expect.objectContaining({ walletIsWatchOnly: true }),
      );
    });
  });

  describe('fee rate updates', () => {
    it('updates newFeeRateSatsPerVByte when setNewFeeRate is called', async () => {
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));

      act(() => {
        result.current.setNewFeeRate(20);
      });

      expect(result.current.newFeeRateSatsPerVByte).toBe(20);
    });

    it('calculates newFeeSats = estimatedVBytes * newFeeRate', async () => {
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));

      act(() => {
        result.current.setNewFeeRate(10);
      });

      // 180 vBytes * 10 = 1800
      expect(result.current.newFeeSats).toBe(1800);
    });

    it('calculates newRecipientSats = totalInput - change - newFee', async () => {
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));

      act(() => {
        result.current.setNewFeeRate(10);
      });

      // totalInput = 1_000_000, change = 196_000, fee = 1800 → recipient = 802_200
      expect(result.current.newRecipientSats).toBe(802_200);
    });
  });

  describe('accelerate', () => {
    it('calls accelerate use case with correct params', async () => {
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));

      act(() => {
        result.current.setNewFeeRate(10);
      });

      await act(async () => {
        await result.current.accelerate();
      });

      expect(mockAccelerate).toHaveBeenCalledWith({
        walletId: WALLET.id,
        walletNetwork: WALLET.network,
        rbfInfo: ELIGIBLE_RBF_INFO,
        newFeeRateSatsPerVByte: 10,
      });
    });

    it('sets acceleratedTxid on success', async () => {
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));

      await act(async () => {
        await result.current.accelerate();
      });

      expect(result.current.acceleratedTxid).toBe(NEW_TXID);
    });

    it('sets accelerateError on failure', async () => {
      mockAccelerate.mockRejectedValue(new AppError('Fee too low', 'FEE_NOT_HIGHER'));
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));

      await act(async () => {
        await result.current.accelerate();
      });

      expect(result.current.accelerateError).toBe('Fee too low');
      expect(result.current.acceleratedTxid).toBeNull();
    });

    it('sets isAccelerating=true while accelerating', async () => {
      let resolveAccelerate!: (value: BroadcastResult) => void;
      mockAccelerate.mockReturnValue(new Promise(resolve => { resolveAccelerate = resolve; }));

      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));

      act(() => {
        result.current.accelerate().catch(() => {});
      });

      await waitFor(() => expect(result.current.isAccelerating).toBe(true));

      await act(async () => {
        resolveAccelerate(BROADCAST_RESULT);
      });

      expect(result.current.isAccelerating).toBe(false);
    });

    it('does nothing when rbfInfo is null', async () => {
      mockGetRbfInfo.mockRejectedValue(new AppError('error', 'ERR'));
      const { result } = renderHook(() =>
        useAccelerateTransaction({ txid: TXID, toAddress: TO_ADDRESS, isConfirmed: false }),
      );
      await waitFor(() => expect(result.current.isLoadingInfo).toBe(false));

      await act(async () => {
        await result.current.accelerate();
      });

      expect(mockAccelerate).not.toHaveBeenCalled();
    });
  });
});
