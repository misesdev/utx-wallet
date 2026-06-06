import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SafeModeScreen } from '../../../src/presentation/screens/safe-mode/SafeModeScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { UseSafeModeState } from '../../../src/presentation/hooks/useSafeMode';

const mockActivate = jest.fn().mockResolvedValue('connected');
const mockDeactivate = jest.fn().mockResolvedValue(undefined);

const BASE_FORM = {
  url: '',
  port: '',
  authToken: '',
  network: 'testnet4' as const,
};

const BASE_STATE: UseSafeModeState = {
  form: BASE_FORM,
  isSafeModeEnabled: false,
  status: 'disconnected',
  statusLabel: 'desconectado',
  setUrl: jest.fn(),
  setPort: jest.fn(),
  setAuthToken: jest.fn(),
  setNetwork: jest.fn(),
  testConnection: jest.fn().mockResolvedValue('disconnected'),
  activateSafeMode: mockActivate,
  deactivateSafeMode: mockDeactivate,
};

let mockState: UseSafeModeState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useSafeMode', () => ({
  useSafeMode: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SafeModeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
  });

  describe('Inactive state', () => {
    it('shows "Modo seguro inativo" when safe mode is off', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('Modo seguro inativo')).toBeTruthy();
    });

    it('shows the activate button when safe mode is off', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('Ativar modo seguro')).toBeTruthy();
    });

    it('does not show the deactivate button when safe mode is off', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.queryByText('Desativar modo seguro')).toBeNull();
    });

    it('calls activateSafeMode when activate button is pressed', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      fireEvent.press(screen.getByText('Ativar modo seguro'));
      expect(mockActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Active state', () => {
    beforeEach(() => {
      mockState = {
        ...BASE_STATE,
        isSafeModeEnabled: true,
        status: 'connected',
        statusLabel: 'conectado',
        form: { ...BASE_FORM, url: 'http://my-node.local' },
      };
    });

    it('shows "Modo seguro ativo" when safe mode is on', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('Modo seguro ativo')).toBeTruthy();
    });

    it('shows the deactivate button when safe mode is on', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('Desativar modo seguro')).toBeTruthy();
    });

    it('does not show the activate button when safe mode is on', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.queryByText('Ativar modo seguro')).toBeNull();
    });

    it('calls deactivateSafeMode when deactivate button is pressed', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      fireEvent.press(screen.getByText('Desativar modo seguro'));
      expect(mockDeactivate).toHaveBeenCalledTimes(1);
    });

    it('shows the node URL when configured', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('Node: http://my-node.local')).toBeTruthy();
    });
  });

  describe('Status display', () => {
    it('shows the status label', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('Status: desconectado')).toBeTruthy();
    });

    it('shows "não configurado" when node URL is empty', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('Node: não configurado')).toBeTruthy();
    });

    it('shows the network from the form', () => {
      const screen = renderWithTheme(<SafeModeScreen />);
      expect(screen.getByText('Rede: testnet4')).toBeTruthy();
    });
  });
});
