import { renderHook, act } from '@testing-library/react-native';
import { useConfirmTransaction } from '../../../src/presentation/hooks/useConfirmTransaction';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';
import type { WalletAddress } from '../../../src/core/domain/entities/WalletAddress';
import type { BroadcastResult } from '../../../src/core/domain/usecases/transaction/BroadcastTransactionUseCase';

const WALLET: Wallet = {
  id: 'wallet-1',
  name: 'Primary',
  network: 'mainnet',
  status: 'locked',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const BROADCAST_RESULT: BroadcastResult = {
  txid: 'deadbeef',
  transaction: {
    id: 'deadbeef',
    amountSats: 99_100,
    feeSats: 900,
    toAddress: 'bc1q...',
    status: 'pending',
    direction: 'out',
    timestamp: Date.now(),
    inputs: [],
    outputs: [],
    rbfEnabled: false,
  } as any,
};

const mockSend = jest.fn<Promise<BroadcastResult>, any[]>();
const mockListAddresses = jest.fn<Promise<WalletAddress[]>, any[]>();

let mockSelectedWallet: Wallet | null = WALLET;

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({ selectedWallet: mockSelectedWallet }),
}));

jest.mock('../../../src/app/providers/SendProvider', () => ({
  useSend: () => ({ send: mockSend }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({ listAddresses: mockListAddresses }),
}));

const OPTS = {
  toAddress: 'bc1qrecipient',
  amountSats: '100000',
  selectedFeeRate: 5,
  payFee: false,
};

describe('useConfirmTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedWallet = WALLET;
    mockSend.mockResolvedValue(BROADCAST_RESULT);
    mockListAddresses.mockResolvedValue([]);
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useConfirmTransaction(OPTS));
    expect(result.current.isSending).toBe(false);
    expect(result.current.sendError).toBeNull();
    expect(result.current.sentResult).toBeNull();
  });

  it('calls send with correct params on sendTransaction', async () => {
    const { result } = renderHook(() => useConfirmTransaction(OPTS));
    await act(async () => {
      await result.current.sendTransaction();
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'wallet-1',
        toAddress: 'bc1qrecipient',
        amountSats: 100_000,
        feeRateSatsPerVByte: 5,
        subtractFeeFromAmount: true,
      }),
    );
  });

  it('passes subtractFeeFromAmount=false when payFee is true', async () => {
    const { result } = renderHook(() =>
      useConfirmTransaction({ ...OPTS, payFee: true }),
    );
    await act(async () => {
      await result.current.sendTransaction();
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ subtractFeeFromAmount: false }),
    );
  });

  it('sets sentResult on success', async () => {
    const { result } = renderHook(() => useConfirmTransaction(OPTS));
    await act(async () => {
      await result.current.sendTransaction();
    });
    expect(result.current.sentResult).toEqual(BROADCAST_RESULT);
    expect(result.current.sendError).toBeNull();
  });

  it('sets sendError on failure', async () => {
    mockSend.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHook(() => useConfirmTransaction(OPTS));
    await act(async () => {
      await result.current.sendTransaction();
    });
    expect(result.current.sendError).not.toBeNull();
    expect(result.current.sentResult).toBeNull();
  });

  it('sets isSending true while sending', async () => {
    let resolveSend!: (v: BroadcastResult) => void;
    mockSend.mockReturnValue(new Promise(r => { resolveSend = r; }));

    const { result } = renderHook(() => useConfirmTransaction(OPTS));

    act(() => { result.current.sendTransaction().catch(() => {}); });
    expect(result.current.isSending).toBe(true);

    await act(async () => { resolveSend(BROADCAST_RESULT); });
    expect(result.current.isSending).toBe(false);
  });

  it('does nothing when selectedWallet is null', async () => {
    mockSelectedWallet = null;
    const { result } = renderHook(() => useConfirmTransaction(OPTS));
    await act(async () => { await result.current.sendTransaction(); });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does nothing when amountSats is invalid', async () => {
    const { result } = renderHook(() =>
      useConfirmTransaction({ ...OPTS, amountSats: 'abc' }),
    );
    await act(async () => { await result.current.sendTransaction(); });
    expect(mockSend).not.toHaveBeenCalled();
  });

  describe('minimum fee rate validation', () => {
    it('does not call send when amountSats is zero', async () => {
      const { result } = renderHook(() =>
        useConfirmTransaction({ ...OPTS, amountSats: '0' }),
      );
      await act(async () => { await result.current.sendTransaction(); });
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
