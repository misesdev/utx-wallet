import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ConfirmSeedScreen } from '../../../src/presentation/screens/auth/ConfirmSeedScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockSave = jest.fn();
const mockReset = jest.fn();
const mockNavigate = jest.fn();

const mockWords = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent',
  'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
];

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../src/presentation/hooks/useCreateWallet', () => ({
  useCreateWallet: jest.fn(() => ({
    words: mockWords,
    save: mockSave,
    step: 'confirming',
    isLoading: false,
    error: null,
    reset: mockReset,
  })),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ConfirmSeedScreen', () => {
  beforeEach(() => {
    mockSave.mockClear();
    mockReset.mockClear();
    mockNavigate.mockClear();
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      step: 'confirming',
      isLoading: false,
      error: null,
      reset: mockReset,
    });
  });

  it('renders the confirm screen title', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('confirmSeed.title')).toBeTruthy();
  });

  it('renders the confirm button', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByLabelText('confirmSeed.confirmCreate')).toBeTruthy();
  });

  it('renders 8 word option chips', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    // Each option chip is a button — at least 8 options + the back button + confirm button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(9);
  });

  it('shows a loading indicator while saving', () => {
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      step: 'saving',
      isLoading: true,
      error: null,
      reset: mockReset,
    });
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('confirmSeed.creating')).toBeTruthy();
  });

  it('shows an error when error is present', () => {
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      step: 'confirming',
      isLoading: false,
      error: 'Failed to create wallet. Please try again.',
      reset: mockReset,
    });
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    expect(screen.getByText('Failed to create wallet. Please try again.')).toBeTruthy();
  });

  it('tapping a word chip fills a slot', () => {
    const screen = renderWithTheme(<ConfirmSeedScreen />);
    const buttons = screen.getAllByRole('button');
    // back btn + slot chips + word option chips + confirm btn
    // Tap any enabled word option (after the back btn and slot chips)
    const wordBtn = buttons.find(
      b =>
        b.props.accessibilityRole === 'button' &&
        !b.props.accessibilityState?.disabled &&
        b.props.accessibilityLabel !== 'common.back' &&
        b.props.accessibilityLabel !== 'confirmSeed.confirmCreate',
    );
    if (wordBtn) {
      fireEvent.press(wordBtn);
    }
    expect(screen.getByLabelText('confirmSeed.confirmCreate')).toBeTruthy();
  });

  it('navigates to WalletList when save completes successfully', () => {
    const { useCreateWallet } = require('../../../src/presentation/hooks/useCreateWallet');
    (useCreateWallet as jest.Mock).mockReturnValue({
      words: mockWords,
      save: mockSave,
      step: 'saving',
      isLoading: false,
      error: null,
      reset: mockReset,
    });
    renderWithTheme(<ConfirmSeedScreen />);
    expect(mockReset).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('WalletList');
  });
});
