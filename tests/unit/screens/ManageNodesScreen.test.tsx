import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ManageNodesScreen } from '../../../src/presentation/screens/settings/ManageNodesScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import type { PersonalNode } from '../../../src/core/domain/entities/PersonalNode';
import type { UsePersonalNodesState } from '../../../src/presentation/hooks/usePersonalNodes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRemoveNode = jest.fn().mockResolvedValue(undefined);
const mockMoveUp = jest.fn().mockResolvedValue(undefined);
const mockMoveDown = jest.fn().mockResolvedValue(undefined);
const mockToggleFallback = jest.fn().mockResolvedValue(undefined);

const NODE_1: PersonalNode = {
  id: 'n1', label: 'My Node', url: 'http://node1.local', network: 'testnet4', priority: 1,
};
const NODE_2: PersonalNode = {
  id: 'n2', label: 'Backup', url: 'http://node2.local', network: 'testnet4', priority: 2,
};

const BASE_STATE: UsePersonalNodesState = {
  nodes: [NODE_1, NODE_2],
  allowPublicFallback: false,
  addNode: jest.fn(),
  removeNode: mockRemoveNode,
  updateNode: jest.fn(),
  moveUp: mockMoveUp,
  moveDown: mockMoveDown,
  togglePublicFallback: mockToggleFallback,
  testNode: jest.fn(),
};

let mockState: UsePersonalNodesState = BASE_STATE;

jest.mock('../../../src/presentation/hooks/usePersonalNodes', () => ({
  usePersonalNodes: () => mockState,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

describe('ManageNodesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { ...BASE_STATE };
  });

  describe('Node list', () => {
    it('renders all configured nodes', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      expect(screen.getByTestId('node-card-n1')).toBeTruthy();
      expect(screen.getByTestId('node-card-n2')).toBeTruthy();
    });

    it('shows node labels', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      expect(screen.getByText('My Node')).toBeTruthy();
      expect(screen.getByText('Backup')).toBeTruthy();
    });

    it('shows empty state when no nodes configured', () => {
      mockState = { ...BASE_STATE, nodes: [] };
      const screen = renderWithTheme(<ManageNodesScreen />);
      expect(screen.getByTestId('empty-nodes')).toBeTruthy();
      expect(screen.getByText('manageNodes.empty')).toBeTruthy();
    });
  });

  describe('Node actions', () => {
    it('calls removeNode when delete button is pressed', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      fireEvent.press(screen.getByTestId('btn-delete-n1'));
      expect(mockRemoveNode).toHaveBeenCalledWith('n1');
    });

    it('navigates to NodeSettings with nodeId when edit is pressed', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      fireEvent.press(screen.getByTestId('btn-edit-n1'));
      expect(mockNavigate).toHaveBeenCalledWith('NodeSettings', { nodeId: 'n1' });
    });

    it('calls moveUp when move-up button is pressed', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      fireEvent.press(screen.getByTestId('btn-move-up-n2'));
      expect(mockMoveUp).toHaveBeenCalledWith('n2');
    });

    it('calls moveDown when move-down button is pressed', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      fireEvent.press(screen.getByTestId('btn-move-down-n1'));
      expect(mockMoveDown).toHaveBeenCalledWith('n1');
    });
  });

  describe('Add node', () => {
    it('renders the add node button', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      expect(screen.getByTestId('btn-add-node')).toBeTruthy();
    });

    it('navigates to NodeSettings when add node is pressed', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      fireEvent.press(screen.getByTestId('btn-add-node'));
      expect(mockNavigate).toHaveBeenCalledWith('NodeSettings');
    });
  });

  describe('Public fallback toggle', () => {
    it('renders the fallback toggle', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      expect(screen.getByTestId('toggle-public-fallback')).toBeTruthy();
    });

    it('toggle is off when allowPublicFallback is false', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      expect(screen.getByTestId('toggle-public-fallback').props.value).toBe(false);
    });

    it('toggle is on when allowPublicFallback is true', () => {
      mockState = { ...BASE_STATE, allowPublicFallback: true };
      const screen = renderWithTheme(<ManageNodesScreen />);
      expect(screen.getByTestId('toggle-public-fallback').props.value).toBe(true);
    });

    it('calls togglePublicFallback when switch is toggled', () => {
      const screen = renderWithTheme(<ManageNodesScreen />);
      fireEvent(screen.getByTestId('toggle-public-fallback'), 'valueChange', true);
      expect(mockToggleFallback).toHaveBeenCalledTimes(1);
    });
  });
});
