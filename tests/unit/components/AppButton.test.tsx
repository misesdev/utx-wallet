import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppButton } from '../../../src/presentation/components/base/AppButton';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('AppButton', () => {
  it('renders the title and handles press', () => {
    const onPress = jest.fn();
    const screen = renderWithTheme(<AppButton title="Create wallet" onPress={onPress} />);

    fireEvent.press(screen.getByText('Create wallet'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const screen = renderWithTheme(
      <AppButton title="Submit" onPress={onPress} disabled />,
    );
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    const screen = renderWithTheme(
      <AppButton title="Submit" onPress={onPress} disabled />,
    );
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  describe('loading state', () => {
    it('shows ActivityIndicator instead of title when loading', () => {
      const screen = renderWithTheme(
        <AppButton title="Submit" onPress={jest.fn()} loading />,
      );
      expect(screen.queryByText('Submit')).toBeNull();
    });

    it('is disabled when loading', () => {
      const screen = renderWithTheme(
        <AppButton title="Submit" onPress={jest.fn()} loading />,
      );
      const btn = screen.getByRole('button');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('renders secondary variant without crashing', () => {
    expect(() =>
      renderWithTheme(<AppButton title="Cancel" variant="secondary" onPress={jest.fn()} />),
    ).not.toThrow();
  });

  it('renders danger variant without crashing', () => {
    expect(() =>
      renderWithTheme(<AppButton title="Delete" variant="danger" onPress={jest.fn()} />),
    ).not.toThrow();
  });

  it('renders ghost variant without crashing', () => {
    expect(() =>
      renderWithTheme(<AppButton title="Skip" variant="ghost" onPress={jest.fn()} />),
    ).not.toThrow();
  });

  it('renders small size without crashing', () => {
    expect(() =>
      renderWithTheme(<AppButton title="OK" size="sm" onPress={jest.fn()} />),
    ).not.toThrow();
  });
});
