# Personal Node Policy

## What is a Personal Node?

A personal node is a user-operated Mempool-compatible Bitcoin node (e.g. self-hosted mempool.space). The app connects to personal nodes for enhanced privacy and sovereignty.

## PersonalNode Entity

```typescript
type PersonalNode = {
  id: string;
  label: string;
  url: string;           // base URL, e.g. http://192.168.1.100:8081/api
  port?: number;         // optional legacy field (prefer including port in url)
  network: BitcoinNetwork; // which Bitcoin network this node serves
  priority: number;      // lower = higher priority (1 is highest)
  authToken?: string;    // optional Bearer token for authenticated instances
};
```

## Network Matching

Personal nodes serve a specific Bitcoin network. When syncing a wallet:
- Only nodes whose `network` matches the wallet's `network` are used.
- Comparison uses `normalizeTestnet()` to treat testnet aliases as equivalent.
- Nodes for other networks are ignored for that operation.

## Priority Ordering

When multiple nodes match the wallet's network, they are tried in ascending priority order (priority 1 first). The first node to respond successfully is used.

## Fallback Behavior

If all matching personal nodes fail:
- If `allowPublicFallback === true`: the public Mempool API is used as fallback.
- If `allowPublicFallback === false` (safe mode): the operation fails with an error.

If no personal nodes are configured for the wallet's network, the public Mempool API is used directly (no fallback needed).

## Connection Testing

- `NodeConnectionTester.testNode(node)`: tests a single node by probing `/v1/fees/recommended`.
- `NodeConnectionTester.testConnection(config)`: tests using legacy `personalNodeUrl` field.
- Probe endpoint `/v1/fees/recommended` is used because it exists in all mempool self-hosted versions and returns a predictable JSON shape.
- A successful probe requires the response to include `fastestFee: number`.

## URL Normalization

`normalizeNodeUrl(url, port?)` handles:
- Missing `http://` protocol → added automatically.
- Trailing `/v1` or `/v2` version suffix → stripped (app appends `/v1/...` to all paths internally).
- Explicit `port` parameter overrides port in the URL.

## Adding / Removing Nodes

- `NetworkService.addPersonalNode(input)`: generates a UUID, appends to `personalNodes`, saves.
- `NetworkService.removePersonalNode(id)`: filters out the node, saves.
- Adding or removing nodes does NOT change `allowPublicFallback`. Safe mode is controlled separately via `NetworkService.setPublicFallback(enabled)`.

## UI: ManageNodesScreen

The `ManageNodesScreen` lists all personal nodes. Each node shows its network badge. The user can reorder nodes (affecting priority), add new nodes, edit existing nodes, or remove nodes.

## UI: NodeSettingsScreen

The `NodeSettingsScreen` serves as both the add-node form and the edit-node form. It validates the URL, optionally tests the connection, and saves the node.

## Parallel Sync

When personal nodes are configured, parallel sync (multiple concurrent address queries) is enabled. Without personal nodes, parallel sync is unavailable to avoid rate-limiting the public API.
