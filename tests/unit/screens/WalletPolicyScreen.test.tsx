import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { WalletPolicyScreen } from '../../../src/presentation/screens/info/WalletPolicyScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('WalletPolicyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen title', () => {
    const screen = renderWithTheme(<WalletPolicyScreen />);
    expect(screen.getByText('walletPolicy.title')).toBeTruthy();
  });

  it('renders the hero section', () => {
    const screen = renderWithTheme(<WalletPolicyScreen />);
    expect(screen.getByText('walletPolicy.heroTitle')).toBeTruthy();
    expect(screen.getByText('walletPolicy.heroDesc')).toBeTruthy();
  });

  it('renders all 6 policy section titles', () => {
    const screen = renderWithTheme(<WalletPolicyScreen />);
    expect(screen.getByText('walletPolicy.s1Title')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s2Title')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s3Title')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s4Title')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s5Title')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s6Title')).toBeTruthy();
  });

  it('renders all 6 policy section bodies', () => {
    const screen = renderWithTheme(<WalletPolicyScreen />);
    expect(screen.getByText('walletPolicy.s1Body')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s2Body')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s3Body')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s4Body')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s5Body')).toBeTruthy();
    expect(screen.getByText('walletPolicy.s6Body')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const screen = renderWithTheme(<WalletPolicyScreen />);
    fireEvent.press(screen.getByLabelText('common.back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
