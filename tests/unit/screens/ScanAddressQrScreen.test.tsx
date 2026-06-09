import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import { fireEvent, act } from '@testing-library/react-native';
import { ScanAddressQrScreen } from '../../../src/presentation/screens/qr/ScanAddressQrScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ScanAddressQrScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the scanner frame', () => {
    const screen = renderWithTheme(<ScanAddressQrScreen />);
    expect(screen.getByTestId('address-qr-scanner-frame')).toBeTruthy();
  });

  it('shows the "enter manually" button', () => {
    const screen = renderWithTheme(<ScanAddressQrScreen />);
    expect(screen.getByTestId('address-enter-manually-btn')).toBeTruthy();
  });

  it('opens the manual input sheet when "enter manually" is pressed', async () => {
    const screen = renderWithTheme(<ScanAddressQrScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('address-enter-manually-btn'));
    });
    expect(screen.getByTestId('address-manual-input')).toBeTruthy();
  });

  it('emits bitcoinAddressScanned and goes back when manual address is submitted', async () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    const screen = renderWithTheme(<ScanAddressQrScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('address-enter-manually-btn'));
    });

    fireEvent.changeText(screen.getByTestId('address-manual-input'), 'bc1qtest123');

    await act(async () => {
      fireEvent.press(screen.getByTestId('address-manual-submit'));
    });

    expect(emitSpy).toHaveBeenCalledWith('bitcoinAddressScanned', 'bc1qtest123');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows error and stays open when empty address is submitted', async () => {
    const screen = renderWithTheme(<ScanAddressQrScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('address-enter-manually-btn'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('address-manual-submit'));
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(screen.getByTestId('address-manual-input')).toBeTruthy();
  });

  it('emits bitcoinAddressScanned when camera QR event fires', async () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    renderWithTheme(<ScanAddressQrScreen />);

    await act(async () => {
      DeviceEventEmitter.emit('bitcoinAddressQrScanned', 'bc1qcamera123');
    });

    expect(emitSpy).toHaveBeenCalledWith('bitcoinAddressScanned', 'bc1qcamera123');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates back when back button is pressed', async () => {
    const screen = renderWithTheme(<ScanAddressQrScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-back'));
    });
    expect(mockGoBack).toHaveBeenCalled();
  });
});
