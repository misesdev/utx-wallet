import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { WalletSetupProgressModal } from '../../../src/presentation/components/wallet/WalletSetupProgressModal';
import { renderWithTheme } from '../../mocks/renderWithProviders';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('WalletSetupProgressModal', () => {
  it('does not render when not visible', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible={false} currentStep="importing" />,
    );
    // Modal with visible=false renders nothing interactive
    expect(screen.queryByText('walletSetup.settingUpTitle')).toBeNull();
  });

  it('renders title when visible in importing step', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="importing" />,
    );
    expect(screen.getByText('walletSetup.settingUpTitle')).toBeTruthy();
  });

  it('renders all three step labels', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="importing" />,
    );
    expect(screen.getByText('walletSetup.step1Label')).toBeTruthy();
    expect(screen.getByText('walletSetup.step2Label')).toBeTruthy();
    expect(screen.getByText('walletSetup.step3Label')).toBeTruthy();
  });

  it('renders done state with done title and close button', () => {
    const onDone = jest.fn();
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="done" onDone={onDone} />,
    );
    expect(screen.getByText('walletSetup.done')).toBeTruthy();
    expect(screen.getByTestId('wallet-setup-done-btn')).toBeTruthy();
  });

  it('calls onDone when close button pressed in done state', () => {
    const onDone = jest.fn();
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="done" onDone={onDone} />,
    );
    fireEvent.press(screen.getByTestId('wallet-setup-done-btn'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('renders error state with error title', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="error" error="Something went wrong" onRetry={jest.fn()} />,
    );
    expect(screen.getByText('walletSetup.errorTitle')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('renders retry button in error state', () => {
    const onRetry = jest.fn();
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="error" onRetry={onRetry} />,
    );
    expect(screen.getByTestId('wallet-setup-retry-btn')).toBeTruthy();
  });

  it('calls onRetry when retry button pressed in error state', () => {
    const onRetry = jest.fn();
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="error" onRetry={onRetry} />,
    );
    fireEvent.press(screen.getByTestId('wallet-setup-retry-btn'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows default error desc when no error string provided', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="error" onRetry={jest.fn()} />,
    );
    expect(screen.getByText('walletSetup.errorDesc')).toBeTruthy();
  });

  it('hides steps list in done state', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="done" onDone={jest.fn()} />,
    );
    expect(screen.queryByText('walletSetup.step1Label')).toBeNull();
  });

  it('does not render done button without onDone callback', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="done" />,
    );
    expect(screen.queryByTestId('wallet-setup-done-btn')).toBeNull();
  });

  it('shows subMessage when provided during active step', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal
        visible
        currentStep="discovering"
        subMessage="Account 0: checking address 3..."
      />,
    );
    expect(screen.getByTestId('wallet-setup-sub-message')).toBeTruthy();
    expect(screen.getByText('Account 0: checking address 3...')).toBeTruthy();
  });

  it('hides subMessage when step is done', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal
        visible
        currentStep="done"
        subMessage="Should not appear"
        onDone={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('wallet-setup-sub-message')).toBeNull();
  });

  it('hides subMessage when step is error', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal
        visible
        currentStep="error"
        subMessage="Should not appear"
        onRetry={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('wallet-setup-sub-message')).toBeNull();
  });

  it('does not render subMessage area when subMessage is undefined', () => {
    const screen = renderWithTheme(
      <WalletSetupProgressModal visible currentStep="importing" />,
    );
    expect(screen.queryByTestId('wallet-setup-sub-message')).toBeNull();
  });
});
