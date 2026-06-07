import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { BackupSeedScreen } from '../../../src/presentation/screens/auth/BackupSeedScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';

const mockNavigate = jest.fn();
const mockProceedToConfirm = jest.fn();

const mockWords = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent',
  'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
];

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../src/presentation/hooks/useCreateWallet', () => ({
  useCreateWallet: () => ({
    words: mockWords,
    walletName: 'Test Wallet',
    passphrase: '',
    proceedToConfirm: mockProceedToConfirm,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('BackupSeedScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockProceedToConfirm.mockClear();
  });

  it('renders the screen title', () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    expect(screen.getByText('backupSeed.title')).toBeTruthy();
  });

  it('hides words by default (shows reveal prompt)', () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    expect(screen.getByText('backupSeed.tapReveal')).toBeTruthy();
  });

  it('reveals words when reveal button is pressed', () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
    expect(screen.getByText('abandon')).toBeTruthy();
  });

  it('renders all 12 word indices after reveal', () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByText(String(i))).toBeTruthy();
    }
  });

  it("calls proceedToConfirm and navigates when pressing continue after reveal", () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    // Reveal first so the button becomes active
    fireEvent.press(screen.getByLabelText('backupSeed.tapReveal'));
    fireEvent.press(screen.getByLabelText('backupSeed.written'));
    expect(mockProceedToConfirm).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.ConfirmSeed);
  });

  it('shows passphrase badge when passphrase is active', () => {
    jest.spyOn(
      require('../../../src/presentation/hooks/useCreateWallet'),
      'useCreateWallet',
    ).mockReturnValue({
      words: mockWords,
      walletName: 'Test Wallet',
      passphrase: 'mysecret',
      proceedToConfirm: mockProceedToConfirm,
    });
    const screen = renderWithTheme(<BackupSeedScreen />);
    expect(screen.getByText('backupSeed.passphraseActive')).toBeTruthy();
  });
});
