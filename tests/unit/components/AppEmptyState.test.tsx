import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppEmptyState } from '../../../src/presentation/components/base/AppEmptyState';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('AppEmptyState', () => {
  it('renders the title', () => {
    const screen = renderWithTheme(<AppEmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('renders the description when provided', () => {
    const screen = renderWithTheme(
      <AppEmptyState title="Nothing here" description="Try adding something." />,
    );
    expect(screen.getByText('Try adding something.')).toBeTruthy();
  });

  it('does not render description when not provided', () => {
    const screen = renderWithTheme(<AppEmptyState title="Nothing here" />);
    expect(screen.queryByText('Try adding something.')).toBeNull();
  });

  it('renders the icon when provided', () => {
    const screen = renderWithTheme(<AppEmptyState title="Empty" icon="wallet" testID="empty" />);
    expect(screen.getByTestId('empty-icon')).toBeTruthy();
  });

  it('uses the default icon when not provided', () => {
    const screen = renderWithTheme(<AppEmptyState title="Empty" testID="empty" />);
    expect(screen.getByTestId('empty-icon')).toBeTruthy();
  });

  it('renders action button when action is provided', () => {
    const onPress = jest.fn();
    const screen = renderWithTheme(
      <AppEmptyState title="Empty" action={{ label: 'Retry', onPress }} />,
    );
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('calls action.onPress when action button is pressed', () => {
    const onPress = jest.fn();
    const screen = renderWithTheme(
      <AppEmptyState title="Empty" action={{ label: 'Retry', onPress }} />,
    );
    fireEvent.press(screen.getByText('Retry'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when action is not provided', () => {
    const screen = renderWithTheme(<AppEmptyState title="Empty" testID="es" />);
    expect(screen.queryByTestId('es-action')).toBeNull();
  });

  it('applies testID to root view', () => {
    const screen = renderWithTheme(<AppEmptyState title="Empty" testID="empty-state" />);
    expect(screen.getByTestId('empty-state')).toBeTruthy();
  });
});
