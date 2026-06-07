import React from 'react';
import { BackupSettingsScreen } from '../../../src/presentation/screens/settings/BackupSettingsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const DEFAULT_NETWORK: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'public-api',
};

const WALLET: Wallet = {
  id: 'w1',
  name: 'Primary',
  network: 'testnet4',
  status: 'locked',
  createdAt: '',
};

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    networkConfig: DEFAULT_NETWORK,
    isOnline: true,
    changeNetwork: jest.fn(),
    setNetworkConfig: jest.fn(),
    testNodeConnection: jest.fn(),
  }),
}));

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    wallets: [WALLET],
    selectedWallet: WALLET,
    selectWallet: jest.fn(),
    createWallet: jest.fn(),
    importWallet: jest.fn(),
    deleteWallet: jest.fn(),
    listTransactions: jest.fn(),
    listUtxos: jest.fn(),
    syncWallet: jest.fn(),
    freezeUtxo: jest.fn(),
    unfreezeUtxo: jest.fn(),
    generateReceiveAddress: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('BackupSettingsScreen', () => {
  it('renders the screen title', () => {
    const screen = renderWithTheme(<BackupSettingsScreen />);
    expect(screen.getByText('backup.title')).toBeTruthy();
  });

  it('displays the network config info', () => {
    const screen = renderWithTheme(<BackupSettingsScreen />);
    expect(screen.getByText('testnet4 / online / public-api')).toBeTruthy();
  });

  it('displays the wallet count', () => {
    const screen = renderWithTheme(<BackupSettingsScreen />);
    expect(screen.getByText('backup.walletsLoaded')).toBeTruthy();
  });

  it('renders the verify backup button', () => {
    const screen = renderWithTheme(<BackupSettingsScreen />);
    expect(screen.getByText('backup.verifyBackup')).toBeTruthy();
  });
});
