import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from '../../../src/presentation/screens/settings/SettingsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AppRoutes } from '../../../src/app/navigation/routes';
import type { Wallet } from '../../../src/core/domain/entities/Wallet';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigationReset = jest.fn();
const mockRenameWallet = jest.fn().mockResolvedValue({ id: 'w1', name: 'Updated', network: 'testnet', status: 'locked', createdAt: '' });
const mockDeleteWallet = jest.fn().mockResolvedValue(undefined);

const WALLET: Wallet = {
  id: 'w1',
  name: 'My Wallet',
  network: 'testnet',
  status: 'locked',
  createdAt: '2026-06-08T00:00:00.000Z',
};

jest.mock('../../../src/presentation/hooks/useWallet', () => ({
  useWallet: () => ({
    selectedWallet: WALLET,
    renameWallet: mockRenameWallet,
    deleteWallet: mockDeleteWallet,
    exportWalletKey: jest.fn(),
    getExportFormats: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, reset: mockNavigationReset }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SettingsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('wallet name display', () => {
    it('shows wallet name', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      expect(screen.getByTestId('wallet-name-display')).toBeTruthy();
      expect(screen.getByText('My Wallet')).toBeTruthy();
    });

    it('shows network badge with wallet network', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      expect(screen.getByText('testnet')).toBeTruthy();
    });

    it('shows edit button in view mode', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      expect(screen.getByTestId('rename-edit-btn')).toBeTruthy();
    });
  });

  describe('rename wallet', () => {
    it('switches to edit mode when edit button is pressed', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('rename-edit-btn'));
      expect(screen.getByTestId('wallet-name-input')).toBeTruthy();
    });

    it('prefills input with current wallet name', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('rename-edit-btn'));
      expect(screen.getByTestId('wallet-name-input').props.value).toBe('My Wallet');
    });

    it('returns to view mode when cancel is pressed', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('rename-edit-btn'));
      fireEvent.press(screen.getByTestId('rename-cancel'));
      expect(screen.getByTestId('wallet-name-display')).toBeTruthy();
      expect(screen.queryByTestId('wallet-name-input')).toBeNull();
    });

    it('calls renameWallet with trimmed name on save', async () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('rename-edit-btn'));
      fireEvent.changeText(screen.getByTestId('wallet-name-input'), '  New Name  ');
      await act(async () => {
        fireEvent.press(screen.getByTestId('rename-save'));
      });
      expect(mockRenameWallet).toHaveBeenCalledWith('w1', 'New Name');
    });

    it('shows error when name is empty on save', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('rename-edit-btn'));
      fireEvent.changeText(screen.getByTestId('wallet-name-input'), '   ');
      fireEvent.press(screen.getByTestId('rename-save'));
      expect(screen.getByTestId('rename-error')).toBeTruthy();
      expect(screen.getByText('walletSettings.errorNameRequired')).toBeTruthy();
    });

    it('does not call renameWallet when name is empty', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('rename-edit-btn'));
      fireEvent.changeText(screen.getByTestId('wallet-name-input'), '');
      fireEvent.press(screen.getByTestId('rename-save'));
      expect(mockRenameWallet).not.toHaveBeenCalled();
    });

    it('returns to view mode after successful save', async () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('rename-edit-btn'));
      fireEvent.changeText(screen.getByTestId('wallet-name-input'), 'New Name');
      await act(async () => {
        fireEvent.press(screen.getByTestId('rename-save'));
      });
      await waitFor(() => expect(screen.queryByTestId('wallet-name-input')).toBeNull());
    });

    it('shows error message when rename fails', async () => {
      mockRenameWallet.mockRejectedValueOnce(new Error('Wallet "New Name" already exists'));
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('rename-edit-btn'));
      fireEvent.changeText(screen.getByTestId('wallet-name-input'), 'New Name');
      await act(async () => {
        fireEvent.press(screen.getByTestId('rename-save'));
      });
      await waitFor(() => expect(screen.getByTestId('rename-error')).toBeTruthy());
    });
  });

  describe('navigation items', () => {
    it('renders view seed item', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      expect(screen.getByTestId('settings-view-seed')).toBeTruthy();
    });

    it('renders addresses item', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      expect(screen.getByTestId('settings-addresses')).toBeTruthy();
    });

    it('renders UTXOs item', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      expect(screen.getByTestId('settings-utxos')).toBeTruthy();
    });

    it('renders Export item', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      expect(screen.getByTestId('settings-export')).toBeTruthy();
    });

    it('navigates to ViewSeed when view seed is pressed', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('settings-view-seed'));
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.ViewSeed);
    });

    it('navigates to Addresses when addresses is pressed', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('settings-addresses'));
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.Addresses);
    });

    it('navigates to Utxos when UTXOs is pressed', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('settings-utxos'));
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.Utxos);
    });

    it('navigates to ExportWalletFormat when Export is pressed', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('settings-export'));
      expect(mockNavigate).toHaveBeenCalledWith(AppRoutes.ExportWalletFormat);
    });
  });

  describe('delete wallet', () => {
    it('renders the delete wallet button', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      expect(screen.getByTestId('delete-wallet-btn')).toBeTruthy();
    });

    it('shows confirmation modal when delete button is pressed', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('delete-wallet-btn'));
      expect(screen.getByTestId('confirm-modal-confirm')).toBeTruthy();
    });

    it('dismisses modal when cancel is pressed', () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('delete-wallet-btn'));
      fireEvent.press(screen.getByTestId('confirm-modal-cancel'));
      expect(screen.queryByTestId('confirm-modal-confirm')).toBeNull();
    });

    it('calls deleteWallet when confirmed', async () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('delete-wallet-btn'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('confirm-modal-confirm'));
      });
      expect(mockDeleteWallet).toHaveBeenCalledWith('w1');
    });

    it('resets navigation to WalletList after successful deletion', async () => {
      const screen = renderWithTheme(<SettingsScreen />);
      fireEvent.press(screen.getByTestId('delete-wallet-btn'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('confirm-modal-confirm'));
      });
      await waitFor(() => expect(mockNavigationReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: AppRoutes.WalletList }] }));
    });
  });
});
