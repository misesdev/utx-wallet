import { useCallback, useMemo } from 'react';
import type { PersonalNode } from '../../core/domain/entities/PersonalNode';
import type { NodeConnectionStatus } from '../../core/domain/entities/Network';
import { useNetwork } from './useNetwork';

export type UsePersonalNodesState = {
  nodes: PersonalNode[];
  allowPublicFallback: boolean;
  addNode: (input: Omit<PersonalNode, 'id'>) => Promise<PersonalNode>;
  removeNode: (nodeId: string) => Promise<void>;
  updateNode: (node: PersonalNode) => Promise<void>;
  moveUp: (nodeId: string) => Promise<void>;
  moveDown: (nodeId: string) => Promise<void>;
  togglePublicFallback: () => Promise<void>;
  testNode: (node: PersonalNode) => Promise<NodeConnectionStatus>;
};

export function usePersonalNodes(): UsePersonalNodesState {
  const {
    networkConfig,
    addPersonalNode,
    removePersonalNode,
    updatePersonalNode,
    reorderPersonalNodes,
    setPublicFallback,
    testPersonalNode,
  } = useNetwork();

  const nodes = useMemo(
    () => [...(networkConfig.personalNodes ?? [])].sort((a, b) => a.priority - b.priority),
    [networkConfig.personalNodes],
  );

  const allowPublicFallback = networkConfig.allowPublicFallback ?? false;

  const moveUp = useCallback(async (nodeId: string) => {
    const sorted = [...(networkConfig.personalNodes ?? [])].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(n => n.id === nodeId);
    if (idx <= 0) return;
    const swapped = [...sorted];
    [swapped[idx - 1], swapped[idx]] = [swapped[idx], swapped[idx - 1]];
    await reorderPersonalNodes(swapped.map(n => n.id));
  }, [networkConfig.personalNodes, reorderPersonalNodes]);

  const moveDown = useCallback(async (nodeId: string) => {
    const sorted = [...(networkConfig.personalNodes ?? [])].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(n => n.id === nodeId);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const swapped = [...sorted];
    [swapped[idx], swapped[idx + 1]] = [swapped[idx + 1], swapped[idx]];
    await reorderPersonalNodes(swapped.map(n => n.id));
  }, [networkConfig.personalNodes, reorderPersonalNodes]);

  const togglePublicFallback = useCallback(async () => {
    await setPublicFallback(!allowPublicFallback);
  }, [allowPublicFallback, setPublicFallback]);

  const testNode = useCallback(async (node: PersonalNode): Promise<NodeConnectionStatus> => {
    const result = await testPersonalNode(node);
    return result.status;
  }, [testPersonalNode]);

  return useMemo(() => ({
    nodes,
    allowPublicFallback,
    addNode: addPersonalNode,
    removeNode: removePersonalNode,
    updateNode: updatePersonalNode,
    moveUp,
    moveDown,
    togglePublicFallback,
    testNode,
  }), [
    nodes,
    allowPublicFallback,
    addPersonalNode,
    removePersonalNode,
    updatePersonalNode,
    moveUp,
    moveDown,
    togglePublicFallback,
    testNode,
  ]);
}
