import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { NodeSettingsScreen } from '../../../src/presentation/screens/settings/NodeSettingsScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { PersonalNode } from '../../../src/core/domain/entities/PersonalNode';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockAddNode = jest.fn().mockResolvedValue({ id: 'new-node', label: 'Test', url: 'http://node.local', network: 'testnet4', priority: 1 });
const mockUpdateNode = jest.fn().mockResolvedValue(undefined);
const mockTestNode = jest.fn().mockResolvedValue('connected');

const EXISTING_NODE: PersonalNode = {
  id: 'node-1',
  label: 'My Node',
  url: 'http://node.local',
  port: 8332,
  network: 'testnet4',
  priority: 1,
};

const DEFAULT_CONFIG: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'public-api',
};

let mockNodeId: string | undefined;
let mockNodes: PersonalNode[] = [];
let mockNetworkConfig: NetworkConfig = DEFAULT_CONFIG;

jest.mock('../../../src/presentation/hooks/usePersonalNodes', () => ({
  usePersonalNodes: () => ({
    nodes: mockNodes,
    addNode: mockAddNode,
    updateNode: mockUpdateNode,
    testNode: mockTestNode,
    removeNode: jest.fn(),
    moveUp: jest.fn(),
    moveDown: jest.fn(),
    allowPublicFallback: false,
    togglePublicFallback: jest.fn(),
  }),
}));

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    networkConfig: mockNetworkConfig,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: { nodeId: mockNodeId } }),
}));

async function fillAndTest(screen: ReturnType<typeof renderWithTheme>, label = 'My Node', url = 'http://node.local') {
  fireEvent.changeText(screen.getByTestId('input-label'), label);
  fireEvent.changeText(screen.getByTestId('input-url'), url);
  fireEvent.press(screen.getByTestId('btn-test-connection'));
  await waitFor(() => expect(mockTestNode).toHaveBeenCalledTimes(1));
}

describe('NodeSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNodeId = undefined;
    mockNodes = [];
    mockNetworkConfig = DEFAULT_CONFIG;
    mockTestNode.mockResolvedValue('connected');
  });

  describe('Add mode (no nodeId param)', () => {
    it('shows "add node" title', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByText('nodeSettings.title')).toBeTruthy();
    });

    it('renders the label input', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('input-label')).toBeTruthy();
    });

    it('renders the URL input', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('input-url')).toBeTruthy();
    });

    it('renders the port input', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('input-port')).toBeTruthy();
    });

    it('renders the auth token input', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('input-auth-token')).toBeTruthy();
    });

    it('save button is disabled when label is empty', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.changeText(screen.getByTestId('input-url'), 'http://node.local');
      expect(screen.getByTestId('btn-save').props.accessibilityState?.disabled).toBe(true);
    });

    it('save button is disabled when url is empty', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.changeText(screen.getByTestId('input-label'), 'My Node');
      expect(screen.getByTestId('btn-save').props.accessibilityState?.disabled).toBe(true);
    });

    it('save button is disabled when fields are filled but test not done', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.changeText(screen.getByTestId('input-label'), 'My Node');
      fireEvent.changeText(screen.getByTestId('input-url'), 'http://node.local');
      expect(screen.getByTestId('btn-save').props.accessibilityState?.disabled).toBe(true);
    });

    it('save button is enabled after successful test', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      expect(screen.getByTestId('btn-save').props.accessibilityState?.disabled).toBe(false);
    });

    it('calls addNode when save is pressed after successful test', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      fireEvent.press(screen.getByTestId('btn-save'));
      await waitFor(() => expect(mockAddNode).toHaveBeenCalledTimes(1));
      expect(mockAddNode).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'My Node', url: 'http://node.local' }),
      );
    });

    it('navigates back after successful save', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      fireEvent.press(screen.getByTestId('btn-save'));
      await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
    });
  });

  describe('Edit mode (nodeId param set)', () => {
    beforeEach(() => {
      mockNodeId = 'node-1';
      mockNodes = [EXISTING_NODE];
    });

    it('shows "edit node" title', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByText('nodeSettings.titleEdit')).toBeTruthy();
    });

    it('pre-fills the label from the existing node', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('input-label').props.value).toBe('My Node');
    });

    it('pre-fills the URL from the existing node', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('input-url').props.value).toBe('http://node.local');
    });

    it('pre-fills the port from the existing node', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('input-port').props.value).toBe('8332');
    });

    it('shows "save changes" button in edit mode', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByText('nodeSettings.saveChanges')).toBeTruthy();
    });

    it('save button is disabled in edit mode until test passes', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('btn-save').props.accessibilityState?.disabled).toBe(true);
    });

    it('calls updateNode when save is pressed after successful test', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.press(screen.getByTestId('btn-test-connection'));
      await waitFor(() => expect(mockTestNode).toHaveBeenCalledTimes(1));
      fireEvent.press(screen.getByTestId('btn-save'));
      await waitFor(() => expect(mockUpdateNode).toHaveBeenCalledTimes(1));
    });
  });

  describe('Connection test gate', () => {
    it('shows "not tested" status initially', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('status-text').props.children).toBe('nodeSettings.statusNotTested');
    });

    it('shows status card always (even before any test)', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('status-card')).toBeTruthy();
    });

    it('shows connected status after a successful test', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      expect(screen.getByTestId('status-text').props.children).toBe('nodeSettings.status_connected');
    });

    it('shows failed status after an unsuccessful test', async () => {
      mockTestNode.mockResolvedValue('disconnected');
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      expect(screen.getByTestId('status-text').props.children).toBe('nodeSettings.status_disconnected');
    });

    it('save button is disabled after a failed test', async () => {
      mockTestNode.mockResolvedValue('disconnected');
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      expect(screen.getByTestId('btn-save').props.accessibilityState?.disabled).toBe(true);
    });

    it('shows test-required hint when fields filled but status not connected', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.changeText(screen.getByTestId('input-label'), 'My Node');
      fireEvent.changeText(screen.getByTestId('input-url'), 'http://node.local');
      expect(screen.getByTestId('test-required-hint')).toBeTruthy();
    });

    it('hides test-required hint after a successful test', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      expect(screen.queryByTestId('test-required-hint')).toBeNull();
    });

    it('resets status to "not tested" when URL is changed after a successful test', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      expect(screen.getByTestId('status-text').props.children).toBe('nodeSettings.status_connected');
      fireEvent.changeText(screen.getByTestId('input-url'), 'http://other.local');
      expect(screen.getByTestId('status-text').props.children).toBe('nodeSettings.statusNotTested');
    });

    it('resets status when port is changed after a successful test', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      fireEvent.changeText(screen.getByTestId('input-port'), '9999');
      expect(screen.getByTestId('status-text').props.children).toBe('nodeSettings.statusNotTested');
    });

    it('resets status when auth token is changed after a successful test', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      fireEvent.changeText(screen.getByTestId('input-auth-token'), 'newtoken');
      expect(screen.getByTestId('status-text').props.children).toBe('nodeSettings.statusNotTested');
    });

    it('resets status when network is changed after a successful test', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      fireEvent.press(screen.getByTestId('network-chip-mainnet'));
      expect(screen.getByTestId('status-text').props.children).toBe('nodeSettings.statusNotTested');
    });

    it('disables save button again after resetting status by changing URL', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      await fillAndTest(screen);
      expect(screen.getByTestId('btn-save').props.accessibilityState?.disabled).toBe(false);
      fireEvent.changeText(screen.getByTestId('input-url'), 'http://other.local');
      expect(screen.getByTestId('btn-save').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Info button (tutorial)', () => {
    it('renders the info button', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('btn-node-tutorial')).toBeTruthy();
    });

    it('navigates to NodeTutorial when info button is pressed', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.press(screen.getByTestId('btn-node-tutorial'));
      expect(mockNavigate).toHaveBeenCalledWith('NodeTutorial');
    });
  });

  describe('Test connection button', () => {
    it('calls testNode when pressed', async () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      fireEvent.changeText(screen.getByTestId('input-url'), 'http://node.local');
      fireEvent.press(screen.getByTestId('btn-test-connection'));
      await waitFor(() => expect(mockTestNode).toHaveBeenCalledTimes(1));
    });

    it('is disabled when URL is empty', () => {
      const screen = renderWithTheme(<NodeSettingsScreen />);
      expect(screen.getByTestId('btn-test-connection').props.accessibilityState?.disabled).toBe(true);
    });
  });
});
