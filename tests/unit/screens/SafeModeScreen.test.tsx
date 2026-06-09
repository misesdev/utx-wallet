import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SafeModeScreen } from '../../../src/presentation/screens/safe-mode/SafeModeScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { UseSafeModeState } from '../../../src/presentation/hooks/useSafeMode';

const mockActivate = jest.fn().mockResolvedValue(undefined);
const mockDeactivate = jest.fn().mockResolvedValue(undefined);
const mockNavigate = jest.fn();

const BASE_STATE: UseSafeModeState = {
  isSafeModeEnabled: false,
  activeNodeCount: 0,
  activeNetworkNodeCount: 0,
  status: 'disconnected',
  statusLabel: 'desconectado',
  activateSafeMode: mockActivate,
  deactivateSafeMode: mockDeactivate,
};

let mockState: UseSafeModeState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useSafeMode', () => ({
  useSafeMode: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

describe('SafeModeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
  });

  describe('Inactive state', () => {
    it('shows "safeMode.inactive" when safe mode is off', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('safeMode.inactive')).toBeTruthy();
    });

    it('shows the activate button when safe mode is off', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByTestId('btn-enable-safe-mode')).toBeTruthy();
    });

    it('does not show the deactivate button when safe mode is off', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.queryByTestId('btn-disable-safe-mode')).toBeNull();
    });

    it('calls activateSafeMode when activate button is pressed', () => {
      mockState = { ...BASE_STATE, activeNetworkNodeCount: 1 };
      const screen = renderWithTheme(<SafeModeScreen />);
      fireEvent.press(screen.getByTestId('btn-enable-safe-mode'));
      expect(mockActivate).toHaveBeenCalledTimes(1);
    });

    it('enable button is disabled when no nodes configured for the network', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByTestId('btn-enable-safe-mode').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Active state', () => {
    beforeEach(() => {
      mockState = {
        ...BASE_STATE,
        isSafeModeEnabled: true,
        activeNetworkNodeCount: 2,
        status: 'connected',
        statusLabel: 'conectado',
      };
    });

    it('shows "safeMode.active" when safe mode is on', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('safeMode.active')).toBeTruthy();
    });

    it('shows the deactivate button when safe mode is on', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByTestId('btn-disable-safe-mode')).toBeTruthy();
    });

    it('does not show the activate button when safe mode is on', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.queryByTestId('btn-enable-safe-mode')).toBeNull();
    });

    it('calls deactivateSafeMode when deactivate button is pressed', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      fireEvent.press(screen.getByTestId('btn-disable-safe-mode'));
      expect(mockDeactivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status display', () => {
    it('shows the status label', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByTestId('safe-mode-status-label')).toBeTruthy();
      expect(screen.getByText('desconectado')).toBeTruthy();
    });

    it('shows no nodes configured when count is zero', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('safeMode.noNodesConfigured')).toBeTruthy();
    });

    it('shows nodes configured count when nodes exist', () => {
      mockState = { ...BASE_STATE, activeNetworkNodeCount: 3 };
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByTestId('safe-mode-node-count')).toBeTruthy();
    });
  });

  describe('Manage nodes link', () => {
    it('renders the manage nodes button', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByTestId('btn-manage-nodes')).toBeTruthy();
    });

    it('navigates to ManageNodes when manage nodes is pressed', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      fireEvent.press(screen.getByTestId('btn-manage-nodes'));
      expect(mockNavigate).toHaveBeenCalledWith('ManageNodes');
    });
  });
});
