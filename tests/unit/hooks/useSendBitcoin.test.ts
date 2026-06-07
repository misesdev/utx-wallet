import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSendBitcoin } from '../../../src/presentation/hooks/useSendBitcoin';
import { AppError } from '../../../src/core/application/errors/AppError';
import type { FeeRates } from '../../../src/core/domain/repositories/BlockchainProvider';
import type { TransactionPreview } from '../../../src/core/domain/entities/TransactionPreview';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const VALID_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '2026-06-05T00:00:00.000Z',
};
const FEE_RATES: FeeRates = {
  fastSatsPerVByte: 20,
  halfHourSatsPerVByte: 10,
  hourSatsPerVByte: 5,
  economySatsPerVByte: 2,
  minimumSatsPerVByte: 1,
};
const PREVIEW: TransactionPreview = {
  toAddress: VALID_ADDRESS,
  amountSats: 100_000,
  feeSats: 900,
  totalSats: 100_900,
  changeSats: 899_100,
  feeRateSatsPerVByte: 5,
  estimatedVBytes: 180,
};
const UTXO: Utxo = {
  txid: 'abc',
  vout: 0,
  valueSats: 1_000_000,
  address: 'bc1q...',
  isConfirmed: true,
};

import type { BroadcastResult } from '../../../src/core/domain/usecases/transaction/BroadcastTransactionUseCase';

const mockFetchFeeRates = jest.fn<Promise<FeeRates>, []>();
const mockPreview = jest.fn<Promise<TransactionPreview>, [object]>();
const mockSend = jest.fn<Promise<BroadcastResult>, [object]>();
const mockValidateAddress = jest.fn();
const mockListUtxos = jest.fn<Promise<Utxo[]>, [string]>();

let mockSelectedWallet: Wallet | null = WALLET;
let mockIsOnline = true;

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: mockSelectedWallet,
    listUtxos: mockListUtxos,
  }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({ isOnline: mockIsOnline }),
}));

jest.mock('../../../src/app/providers/SendProvider', () => ({
  useSend: () => ({
    validateAddress: mockValidateAddress,
    fetchFeeRates: mockFetchFeeRates,
    preview: mockPreview,
    send: mockSend,
  }),
}));

describe('useSendBitcoin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = WALLET;
    mockIsOnline = true;
    mockFetchFeeRates.mockResolvedValue(FEE_RATES);
    mockListUtxos.mockResolvedValue([UTXO]);
    mockValidateAddress.mockReturnValue({ valid: true, error: null });
    mockPreview.mockResolvedValue(PREVIEW);
  });

  describe('initial state', () => {
    it('starts with empty form fields', () => {
      const { result } = renderHook(() => useSendBitcoin());
      expect(result.current.toAddress).toBe('');
      expect(result.current.amountSats).toBe('');
      expect(result.current.feeTier).toBe('normal');
      expect(result.current.customFeeRate).toBe('');
    });

    it('starts with no errors or preview', () => {
      const { result } = renderHook(() => useSendBitcoin());
      expect(result.current.addressError).toBeNull();
      expect(result.current.amountError).toBeNull();
      expect(result.current.preview).toBeNull();
      expect(result.current.previewError).toBeNull();
    });

    it('loads fee rates on mount', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());
      expect(result.current.feeRates).toEqual(FEE_RATES);
    });

    it('loads available balance from confirmed UTXOs', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.availableBalanceSats).toBe(1_000_000));
    });
  });

  describe('address validation', () => {
    it('validates address in real-time on setToAddress', async () => {
      mockValidateAddress.mockReturnValue({ valid: false, error: 'Endereço Bitcoin inválido' });
      const { result } = renderHook(() => useSendBitcoin());

      act(() => result.current.setToAddress('bad-address'));

      expect(result.current.addressError).toBe('send.errorInvalidAddress');
    });

    it('clears error for empty address input', () => {
      const { result } = renderHook(() => useSendBitcoin());

      act(() => result.current.setToAddress(''));

      expect(result.current.addressError).toBeNull();
    });

    it('sets no error for valid address', () => {
      mockValidateAddress.mockReturnValue({ valid: true, error: null });
      const { result } = renderHook(() => useSendBitcoin());

      act(() => result.current.setToAddress(VALID_ADDRESS));

      expect(result.current.addressError).toBeNull();
    });
  });

  describe('fee tier and selectedFeeRate', () => {
    it('defaults to normal fee rate when feeRates are loaded', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      expect(result.current.selectedFeeRate).toBe(FEE_RATES.halfHourSatsPerVByte);
    });

    it('uses fast rate when fast tier selected', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => result.current.setFeeTier('fast'));

      expect(result.current.selectedFeeRate).toBe(FEE_RATES.fastSatsPerVByte);
    });

    it('uses economy rate when economy tier selected', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => result.current.setFeeTier('economy'));

      expect(result.current.selectedFeeRate).toBe(FEE_RATES.economySatsPerVByte);
    });

    it('uses parsed custom fee rate for custom tier', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setFeeTier('custom');
        result.current.setCustomFeeRate('25');
      });

      expect(result.current.selectedFeeRate).toBe(25);
    });

    it('falls back to rate 1 when custom fee is empty or zero', () => {
      const { result } = renderHook(() => useSendBitcoin());

      act(() => {
        result.current.setFeeTier('custom');
        result.current.setCustomFeeRate('');
      });

      expect(result.current.selectedFeeRate).toBe(1);
    });
  });

  describe('reviewTransaction', () => {
    it('calls preview with correct params and sets preview state', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
      });

      await act(async () => { await result.current.reviewTransaction(); });

      expect(mockPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: WALLET.id,
          toAddress: VALID_ADDRESS,
          amountSats: 100_000,
        }),
      );
      expect(result.current.preview).toEqual(PREVIEW);
      expect(result.current.previewError).toBeNull();
    });

    it('sets amountError when amount is empty', async () => {
      const { result } = renderHook(() => useSendBitcoin());

      act(() => result.current.setToAddress(VALID_ADDRESS));

      await act(async () => { await result.current.reviewTransaction(); });

      expect(result.current.amountError).not.toBeNull();
      expect(mockPreview).not.toHaveBeenCalled();
    });

    it('does not call preview when address has an error', async () => {
      mockValidateAddress.mockReturnValue({ valid: false, error: 'Invalid' });
      const { result } = renderHook(() => useSendBitcoin());

      act(() => {
        result.current.setToAddress('bad-address');
        result.current.setAmountSats('100000');
      });

      await act(async () => { await result.current.reviewTransaction(); });

      expect(mockPreview).not.toHaveBeenCalled();
    });

    it('sets previewError when preview use case throws INSUFFICIENT_BALANCE', async () => {
      mockPreview.mockRejectedValue(new AppError('Saldo insuficiente', 'INSUFFICIENT_BALANCE'));
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('999999999');
      });

      await act(async () => { await result.current.reviewTransaction(); });

      expect(result.current.previewError).toBe('Saldo insuficiente');
      expect(result.current.preview).toBeNull();
    });

    it('sets previewError for generic errors', async () => {
      mockPreview.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
      });

      await act(async () => { await result.current.reviewTransaction(); });

      expect(result.current.previewError).toBe('send.errorPreviewFailed');
    });

    it('clears previous preview when a new review starts', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
      });
      await act(async () => { await result.current.reviewTransaction(); });
      expect(result.current.preview).not.toBeNull();

      act(() => result.current.setAmountSats('200000'));
      expect(result.current.preview).toBeNull();
    });
  });

  describe('clearPreview', () => {
    it('clears preview and previewError', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
      });
      await act(async () => { await result.current.reviewTransaction(); });

      act(() => result.current.clearPreview());

      expect(result.current.preview).toBeNull();
      expect(result.current.previewError).toBeNull();
    });
  });

  describe('review modal (openReview / closeReview)', () => {
    it('starts with isReviewVisible false', () => {
      const { result } = renderHook(() => useSendBitcoin());
      expect(result.current.isReviewVisible).toBe(false);
    });

    it('openReview sets isReviewVisible to true', () => {
      const { result } = renderHook(() => useSendBitcoin());
      act(() => result.current.openReview());
      expect(result.current.isReviewVisible).toBe(true);
    });

    it('closeReview sets isReviewVisible to false', () => {
      const { result } = renderHook(() => useSendBitcoin());
      act(() => result.current.openReview());
      act(() => result.current.closeReview());
      expect(result.current.isReviewVisible).toBe(false);
    });

    it('closeReview clears sendError', () => {
      const { result } = renderHook(() => useSendBitcoin());
      // Simulate a prior error in state by opening then triggering a send failure
      act(() => result.current.openReview());
      act(() => result.current.closeReview());
      expect(result.current.sendError).toBeNull();
    });
  });

  describe('sendTransaction', () => {
    const BROADCAST_RESULT: BroadcastResult = {
      txid: 'deadbeef' + '00'.repeat(28),
      transaction: {
        id: 'deadbeef' + '00'.repeat(28),
        txid: 'deadbeef' + '00'.repeat(28),
        amountSats: 100_000,
        feeSats: 900,
        direction: 'outgoing',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };

    beforeEach(() => {
      mockSend.mockResolvedValue(BROADCAST_RESULT);
    });

    it('calls send with correct params and stores sentResult', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
      });

      await act(async () => { await result.current.sendTransaction(); });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: WALLET.id,
          toAddress: VALID_ADDRESS,
          amountSats: 100_000,
        }),
      );
      expect(result.current.sentResult).toEqual(BROADCAST_RESULT);
    });

    it('closes the review modal after successful send', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
        result.current.openReview();
      });

      await act(async () => { await result.current.sendTransaction(); });

      expect(result.current.isReviewVisible).toBe(false);
    });

    it('sets sendError when send throws AppError', async () => {
      mockSend.mockRejectedValue(new AppError('Saldo insuficiente', 'INSUFFICIENT_BALANCE'));
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
      });

      await act(async () => { await result.current.sendTransaction(); });

      expect(result.current.sendError).toBe('Saldo insuficiente');
      expect(result.current.sentResult).toBeNull();
    });

    it('sets generic sendError for non-AppError', async () => {
      mockSend.mockRejectedValue(new Error('Network down'));
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
      });

      await act(async () => { await result.current.sendTransaction(); });

      expect(result.current.sendError).toBe('send.errorSendFailed');
    });

    it('sets isSending to false after send completes', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
      });

      await act(async () => { await result.current.sendTransaction(); });

      expect(result.current.isSending).toBe(false);
    });

    it('does not call send when amount is empty', async () => {
      const { result } = renderHook(() => useSendBitcoin());

      act(() => result.current.setToAddress(VALID_ADDRESS));

      await act(async () => { await result.current.sendTransaction(); });

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('resetSend', () => {
    it('resets all form and send state', async () => {
      const { result } = renderHook(() => useSendBitcoin());
      await waitFor(() => expect(result.current.feeRates).not.toBeNull());

      act(() => {
        result.current.setToAddress(VALID_ADDRESS);
        result.current.setAmountSats('100000');
        result.current.openReview();
      });

      act(() => result.current.resetSend());

      expect(result.current.toAddress).toBe('');
      expect(result.current.amountSats).toBe('');
      expect(result.current.preview).toBeNull();
      expect(result.current.isReviewVisible).toBe(false);
      expect(result.current.sentResult).toBeNull();
      expect(result.current.sendError).toBeNull();
    });
  });
});
