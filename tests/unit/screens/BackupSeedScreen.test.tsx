import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { BackupSeedScreen } from '../../../src/presentation/screens/auth/BackupSeedScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AuthRoutes } from '../../../src/app/navigation/routes';

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
    expect(screen.getByText('Back up your seed')).toBeTruthy();
  });

  it('renders all 12 word indices', () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByText(String(i))).toBeTruthy();
    }
  });

  it('hides words by default (shows reveal prompt)', () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    expect(screen.getByText('Tap to reveal seed phrase')).toBeTruthy();
  });

  it('reveals words when reveal button is pressed', () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    fireEvent.press(screen.getByText('Tap to reveal seed phrase'));
    expect(screen.getByText('abandon')).toBeTruthy();
  });

  it("calls proceedToConfirm and navigates when pressing continue", () => {
    const screen = renderWithTheme(<BackupSeedScreen />);
    fireEvent.press(screen.getByText("I've written it down"));
    expect(mockProceedToConfirm).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(AuthRoutes.ConfirmSeed);
  });
});
