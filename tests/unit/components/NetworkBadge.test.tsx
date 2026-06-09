import React from 'react';
import { NetworkBadge } from '../../../src/presentation/components/wallet/NetworkBadge';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const mainnetOnline: NetworkConfig = { network: 'mainnet', connectivityMode: 'online', nodeMode: 'public-api' };
const testnetOnline: NetworkConfig = { network: 'testnet', connectivityMode: 'online', nodeMode: 'public-api' };
const mainnetOffline: NetworkConfig = { network: 'mainnet', connectivityMode: 'offline', nodeMode: 'public-api' };

describe('NetworkBadge', () => {
  it('shows the network name', () => {
    const screen = renderWithTheme(<NetworkBadge config={mainnetOnline} />);
    expect(screen.getByText('mainnet')).toBeTruthy();
  });

  it('shows testnet network name', () => {
    const screen = renderWithTheme(<NetworkBadge config={testnetOnline} />);
    expect(screen.getByText('testnet')).toBeTruthy();
  });

  it('does not show connectivity mode when online', () => {
    const screen = renderWithTheme(<NetworkBadge config={mainnetOnline} />);
    expect(screen.queryByText('online')).toBeNull();
  });

  it('shows connectivity mode when offline', () => {
    const screen = renderWithTheme(<NetworkBadge config={mainnetOffline} />);
    expect(screen.getByText(' · offline')).toBeTruthy();
  });

  it('does not render a border (no borderWidth in badge style)', () => {
    const screen = renderWithTheme(<NetworkBadge config={mainnetOnline} />);
    const badge = screen.getByText('mainnet').parent?.parent;
    expect(badge?.props?.style?.borderWidth).toBeUndefined();
  });
});
