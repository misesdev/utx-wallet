import React from 'react';
import { NetworkBadge } from '../../../src/presentation/components/wallet/NetworkBadge';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('NetworkBadge', () => {
  it('shows the network name', () => {
    const screen = renderWithTheme(<NetworkBadge network="mainnet" />);
    expect(screen.getByText('mainnet')).toBeTruthy();
  });

  it('shows testnet network name', () => {
    const screen = renderWithTheme(<NetworkBadge network="testnet" />);
    expect(screen.getByText('testnet')).toBeTruthy();
  });

  it('does not show connectivity mode when online', () => {
    const screen = renderWithTheme(<NetworkBadge network="mainnet" connectivityMode="online" />);
    expect(screen.queryByText('online')).toBeNull();
  });

  it('shows connectivity mode when offline', () => {
    const screen = renderWithTheme(<NetworkBadge network="mainnet" connectivityMode="offline" />);
    expect(screen.getByText(' · offline')).toBeTruthy();
  });

  it('renders without network — shows only offline badge', () => {
    const screen = renderWithTheme(<NetworkBadge connectivityMode="offline" />);
    expect(screen.getByText(' · offline')).toBeTruthy();
  });

  it('does not render a border (no borderWidth in badge style)', () => {
    const screen = renderWithTheme(<NetworkBadge network="mainnet" />);
    const badge = screen.getByText('mainnet').parent?.parent;
    expect(badge?.props?.style?.borderWidth).toBeUndefined();
  });
});
