import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { Testnet4FaucetsScreen } from '../../../src/presentation/screens/info/Testnet4FaucetsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('Testnet4FaucetsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('header', () => {
    it('renders the screen title', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      expect(screen.getByText('faucet.title')).toBeTruthy();
    });

    it('navigates back when back button is pressed', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      fireEvent.press(screen.getByTestId('btn-back'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('hero section', () => {
    it('renders the hero title and description', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      expect(screen.getByText('faucet.heroTitle')).toBeTruthy();
      expect(screen.getByText('faucet.heroDesc')).toBeTruthy();
    });

    it('renders the faucet hero icon', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      expect(screen.getByTestId('faucet-hero-icon')).toBeTruthy();
    });
  });

  describe('faucet cards', () => {
    it('renders all four faucet cards', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      expect(screen.getByTestId('faucet-card-faucet.mempoolName')).toBeTruthy();
      expect(screen.getByTestId('faucet-card-faucet.coinfaucetName')).toBeTruthy();
      expect(screen.getByTestId('faucet-card-faucet.testnet4InfoName')).toBeTruthy();
      expect(screen.getByTestId('faucet-card-faucet.cypherfaucetName')).toBeTruthy();
    });

    it('renders faucet names for all cards', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      expect(screen.getByText('faucet.mempoolName')).toBeTruthy();
      expect(screen.getByText('faucet.coinfaucetName')).toBeTruthy();
      expect(screen.getByText('faucet.testnet4InfoName')).toBeTruthy();
      expect(screen.getByText('faucet.cypherfaucetName')).toBeTruthy();
    });

    it('renders faucet descriptions for all cards', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      expect(screen.getByText('faucet.mempoolDesc')).toBeTruthy();
      expect(screen.getByText('faucet.coinfaucetDesc')).toBeTruthy();
      expect(screen.getByText('faucet.testnet4InfoDesc')).toBeTruthy();
      expect(screen.getByText('faucet.cypherfaucetDesc')).toBeTruthy();
    });

    it('renders four open buttons', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      const openButtons = screen.getAllByText('faucet.openFaucet');
      expect(openButtons).toHaveLength(4);
    });
  });

  describe('opening faucet URLs', () => {
    it('opens mempool.space faucet URL when its button is pressed', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      fireEvent.press(screen.getByTestId('btn-open-faucet.mempoolName'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://mempool.space/testnet4/faucet');
    });

    it('opens coinfaucet.eu URL when its button is pressed', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      fireEvent.press(screen.getByTestId('btn-open-faucet.coinfaucetName'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://coinfaucet.eu/en/btc-testnet4');
    });

    it('opens testnet4.info URL when its button is pressed', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      fireEvent.press(screen.getByTestId('btn-open-faucet.testnet4InfoName'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://testnet4.info/');
    });

    it('opens cypherfaucet.com URL when its button is pressed', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      fireEvent.press(screen.getByTestId('btn-open-faucet.cypherfaucetName'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://cypherfaucet.com/btc-testnet');
    });

    it('calls Linking.openURL exactly once per tap', () => {
      const screen = renderWithTheme(<Testnet4FaucetsScreen />);
      fireEvent.press(screen.getByTestId('btn-open-faucet.mempoolName'));
      expect(Linking.openURL).toHaveBeenCalledTimes(1);
    });
  });
});
