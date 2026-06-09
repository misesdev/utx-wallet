import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AddressInput } from '../../../src/presentation/components/wallet/AddressInput';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('AddressInput', () => {
  it('renders the text input', () => {
    const screen = renderWithTheme(
      <AddressInput value="" onChangeText={jest.fn()} testID="addr-input" />,
    );
    expect(screen.getByTestId('addr-input')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChange = jest.fn();
    const screen = renderWithTheme(
      <AddressInput value="" onChangeText={onChange} testID="addr-input" />,
    );
    fireEvent.changeText(screen.getByTestId('addr-input'), 'bc1q123');
    expect(onChange).toHaveBeenCalledWith('bc1q123');
  });

  it('shows error message when error prop is set', () => {
    const screen = renderWithTheme(
      <AddressInput value="" onChangeText={jest.fn()} error="Invalid address" />,
    );
    expect(screen.getByTestId('address-error')).toBeTruthy();
    expect(screen.getByText('Invalid address')).toBeTruthy();
  });

  it('does not show error when error is null', () => {
    const screen = renderWithTheme(
      <AddressInput value="" onChangeText={jest.fn()} error={null} />,
    );
    expect(screen.queryByTestId('address-error')).toBeNull();
  });

  it('renders QR scan button without text label', () => {
    const screen = renderWithTheme(
      <AddressInput value="" onChangeText={jest.fn()} />,
    );
    const btn = screen.getByTestId('btn-qr-scan');
    expect(btn).toBeTruthy();
    expect(screen.queryByText('QR')).toBeNull();
    expect(screen.queryByText('common.qrCode')).toBeNull();
  });

  it('calls onQrScan when QR button is pressed', () => {
    const onQrScan = jest.fn();
    const screen = renderWithTheme(
      <AddressInput value="" onChangeText={jest.fn()} onQrScan={onQrScan} />,
    );
    fireEvent.press(screen.getByTestId('btn-qr-scan'));
    expect(onQrScan).toHaveBeenCalled();
  });

  it('does not throw when QR button pressed with no onQrScan prop', () => {
    const screen = renderWithTheme(
      <AddressInput value="" onChangeText={jest.fn()} />,
    );
    expect(() => fireEvent.press(screen.getByTestId('btn-qr-scan'))).not.toThrow();
  });
});
