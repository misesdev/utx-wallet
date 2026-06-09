import { act, renderHook } from '@testing-library/react-native';
import { usePersonalNodes } from '../../../src/presentation/hooks/usePersonalNodes';
import type { NetworkConfig } from '../../../src/core/domain/entities/Network';
import type { PersonalNode } from '../../../src/core/domain/entities/PersonalNode';

const NODE_1: PersonalNode = { id: 'n1', label: 'Node 1', url: 'http://n1.local', network: 'testnet4', priority: 1 };
const NODE_2: PersonalNode = { id: 'n2', label: 'Node 2', url: 'http://n2.local', network: 'testnet4', priority: 2 };
const NODE_3: PersonalNode = { id: 'n3', label: 'Node 3', url: 'http://n3.local', network: 'testnet4', priority: 3 };

const mockAddPersonalNode = jest.fn<Promise<PersonalNode>, [Omit<PersonalNode, 'id'>]>();
const mockRemovePersonalNode = jest.fn<Promise<void>, [string]>();
const mockUpdatePersonalNode = jest.fn<Promise<void>, [PersonalNode]>();
const mockReorderPersonalNodes = jest.fn<Promise<void>, [string[]]>();
const mockSetPublicFallback = jest.fn<Promise<void>, [boolean]>();
const mockTestPersonalNode = jest.fn();

let mockNetworkConfig: NetworkConfig = {
  network: 'testnet4',
  connectivityMode: 'online',
  nodeMode: 'personal-node',
  personalNodes: [NODE_1, NODE_2, NODE_3],
  allowPublicFallback: false,
};

jest.mock('../../../src/presentation/hooks/useNetwork', () => ({
  useNetwork: () => ({
    networkConfig: mockNetworkConfig,
    addPersonalNode: mockAddPersonalNode,
    removePersonalNode: mockRemovePersonalNode,
    updatePersonalNode: mockUpdatePersonalNode,
    reorderPersonalNodes: mockReorderPersonalNodes,
    setPublicFallback: mockSetPublicFallback,
    testPersonalNode: mockTestPersonalNode,
  }),
}));

describe('usePersonalNodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkConfig = {
      network: 'testnet4',
      connectivityMode: 'online',
      nodeMode: 'personal-node',
      personalNodes: [NODE_1, NODE_2, NODE_3],
      allowPublicFallback: false,
    };
    mockAddPersonalNode.mockResolvedValue({ ...NODE_1, id: 'new-node' });
    mockRemovePersonalNode.mockResolvedValue(undefined);
    mockUpdatePersonalNode.mockResolvedValue(undefined);
    mockReorderPersonalNodes.mockResolvedValue(undefined);
    mockSetPublicFallback.mockResolvedValue(undefined);
    mockTestPersonalNode.mockResolvedValue({ status: 'connected', expectedNetwork: 'testnet4' });
  });

  it('returns nodes sorted by priority', () => {
    mockNetworkConfig = {
      ...mockNetworkConfig,
      personalNodes: [NODE_2, NODE_1, NODE_3],
    };
    const { result } = renderHook(() => usePersonalNodes());
    expect(result.current.nodes[0].id).toBe('n1');
    expect(result.current.nodes[1].id).toBe('n2');
  });

  it('exposes all nodes', () => {
    const { result } = renderHook(() => usePersonalNodes());
    expect(result.current.nodes).toHaveLength(3);
  });

  it('exposes allowPublicFallback', () => {
    const { result } = renderHook(() => usePersonalNodes());
    expect(result.current.allowPublicFallback).toBe(false);
  });

  it('allowPublicFallback is true when config has it enabled', () => {
    mockNetworkConfig = { ...mockNetworkConfig, allowPublicFallback: true };
    const { result } = renderHook(() => usePersonalNodes());
    expect(result.current.allowPublicFallback).toBe(true);
  });

  it('addNode delegates to addPersonalNode', async () => {
    const { result } = renderHook(() => usePersonalNodes());
    await act(async () => {
      await result.current.addNode({ label: 'New', url: 'http://new.local', network: 'testnet4', priority: 3 });
    });
    expect(mockAddPersonalNode).toHaveBeenCalledTimes(1);
  });

  it('removeNode delegates to removePersonalNode', async () => {
    const { result } = renderHook(() => usePersonalNodes());
    await act(async () => { await result.current.removeNode('n1'); });
    expect(mockRemovePersonalNode).toHaveBeenCalledWith('n1');
  });

  it('togglePublicFallback calls setPublicFallback with inverted value', async () => {
    const { result } = renderHook(() => usePersonalNodes());
    await act(async () => { await result.current.togglePublicFallback(); });
    expect(mockSetPublicFallback).toHaveBeenCalledWith(true);
  });

  it('moveUp swaps a node with the one above it', async () => {
    const { result } = renderHook(() => usePersonalNodes());
    await act(async () => { await result.current.moveUp('n2'); });
    expect(mockReorderPersonalNodes).toHaveBeenCalledWith(['n2', 'n1', 'n3']);
  });

  it('moveUp does nothing when node is already first', async () => {
    const { result } = renderHook(() => usePersonalNodes());
    await act(async () => { await result.current.moveUp('n1'); });
    expect(mockReorderPersonalNodes).not.toHaveBeenCalled();
  });

  it('moveDown swaps a node with the one below it', async () => {
    const { result } = renderHook(() => usePersonalNodes());
    await act(async () => { await result.current.moveDown('n1'); });
    expect(mockReorderPersonalNodes).toHaveBeenCalledWith(['n2', 'n1', 'n3']);
  });

  it('moveDown does nothing when node is already last', async () => {
    const { result } = renderHook(() => usePersonalNodes());
    await act(async () => { await result.current.moveDown('n3'); });
    expect(mockReorderPersonalNodes).not.toHaveBeenCalled();
  });

  it('testNode returns connection status', async () => {
    const { result } = renderHook(() => usePersonalNodes());
    const status = await act(async () => result.current.testNode(NODE_1));
    expect(status).toBe('connected');
    expect(mockTestPersonalNode).toHaveBeenCalledWith(NODE_1);
  });
});
