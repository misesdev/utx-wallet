import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { BalanceEyeButton } from '../../../src/presentation/components/security/BalanceEyeButton';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('BalanceEyeButton', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when hidden is true', () => {
    it('renders with default testID', () => {
      const screen = renderWithTheme(<BalanceEyeButton hidden onPress={onPress} />);
      expect(screen.getByTestId('balance-eye-btn')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const screen = renderWithTheme(
        <BalanceEyeButton hidden onPress={onPress} testID="home-eye-btn" />,
      );
      expect(screen.getByTestId('home-eye-btn')).toBeTruthy();
    });

    it('has accessible button role', () => {
      const screen = renderWithTheme(<BalanceEyeButton hidden onPress={onPress} />);
      expect(screen.getByTestId('balance-eye-btn').props.accessibilityRole).toBe('button');
    });

    it('has revealBalance accessibilityLabel when hidden', () => {
      const screen = renderWithTheme(<BalanceEyeButton hidden onPress={onPress} />);
      expect(screen.getByTestId('balance-eye-btn').props.accessibilityLabel).toBe(
        'common.revealBalance',
      );
    });

    it('calls onPress when pressed', () => {
      const screen = renderWithTheme(<BalanceEyeButton hidden onPress={onPress} />);
      fireEvent.press(screen.getByTestId('balance-eye-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('when hidden is false (revealed)', () => {
    it('has hideBalance accessibilityLabel when revealed', () => {
      const screen = renderWithTheme(<BalanceEyeButton hidden={false} onPress={onPress} />);
      expect(screen.getByTestId('balance-eye-btn').props.accessibilityLabel).toBe(
        'common.hideBalance',
      );
    });

    it('calls onPress when pressed while revealed', () => {
      const screen = renderWithTheme(<BalanceEyeButton hidden={false} onPress={onPress} />);
      fireEvent.press(screen.getByTestId('balance-eye-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
