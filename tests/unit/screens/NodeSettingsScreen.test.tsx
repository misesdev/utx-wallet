import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { NodeSettingsScreen } from '../../../src/presentation/screens/settings/NodeSettingsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { UseSafeModeState } from '../../../src/presentation/hooks/useSafeMode';

const mockSetUrl = jest.fn();
const mockSetPort = jest.fn();
const mockSetAuthToken = jest.fn();
const mockSetNetwork = jest.fn();
const mockTestConnection = jest.fn().mockResolvedValue('connected');
const mockActivateSafeMode = jest.fn().mockResolvedValue('connected');

const BASE_STATE: UseSafeModeState = {
  form: {
    url: '',
    port: '',
    authToken: '',
    network: 'testnet4',
  },
  isSafeModeEnabled: false,
  status: 'disconnected',
  statusLabel: 'desconectado',
  setUrl: mockSetUrl,
  setPort: mockSetPort,
  setAuthToken: mockSetAuthToken,
  setNetwork: mockSetNetwork,
  testConnection: mockTestConnection,
  activateSafeMode: mockActivateSafeMode,
  deactivateSafeMode: jest.fn().mockResolvedValue(undefined),
};

let mockState: UseSafeModeState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/useSafeMode', () => ({
  useSafeMode: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('NodeSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
  });

  describe('Input fields', () => {
    it('renders the URL input field', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByLabelText('Node URL')).toBeTruthy();
    });

    it('renders the port input field', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByLabelText('Node port')).toBeTruthy();
    });

    it('renders the auth token input field', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByLabelText('Node auth token')).toBeTruthy();
    });

    it('calls setUrl when URL input changes', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.changeText(screen.getByLabelText('Node URL'), 'https://node.example.com');
      expect(mockSetUrl).toHaveBeenCalledWith('https://node.example.com');
    });

    it('calls setPort when port input changes', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.changeText(screen.getByLabelText('Node port'), '8332');
      expect(mockSetPort).toHaveBeenCalledWith('8332');
    });
  });

  describe('Status display', () => {
    it('renders the status label', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByText('desconectado')).toBeTruthy();
    });

    it('renders connected status label', () => {
      mockState = { ...BASE_STATE, status: 'connected', statusLabel: 'conectado' };
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByText('conectado')).toBeTruthy();
    });
  });

  describe('Action buttons', () => {
    it('renders the test connection button', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByText('Testar conexão')).toBeTruthy();
    });

    it('renders the save and activate button', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByText('Salvar e ativar modo seguro')).toBeTruthy();
    });

    it('calls testConnection when test button is pressed', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.press(screen.getByText('Testar conexão'));
      expect(mockTestConnection).toHaveBeenCalledTimes(1);
    });

    it('calls activateSafeMode when save button is pressed', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.press(screen.getByText('Salvar e ativar modo seguro'));
      expect(mockActivateSafeMode).toHaveBeenCalledTimes(1);
    });
  });
});
