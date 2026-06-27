import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { FeeSelector } from '../../../src/presentation/components/wallet/FeeSelector';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { FeeRates } from '../../../src/core/domain/repositories/BlockchainProvider';

const FEE_RATES: FeeRates = {
  fastSatsPerVByte: 20,
  halfHourSatsPerVByte: 10,
  hourSatsPerVByte: 5,
  economySatsPerVByte: 2,
  minimumSatsPerVByte: 1,
};

const DEFAULT_PROPS = {
  selected: 'normal' as const,
  feeRates: FEE_RATES,
  customFeeRate: '',
  customFeeError: null,
  onSelect: jest.fn(),
  onCustomFeeRateChange: jest.fn(),
};

describe('FeeSelector', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('preset tiles', () => {
    it('renders economy, normal, fast and custom tiles', () => {
      const screen = renderWithTheme(<FeeSelector {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('fee-tile-economy')).toBeTruthy();
      expect(screen.getByTestId('fee-tile-normal')).toBeTruthy();
      expect(screen.getByTestId('fee-tile-fast')).toBeTruthy();
      expect(screen.getByTestId('fee-tile-custom')).toBeTruthy();
    });

    it('calls onSelect with correct tier when economy is pressed', () => {
      const onSelect = jest.fn();
      const screen = renderWithTheme(<FeeSelector {...DEFAULT_PROPS} onSelect={onSelect} />);
      fireEvent.press(screen.getByTestId('fee-tile-economy'));
      expect(onSelect).toHaveBeenCalledWith('economy');
    });

    it('calls onSelect with correct tier when fast is pressed', () => {
      const onSelect = jest.fn();
      const screen = renderWithTheme(<FeeSelector {...DEFAULT_PROPS} onSelect={onSelect} />);
      fireEvent.press(screen.getByTestId('fee-tile-fast'));
      expect(onSelect).toHaveBeenCalledWith('fast');
    });

    it('calls onSelect with custom when custom row is pressed', () => {
      const onSelect = jest.fn();
      const screen = renderWithTheme(<FeeSelector {...DEFAULT_PROPS} onSelect={onSelect} />);
      fireEvent.press(screen.getByTestId('fee-tile-custom'));
      expect(onSelect).toHaveBeenCalledWith('custom');
    });
  });

  describe('custom fee input', () => {
    it('shows custom input when custom tier is selected', () => {
      const screen = renderWithTheme(<FeeSelector {...DEFAULT_PROPS} selected="custom" />);
      expect(screen.getByTestId('input-custom-fee')).toBeTruthy();
    });

    it('hides custom input for non-custom tiers', () => {
      const screen = renderWithTheme(<FeeSelector {...DEFAULT_PROPS} selected="normal" />);
      expect(screen.queryByTestId('input-custom-fee')).toBeNull();
    });

    it('calls onCustomFeeRateChange when input changes', () => {
      const onCustomFeeRateChange = jest.fn();
      const screen = renderWithTheme(
        <FeeSelector {...DEFAULT_PROPS} selected="custom" onCustomFeeRateChange={onCustomFeeRateChange} />,
      );
      fireEvent.changeText(screen.getByTestId('input-custom-fee'), '5');
      expect(onCustomFeeRateChange).toHaveBeenCalledWith('5');
    });
  });

  describe('custom fee validation', () => {
    it('shows error when customFeeError is set', () => {
      const screen = renderWithTheme(
        <FeeSelector {...DEFAULT_PROPS} selected="custom" customFeeError="fees.customFeeMinError" />,
      );
      expect(screen.getByTestId('custom-fee-error')).toBeTruthy();
    });

    it('does not show error when customFeeError is null', () => {
      const screen = renderWithTheme(
        <FeeSelector {...DEFAULT_PROPS} selected="custom" customFeeError={null} />,
      );
      expect(screen.queryByTestId('custom-fee-error')).toBeNull();
    });

    it('does not show error for non-custom tiers even if customFeeError is set', () => {
      const screen = renderWithTheme(
        <FeeSelector {...DEFAULT_PROPS} selected="normal" customFeeError="fees.customFeeMinError" />,
      );
      // error element only renders inside custom input block
      expect(screen.queryByTestId('custom-fee-error')).toBeNull();
    });
  });

  describe('fee rates display', () => {
    it('shows rates from feeRates when provided', () => {
      const screen = renderWithTheme(<FeeSelector {...DEFAULT_PROPS} />);
      expect(screen.getByText('10 sat/vB')).toBeTruthy();
    });

    it('shows dash when feeRates is null', () => {
      const screen = renderWithTheme(<FeeSelector {...DEFAULT_PROPS} feeRates={null} />);
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
  });
});
