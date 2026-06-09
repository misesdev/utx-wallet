import React from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { DonationScreen } from '../../../src/presentation/screens/donation/DonationScreen';
import { PROJECT_DONATION } from '../../../src/shared/constants/project';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('DonationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders donation copy, address and GitHub link', () => {
    const screen = renderWithTheme(<DonationScreen />);

    expect(screen.getByText('donation.title')).toBeTruthy();
    expect(screen.getByText('donation.heroTitle')).toBeTruthy();
    expect(screen.getByText(PROJECT_DONATION.bitcoinAddress)).toBeTruthy();
    expect(screen.getByText(PROJECT_DONATION.githubUrl)).toBeTruthy();
  });

  it('copies the donation address and shows feedback', () => {
    const screen = renderWithTheme(<DonationScreen />);

    fireEvent.press(screen.getByTestId('donation-copy-address'));

    expect(Clipboard.setString).toHaveBeenCalledWith(PROJECT_DONATION.bitcoinAddress);
    expect(screen.getByTestId('donation-copy-feedback')).toBeTruthy();
    expect(screen.getByText('donation.copied')).toBeTruthy();
  });

  it('opens the project GitHub link', () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const screen = renderWithTheme(<DonationScreen />);

    fireEvent.press(screen.getByTestId('donation-github-link'));

    expect(openSpy).toHaveBeenCalledWith(PROJECT_DONATION.githubUrl);
    openSpy.mockRestore();
  });
});
