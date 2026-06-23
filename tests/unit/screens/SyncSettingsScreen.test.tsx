import React from 'react';
import { Switch } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { SyncSettingsScreen } from '../../../src/presentation/screens/settings/SyncSettingsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { DEFAULT_SYNC_SETTINGS } from '../../../src/core/domain/entities/SyncSettings';
import type { UseSyncSettingsState } from '../../../src/presentation/hooks/useSyncSettings';

const mockSetMaxRequestsPerSecond = jest.fn().mockResolvedValue(undefined);
const mockToggleParallelSync = jest.fn().mockResolvedValue(undefined);
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const BASE_STATE: UseSyncSettingsState = {
  settings: { ...DEFAULT_SYNC_SETTINGS },
  isLoading: false,
  hasPersonalNode: false,
  canEnableParallelSync: false,
  setMaxRequestsPerSecond: mockSetMaxRequestsPerSecond,
  toggleParallelSync: mockToggleParallelSync,
};

let mockState: UseSyncSettingsState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useSyncSettings', () => ({
  useSyncSettings: () => mockState,
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SyncSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE, settings: { ...DEFAULT_SYNC_SETTINGS } };
  });

  describe('Loading state', () => {
    it('hides the rate control when isLoading is true', () => {
      mockState = { ...BASE_STATE, isLoading: true };
      const screen = renderWithTheme(<SyncSettingsScreen />);
      expect(screen.queryByTestId('rps-value')).toBeNull();
    });
  });

  describe('Rate section', () => {
    it('renders the current RPS value', () => {
      const screen = renderWithTheme(<SyncSettingsScreen />);
      expect(screen.getByTestId('rps-value')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('shows the derived delay value', () => {
      const screen = renderWithTheme(<SyncSettingsScreen />);
      expect(screen.getByTestId('delay-value')).toBeTruthy();
    });

    it('calls setMaxRequestsPerSecond with rps+1 when increment is pressed', () => {
      const screen = renderWithTheme(<SyncSettingsScreen />);
      fireEvent.press(screen.getByTestId('btn-increment-rps'));
      expect(mockSetMaxRequestsPerSecond).toHaveBeenCalledWith(2);
    });

    it('increment button is disabled at maximum RPS', () => {
      mockState = { ...BASE_STATE, settings: { maxRequestsPerSecond: 20, parallelSync: false } };
      const screen = renderWithTheme(<SyncSettingsScreen />);
      const btn = screen.getByTestId('btn-increment-rps');
      expect(btn.props.accessibilityState?.disabled).toBeTruthy();
    });

    it('decrement button is disabled at minimum RPS', () => {
      const screen = renderWithTheme(<SyncSettingsScreen />);
      const btn = screen.getByTestId('btn-decrement-rps');
      expect(btn.props.accessibilityState?.disabled).toBeTruthy();
    });

    it('calls setMaxRequestsPerSecond with rps-1 when decrement is pressed from rps=5', () => {
      mockState = { ...BASE_STATE, settings: { maxRequestsPerSecond: 5, parallelSync: false } };
      const screen = renderWithTheme(<SyncSettingsScreen />);
      fireEvent.press(screen.getByTestId('btn-decrement-rps'));
      expect(mockSetMaxRequestsPerSecond).toHaveBeenCalledWith(4);
    });
  });

  describe('Parallel sync section', () => {
    it('renders the parallel sync toggle', () => {
      const screen = renderWithTheme(<SyncSettingsScreen />);
      expect(screen.getByTestId('toggle-parallel-sync')).toBeTruthy();
    });

    it('toggle is off by default', () => {
      const screen = renderWithTheme(<SyncSettingsScreen />);
      const toggle = screen.UNSAFE_getAllByType(Switch)[0];
      expect(toggle.props.value).toBe(false);
    });

    it('calls toggleParallelSync when switch is pressed', () => {
      mockState = { ...BASE_STATE, hasPersonalNode: true, canEnableParallelSync: true };
      const screen = renderWithTheme(<SyncSettingsScreen />);
      const toggle = screen.getByTestId('toggle-parallel-sync');
      fireEvent(toggle, 'valueChange', true);
      expect(mockToggleParallelSync).toHaveBeenCalled();
    });

    it('shows personal node link when no node is configured and parallel is off', () => {
      const screen = renderWithTheme(<SyncSettingsScreen />);
      expect(screen.getByTestId('btn-configure-node')).toBeTruthy();
    });

    it('does not show personal node link when a node is configured', () => {
      mockState = { ...BASE_STATE, hasPersonalNode: true, canEnableParallelSync: true };
      const screen = renderWithTheme(<SyncSettingsScreen />);
      expect(screen.queryByTestId('btn-configure-node')).toBeNull();
    });

    it('navigates to ManageNodes when the node link is pressed', () => {
      const screen = renderWithTheme(<SyncSettingsScreen />);
      fireEvent.press(screen.getByTestId('btn-configure-node'));
      expect(mockNavigate).toHaveBeenCalledWith('ManageNodes');
    });
  });

  describe('Navigation', () => {
    it('calls goBack when back button is pressed', () => {
      const screen = renderWithTheme(<SyncSettingsScreen />);
      const backBtn = screen.getAllByRole('button')[0];
      fireEvent.press(backBtn);
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
