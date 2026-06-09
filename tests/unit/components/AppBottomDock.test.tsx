import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppBottomDock } from '../../../src/presentation/components/base/AppBottomDock';
import { renderWithTheme } from '../../mocks/renderWithProviders';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const LEFT_BUTTON = {
  icon: 'receive' as const,
  label: 'Receive',
  onPress: jest.fn(),
  testID: 'dock-left',
};

const RIGHT_BUTTON = {
  icon: 'send' as const,
  label: 'Send',
  onPress: jest.fn(),
  testID: 'dock-right',
};

describe('AppBottomDock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders left button label', () => {
      const screen = renderWithTheme(
        <AppBottomDock leftButton={LEFT_BUTTON} rightButton={RIGHT_BUTTON} />,
      );
      expect(screen.getByText('Receive')).toBeTruthy();
    });

    it('renders right button label', () => {
      const screen = renderWithTheme(
        <AppBottomDock leftButton={LEFT_BUTTON} rightButton={RIGHT_BUTTON} />,
      );
      expect(screen.getByText('Send')).toBeTruthy();
    });

    it('applies testID to left button', () => {
      const screen = renderWithTheme(
        <AppBottomDock leftButton={LEFT_BUTTON} rightButton={RIGHT_BUTTON} />,
      );
      expect(screen.getByTestId('dock-left')).toBeTruthy();
    });

    it('applies testID to right button', () => {
      const screen = renderWithTheme(
        <AppBottomDock leftButton={LEFT_BUTTON} rightButton={RIGHT_BUTTON} />,
      );
      expect(screen.getByTestId('dock-right')).toBeTruthy();
    });

    it('renders both buttons as accessible buttons', () => {
      const screen = renderWithTheme(
        <AppBottomDock leftButton={LEFT_BUTTON} rightButton={RIGHT_BUTTON} />,
      );
      expect(screen.getByTestId('dock-left').props.accessibilityRole).toBe('button');
      expect(screen.getByTestId('dock-right').props.accessibilityRole).toBe('button');
    });

    it('uses label as accessibilityLabel when no explicit accessibilityLabel is provided', () => {
      const screen = renderWithTheme(
        <AppBottomDock leftButton={LEFT_BUTTON} rightButton={RIGHT_BUTTON} />,
      );
      expect(screen.getByTestId('dock-left').props.accessibilityLabel).toBe('Receive');
      expect(screen.getByTestId('dock-right').props.accessibilityLabel).toBe('Send');
    });

    it('uses explicit accessibilityLabel when provided', () => {
      const left = { ...LEFT_BUTTON, accessibilityLabel: 'Custom label' };
      const screen = renderWithTheme(
        <AppBottomDock leftButton={left} rightButton={RIGHT_BUTTON} />,
      );
      expect(screen.getByTestId('dock-left').props.accessibilityLabel).toBe('Custom label');
    });
  });

  describe('interactions', () => {
    it('calls left button onPress when pressed', () => {
      const onPressLeft = jest.fn();
      const screen = renderWithTheme(
        <AppBottomDock
          leftButton={{ ...LEFT_BUTTON, onPress: onPressLeft }}
          rightButton={RIGHT_BUTTON}
        />,
      );
      fireEvent.press(screen.getByTestId('dock-left'));
      expect(onPressLeft).toHaveBeenCalledTimes(1);
    });

    it('calls right button onPress when pressed', () => {
      const onPressRight = jest.fn();
      const screen = renderWithTheme(
        <AppBottomDock
          leftButton={LEFT_BUTTON}
          rightButton={{ ...RIGHT_BUTTON, onPress: onPressRight }}
        />,
      );
      fireEvent.press(screen.getByTestId('dock-right'));
      expect(onPressRight).toHaveBeenCalledTimes(1);
    });

    it('pressing left does not trigger right', () => {
      const onPressLeft = jest.fn();
      const onPressRight = jest.fn();
      const screen = renderWithTheme(
        <AppBottomDock
          leftButton={{ ...LEFT_BUTTON, onPress: onPressLeft }}
          rightButton={{ ...RIGHT_BUTTON, onPress: onPressRight }}
        />,
      );
      fireEvent.press(screen.getByTestId('dock-left'));
      expect(onPressLeft).toHaveBeenCalledTimes(1);
      expect(onPressRight).not.toHaveBeenCalled();
    });

    it('pressing right does not trigger left', () => {
      const onPressLeft = jest.fn();
      const onPressRight = jest.fn();
      const screen = renderWithTheme(
        <AppBottomDock
          leftButton={{ ...LEFT_BUTTON, onPress: onPressLeft }}
          rightButton={{ ...RIGHT_BUTTON, onPress: onPressRight }}
        />,
      );
      fireEvent.press(screen.getByTestId('dock-right'));
      expect(onPressRight).toHaveBeenCalledTimes(1);
      expect(onPressLeft).not.toHaveBeenCalled();
    });
  });

  describe('customisation', () => {
    it('renders without crashing when backgroundColor is provided on left button', () => {
      const left = { ...LEFT_BUTTON, backgroundColor: '#ff0000' };
      expect(() =>
        renderWithTheme(<AppBottomDock leftButton={left} rightButton={RIGHT_BUTTON} />),
      ).not.toThrow();
    });

    it('renders without crashing when iconColor and labelColor are provided on right button', () => {
      const right = { ...RIGHT_BUTTON, iconColor: '#ffffff', labelColor: '#ffffff' };
      expect(() =>
        renderWithTheme(<AppBottomDock leftButton={LEFT_BUTTON} rightButton={right} />),
      ).not.toThrow();
    });

    it('renders without testID prop without crashing', () => {
      const leftNoId = { icon: 'receive' as const, label: 'Receive', onPress: jest.fn() };
      const rightNoId = { icon: 'send' as const, label: 'Send', onPress: jest.fn() };
      expect(() =>
        renderWithTheme(
          <AppBottomDock leftButton={leftNoId} rightButton={rightNoId} />,
        ),
      ).not.toThrow();
    });
  });
});
