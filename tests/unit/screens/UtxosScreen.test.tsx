import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { UtxosScreen } from '../../../src/presentation/screens/wallet/UtxosScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { UseUtxosState } from '../../../src/presentation/hooks/useUtxos';
import type { Utxo } from '../../../src/core/domain/entities/Utxo';

const mockFreeze = jest.fn().mockResolvedValue(undefined);
const mockUnfreeze = jest.fn().mockResolvedValue(undefined);
const mockSetFilter = jest.fn();

const BASE_STATE: UseUtxosState = {
  utxos: [],
  isLoading: false,
  error: null,
  filter: 'all',
  setFilter: mockSetFilter,
  freeze: mockFreeze,
  unfreeze: mockUnfreeze,
  refresh: jest.fn().mockResolvedValue(undefined),
};

function makeUtxo(txid: string, valueSats: number, isConfirmed = true, isFrozen = false): Utxo {
  return { txid, vout: 0, valueSats, address: 'bc1qtest', isConfirmed, isFrozen };
}

let mockState: UseUtxosState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useUtxos', () => ({
  useUtxos: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('UtxosScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
  });

  describe('Loading state', () => {
    it('renders loading indicator when isLoading is true', () => {
      mockState = { ...BASE_STATE, isLoading: true };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('Loading UTXOs…')).toBeTruthy();
    });

    it('does not render empty state while loading', () => {
      mockState = { ...BASE_STATE, isLoading: true };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.queryByText('No UTXOs')).toBeNull();
    });
  });

  describe('Error state', () => {
    it('renders error message when error is set', () => {
      mockState = { ...BASE_STATE, error: 'Failed to load UTXOs' };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('Failed to load UTXOs')).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('renders default empty state when no UTXOs', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('No UTXOs')).toBeTruthy();
      expect(screen.getByText('Sync the wallet to load UTXOs.')).toBeTruthy();
    });

    it('renders frozen-specific empty state for frozen filter', () => {
      mockState = { ...BASE_STATE, filter: 'frozen' };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('No frozen UTXOs.')).toBeTruthy();
    });

    it('renders pending-specific empty state for pending filter', () => {
      mockState = { ...BASE_STATE, filter: 'pending' };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('No pending UTXOs.')).toBeTruthy();
    });
  });

  describe('UTXO list', () => {
    it('shows summary row when UTXOs exist', () => {
      mockState = {
        ...BASE_STATE,
        utxos: [makeUtxo('a'.repeat(64), 100_000), makeUtxo('b'.repeat(64), 200_000)],
      };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('2 UTXOs')).toBeTruthy();
      expect(screen.getByText('300,000 sats total')).toBeTruthy();
    });

    it('shows singular UTXO count when there is exactly 1', () => {
      mockState = { ...BASE_STATE, utxos: [makeUtxo('a'.repeat(64), 50_000)] };
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('1 UTXO')).toBeTruthy();
    });

    it('does not show summary row when there are no UTXOs', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.queryByText(/sats total/)).toBeNull();
    });
  });

  describe('Filter chips', () => {
    it('renders all filter chip labels', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('All')).toBeTruthy();
      expect(screen.getByText('Confirmed')).toBeTruthy();
      expect(screen.getByText('Pending')).toBeTruthy();
    });

    it('calls setFilter when a filter chip is pressed', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      fireEvent.press(screen.getByText('Confirmed'));
      expect(mockSetFilter).toHaveBeenCalledWith('confirmed');
    });
  });

  describe('Screen title', () => {
    it('renders UTXOs as screen title', () => {
      const screen = renderWithTheme(<UtxosScreen />);
      expect(screen.getByText('UTXOs')).toBeTruthy();
    });
  });
});
