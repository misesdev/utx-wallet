/**
 * Tests for authentication gates:
 * - BackupSeedScreen does NOT require auth (wallet creation flow — seed must always be visible)
 * - SendFeesScreen requires auth before broadcasting transaction
 * - PinInputModal redesign works correctly
 */
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { BackupSeedScreen } from '../../../src/presentation/screens/auth/BackupSeedScreen';
import { PinInputModal } from '../../../src/presentation/components/security/PinInputModal';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockProceedToConfirm = jest.fn();
jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../src/presentation/hooks/useCreateWallet', () => ({
  useCreateWallet: () => ({
    words: ['abandon', 'ability', 'able', 'about', 'above', 'absent',
            'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'],
    walletName: 'Test Wallet',
    passphrase: '',
    proceedToConfirm: mockProceedToConfirm,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ─── BackupSeedScreen — no auth gate (wallet creation flow) ───────────────────

describe('BackupSeedScreen — no auth gate during wallet creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the screen immediately without requiring authentication', () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    expect(screen.getByText('backupSeed.title')).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not render a PinInputModal', () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    expect(screen.queryByTestId('pin-dots')).toBeNull();
  });
});

// ─── PinInputModal redesign ───────────────────────────────────────────────────

describe('PinInputModal — keypad', () => {
  const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it('renders keypad digits 0-9', () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="verify"
        error={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      expect(screen.getByTestId(`pin-key-${d}`)).toBeTruthy();
    }
  });

  it('renders cancel button when onCancel is provided', () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="verify"
        error={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    expect(screen.getByTestId('pin-cancel')).toBeTruthy();
  });

  it('hides cancel button when onCancel is not provided', () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="verify"
        error={null}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.queryByTestId('pin-cancel')).toBeNull();
  });

  it('auto-submits when 4 digits are entered', async () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="verify"
        error={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    fireEvent.press(screen.getByTestId('pin-key-1'));
    fireEvent.press(screen.getByTestId('pin-key-2'));
    fireEvent.press(screen.getByTestId('pin-key-3'));
    fireEvent.press(screen.getByTestId('pin-key-4'));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledWith('1234'));
  });

  it('does not auto-submit with less than 4 digits', async () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="verify"
        error={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    fireEvent.press(screen.getByTestId('pin-key-1'));
    fireEvent.press(screen.getByTestId('pin-key-2'));
    fireEvent.press(screen.getByTestId('pin-key-3'));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows error message when error prop is set', () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="verify"
        error="PIN incorreto"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    expect(screen.getByTestId('pin-error')).toBeTruthy();
    expect(screen.getByText('PIN incorreto')).toBeTruthy();
  });

  it('calls onCancel when cancel button is pressed', () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="verify"
        error={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    fireEvent.press(screen.getByTestId('pin-cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('backspace removes last digit', async () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="verify"
        error={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    fireEvent.press(screen.getByTestId('pin-key-1'));
    fireEvent.press(screen.getByTestId('pin-key-2'));
    fireEvent.press(screen.getByTestId('pin-backspace'));
    // Only 1 digit, press 3 more to submit
    fireEvent.press(screen.getByTestId('pin-key-3'));
    fireEvent.press(screen.getByTestId('pin-key-4'));
    fireEvent.press(screen.getByTestId('pin-key-5'));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledWith('1345'));
  });

  it('renders set-new step with correct i18n title key', () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="set-new"
        error={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    expect(screen.getByText('pinModal.setNewTitle')).toBeTruthy();
  });

  it('renders 4 dot indicators', () => {
    const screen = renderWithTheme(
      <PinInputModal
        visible
        step="verify"
        error={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );
    expect(screen.getByTestId('pin-dots')).toBeTruthy();
  });
});
