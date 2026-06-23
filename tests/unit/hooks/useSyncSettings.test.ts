import { act, renderHook } from '@testing-library/react-native';
import { useSyncSettings } from '../../../src/presentation/hooks/useSyncSettings';
import { DEFAULT_SYNC_SETTINGS } from '../../../src/core/domain/entities/SyncSettings';
import type { SyncSettings } from '../../../src/core/domain/entities/SyncSettings';

const mockSave = jest.fn<Promise<void>, [SyncSettings]>().mockResolvedValue(undefined);
let mockSettings: SyncSettings = { ...DEFAULT_SYNC_SETTINGS };
let mockHasPersonalNode = false;

jest.mock('../../../src/app/providers/SyncSettingsProvider', () => ({
  useSyncSettingsContext: () => ({
    settings: mockSettings,
    isLoading: false,
    save: mockSave,
  }),
}));

jest.mock('../../../src/presentation/hooks/usePersonalNodes', () => ({
  usePersonalNodes: () => ({
    nodes: mockHasPersonalNode ? [{ id: 'n1', label: 'Node', url: 'http://n.local', network: 'mainnet', priority: 1 }] : [],
  }),
}));

describe('useSyncSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings = { ...DEFAULT_SYNC_SETTINGS };
    mockHasPersonalNode = false;
  });

  it('returns the current settings', () => {
    const { result } = renderHook(() => useSyncSettings());
    expect(result.current.settings).toEqual(DEFAULT_SYNC_SETTINGS);
  });

  it('hasPersonalNode is false when no nodes exist', () => {
    const { result } = renderHook(() => useSyncSettings());
    expect(result.current.hasPersonalNode).toBe(false);
  });

  it('hasPersonalNode is true when a node is configured', () => {
    mockHasPersonalNode = true;
    const { result } = renderHook(() => useSyncSettings());
    expect(result.current.hasPersonalNode).toBe(true);
  });

  it('canEnableParallelSync is false without personal nodes', () => {
    const { result } = renderHook(() => useSyncSettings());
    expect(result.current.canEnableParallelSync).toBe(false);
  });

  it('canEnableParallelSync is true when a node is configured', () => {
    mockHasPersonalNode = true;
    const { result } = renderHook(() => useSyncSettings());
    expect(result.current.canEnableParallelSync).toBe(true);
  });

  describe('setMaxRequestsPerSecond', () => {
    it('calls save with the new RPS value', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.setMaxRequestsPerSecond(5);
      });
      expect(mockSave).toHaveBeenCalledWith({ ...DEFAULT_SYNC_SETTINGS, maxRequestsPerSecond: 5 });
    });

    it('clamps value to minimum (1)', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.setMaxRequestsPerSecond(0);
      });
      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ maxRequestsPerSecond: 1 }));
    });

    it('clamps value to maximum (20)', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.setMaxRequestsPerSecond(99);
      });
      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ maxRequestsPerSecond: 20 }));
    });

    it('rounds fractional values', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.setMaxRequestsPerSecond(3.7);
      });
      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ maxRequestsPerSecond: 4 }));
    });
  });

  describe('toggleParallelSync', () => {
    it('does not enable parallel sync when no personal node is configured', async () => {
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.toggleParallelSync();
      });
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('enables parallel sync when a personal node is configured', async () => {
      mockHasPersonalNode = true;
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.toggleParallelSync();
      });
      expect(mockSave).toHaveBeenCalledWith({ ...DEFAULT_SYNC_SETTINGS, parallelSync: true });
    });

    it('can disable parallel sync even without a personal node', async () => {
      mockSettings = { maxRequestsPerSecond: 1, parallelSync: true };
      const { result } = renderHook(() => useSyncSettings());
      await act(async () => {
        await result.current.toggleParallelSync();
      });
      expect(mockSave).toHaveBeenCalledWith({ maxRequestsPerSecond: 1, parallelSync: false });
    });
  });
});
