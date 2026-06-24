# Network Policy

## Core Principle

There is no global active network in the app. The Bitcoin network (mainnet, testnet4, etc.) is a property of the **wallet entity** being viewed, not of a global configuration object.

## NetworkConfig

`NetworkConfig` contains connectivity settings only — no `network` field, no `nodeMode` field:

```typescript
type NetworkConfig = {
  connectivityMode: ConnectivityMode; // 'online' | 'offline'
  personalNodes: PersonalNode[];      // user-configured personal nodes
  allowPublicFallback: boolean;       // false = safe mode
};
```

## Routing Logic

When the app needs to talk to the blockchain for a given wallet:

1. Filter `personalNodes` to those whose `network` matches the wallet's network (using `normalizeTestnet` for comparison).
2. If matching nodes exist → try them in priority order.
3. If all nodes fail AND `allowPublicFallback === true` → use public Mempool API.
4. If all nodes fail AND `allowPublicFallback === false` → throw (safe mode blocks public fallback).
5. If no matching nodes at all → use public Mempool API directly (nodes are optional).

This logic lives in `MultiNodeBlockchainProvider.withPriority()`.

## Safe Mode

Safe mode means `allowPublicFallback === false`. When safe mode is active:
- The wallet will not fall back to the public Mempool API if personal nodes fail.
- Useful for privacy-conscious users who only want to use their own node.
- Safe mode has no effect if no personal nodes are configured (there's nothing to fall back from).

## BitcoinNetwork Type

```typescript
type BitcoinNetwork = 'mainnet' | 'testnet' | 'testnet3' | 'testnet4';
```

The `normalizeTestnet` utility maps testnet aliases to canonical form for comparison. It MUST NOT be removed.

## Personal Nodes

- Each `PersonalNode` has a `network` field declaring which Bitcoin network it connects to.
- A single config can hold nodes for multiple networks simultaneously.
- The app routes to the correct nodes automatically based on the wallet being viewed.
- Nodes that do not match the current wallet's network are ignored for that request.

## Provider Architecture

- `MultiNodeBlockchainProvider`: priority routing with per-network filtering and fallback.
- `NodeProviderSelector`: always delegates to `MultiNodeBlockchainProvider` (simplified — no `nodeMode` branching).
- `MempoolApiAdapter`: public Mempool API only. Does NOT route to personal nodes.
- `PersonalNodeAdapter`: single-node personal adapter (used for legacy `testConnection` flow).

## Migration

Legacy `NetworkConfig` objects stored in encrypted storage may contain `network` and `nodeMode` fields. `NetworkConfigStorage.load()` detects and migrates these automatically:
- `nodeMode` is stripped (ignored).
- `network` is stripped (ignored).
- `personalNodeUrl`/`personalNodePort` → migrated to `personalNodes[0]` if present.
- `allowPublicFallback` defaults to `false` if not present.
