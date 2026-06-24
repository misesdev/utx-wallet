/**
 * Tests that the hideBalance security setting correctly masks balances
 * across all affected screens.
 */
import React from 'react';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { HomeScreen } from '../../../src/presentation/screens/home/HomeScreen';
import { SendScreen } from '../../../src/presentation/screens/wallet/SendScreen';
import { TransactionListScreen } from '../../../src/presentation/screens/wallet/TransactionListScreen';
import { useSecurity } from '../../../src/app/providers/SecurityProvider';
import type { HomeWalletState } from '../../../src/presentation/hooks/useHomeWallet';
import type { WalletSyncState } from '../../../src/presentation/hooks/useWalletSync';
import type { SendBitcoinState } from '../../../src/presentation/hooks/useSendBitcoin';
import type { Transaction } from '../../../src/core/domain/entities/Transaction';

// ─── security mock helper ─────────────────────────────────────────────────────

function makeSecurityMock(hideBalance: boolean) {
  return {
    settings: {
      pinEnabled: false,
      biometricEnabled: false,
      autoLockSeconds: 300,
      hideBalance,
      blockScreenshots: true,
    },
    biometricAvailable: false,
    biometricType: 'none',
    isLoading: false,
    updateSettings: jest.fn(),
    setupPin: jest.fn(),
    validatePin: jest.fn().mockResolvedValue(true),
    removePin: jest.fn(),
    reauthenticate: jest.fn().mockResolvedValue(true),
  };
}

// ─── mutable module state (mock-prefix required by jest hoisting rules) ───────

let mockHomeWalletState: HomeWalletState = {
  wallet: { id: 'w1', name: 'Primary', network: 'testnet4', status: 'locked', createdAt: '' },
  confirmedBalanceSats: 500_000,
  pendingBalanceSats: 0,
  networkConfig: { connectivityMode: 'online', personalNodes: [], allowPublicFallback: false },
  isOnline: true,
  isSafeMode: false,
  transactions: [],
  isLoading: false,
  error: null,
  refresh: jest.fn().mockResolvedValue(undefined),
};

const mockSendBitcoinState: SendBitcoinState = {
  toAddress: '',
  amountSats: '',
  feeTier: 'normal',
  customFeeRate: '',
  availableBalanceSats: 1_000_000,
  feeRates: null,
  isLoadingFeeRates: false,
  addressError: null,
  amountError: null,
  preview: null,
  isPreviewing: false,
  previewError: null,
  selectedFeeRate: 10,
  isReviewVisible: false,
  isSending: false,
  sendError: null,
  sentResult: null,
  isWatchOnly: false,
  setToAddress: jest.fn(),
  setAmountSats: jest.fn(),
  setFeeTier: jest.fn(),
  setCustomFeeRate: jest.fn(),
  reviewTransaction: jest.fn(),
  clearPreview: jest.fn(),
  openReview: jest.fn(),
  closeReview: jest.fn(),
  sendTransaction: jest.fn(),
  resetSend: jest.fn(),
  payFee: false,
  setPayFee: jest.fn(),
};

// ─── module mocks ─────────────────────────────────────────────────────────────

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('../../../src/presentation/hooks/useHomeWallet', () => ({
  useHomeWallet: () => mockHomeWalletState,
}));

jest.mock('../../../src/presentation/hooks/useWalletSync', () => ({
  useWalletSync: (): WalletSyncState => ({
    isSyncing: false,
    lastSyncAt: null,
    syncResult: null,
    syncError: null,
    syncProgress: null,
    sync: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../src/app/providers/AddressManagerProvider', () => ({
  useAddressManager: () => ({ getOrigins: jest.fn().mockResolvedValue([]) }),
}));

jest.mock('../../../src/presentation/hooks/useAccountSummaries', () => ({
  useAccountSummaries: () => ({ summaries: [], isLoading: false, reload: jest.fn() }),
}));

jest.mock('../../../src/presentation/hooks/useSendBitcoin', () => ({
  useSendBitcoin: () => mockSendBitcoinState,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

// ─── HomeScreen: hideBalance ──────────────────────────────────────────────────

const INCOMING_TX: Transaction = {
  id: 'tx-1',
  amountSats: 10_000,
  direction: 'incoming',
  status: 'confirmed',
  createdAt: '2026-01-01T00:00:00Z',
};

const BASE_WALLET: HomeWalletState = {
  wallet: { id: 'w1', name: 'Primary', network: 'testnet4', status: 'locked', createdAt: '' },
  confirmedBalanceSats: 500_000,
  pendingBalanceSats: 0,
  networkConfig: { connectivityMode: 'online', personalNodes: [], allowPublicFallback: false },
  isOnline: true,
  isSafeMode: false,
  transactions: [],
  isLoading: false,
  error: null,
  refresh: jest.fn().mockResolvedValue(undefined),
};

describe('HomeScreen — hideBalance', () => {
  afterEach(() => {
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(false) as any);
    mockHomeWalletState = BASE_WALLET;
  });

  it('shows numeric balance when hideBalance is false', () => {
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(false) as any);
    const screen = renderWithTheme(<HomeScreen />);
    expect(screen.getByText('500,000')).toBeTruthy();
  });

  it('shows placeholder when hideBalance is true', () => {
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(true) as any);
    const screen = renderWithTheme(<HomeScreen />);
    expect(screen.queryByText('500,000')).toBeNull();
    expect(screen.getAllByText('••••••').length).toBeGreaterThan(0);
  });

  it('hides activity amounts when hideBalance is true', () => {
    mockHomeWalletState = { ...BASE_WALLET, transactions: [INCOMING_TX] };
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(true) as any);
    const screen = renderWithTheme(<HomeScreen />);
    expect(screen.queryByText('+10,000')).toBeNull();
    expect(screen.getAllByText('••••••').length).toBeGreaterThan(0);
  });

  it('shows activity amounts when hideBalance is false', () => {
    mockHomeWalletState = { ...BASE_WALLET, transactions: [INCOMING_TX] };
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(false) as any);
    const screen = renderWithTheme(<HomeScreen />);
    expect(screen.getByText('+10,000')).toBeTruthy();
  });
});

// ─── SendScreen: hideBalance ──────────────────────────────────────────────────

describe('SendScreen — hideBalance', () => {
  afterEach(() => {
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(false) as any);
  });

  it('shows numeric available balance when hideBalance is false', () => {
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(false) as any);
    const screen = renderWithTheme(<SendScreen />);
    expect(screen.getByText('1,000,000 common.sats')).toBeTruthy();
  });

  it('shows placeholder for available balance when hideBalance is true', () => {
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(true) as any);
    const screen = renderWithTheme(<SendScreen />);
    expect(screen.queryByText('1,000,000 common.sats')).toBeNull();
    expect(screen.getByText('••••••')).toBeTruthy();
  });
});

// ─── TransactionListScreen: hideBalance ───────────────────────────────────────

describe('TransactionListScreen — hideBalance', () => {
  afterEach(() => {
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(false) as any);
    mockHomeWalletState = BASE_WALLET;
  });

  it('shows numeric totals in summary strip when hideBalance is false', () => {
    mockHomeWalletState = {
      ...BASE_WALLET,
      transactions: [
        { id: 'tx-1', amountSats: 200_000, direction: 'incoming', status: 'confirmed', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'tx-2', amountSats: 50_000, direction: 'outgoing', status: 'confirmed', createdAt: '2026-01-01T01:00:00Z' },
      ],
    };
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(false) as any);
    const screen = renderWithTheme(<TransactionListScreen />);
    expect(screen.getByTestId('summary-received').props.children).toBe('+200,000');
    expect(screen.getByTestId('summary-sent').props.children).toBe('−50,000');
  });

  it('hides totals in summary strip when hideBalance is true', () => {
    mockHomeWalletState = {
      ...BASE_WALLET,
      transactions: [
        { id: 'tx-1', amountSats: 200_000, direction: 'incoming', status: 'confirmed', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'tx-2', amountSats: 50_000, direction: 'outgoing', status: 'confirmed', createdAt: '2026-01-01T01:00:00Z' },
      ],
    };
    jest.mocked(useSecurity).mockReturnValue(makeSecurityMock(true) as any);
    const screen = renderWithTheme(<TransactionListScreen />);
    expect(screen.getByTestId('summary-received').props.children).toBe('••••••');
    expect(screen.getByTestId('summary-sent').props.children).toBe('••••••');
  });
});
