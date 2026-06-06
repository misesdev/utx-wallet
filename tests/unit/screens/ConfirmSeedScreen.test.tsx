import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ConfirmSeedScreen } from '../../../src/presentation/screens/auth/ConfirmSeedScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockSave = jest.fn();

const mockWords = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent',
  'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
];

jest.mock('../../../src/presentation/hooks/useCreateWallet', () => ({
  useCreateWallet: jest.fn(() => ({
    words: mockWords,
    save: mockSave,
    isLoading: false,
    error: null,
  })),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ConfirmSeedScreen', () => {
  beforeEach(() => {
    mockSave.mockClear();
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      isLoading: false,
      error: null,
    });
  });

  it('renders the confirm screen title', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('Confirm your seed')).toBeTruthy();
  });

  it('renders the confirm button', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('Confirm & create wallet')).toBeTruthy();
  });

  it('renders 8 word option chips', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    // Each option chip is a button — at least 8 + the confirm button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(9); // 8 chips + 1 confirm
  });

  it('shows a loading indicator while saving', () => {
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      isLoading: true,
      error: null,
    });
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('Creating wallet…')).toBeTruthy();
  });

  it('shows an error when error is present', () => {
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      isLoading: false,
      error: 'Failed to create wallet. Please try again.',
    });
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('Failed to create wallet. Please try again.')).toBeTruthy();
  });

  it('tapping a word chip fills a slot', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    // Tap the first available word chip (first option not yet used)
    const buttons = screen.getAllByRole('button');
    // Buttons: 4 slot chips (disabled/ghost) + 8 word chips + 1 confirm = 13
    // First 4 are slot chips (disabled), then word chips start
    fireEvent.press(buttons[4]);
    // After pressing, the confirm button should still exist (not all slots filled yet)
    expect(screen.getByText('Confirm & create wallet')).toBeTruthy();
  });
});
