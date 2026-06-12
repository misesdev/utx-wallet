# Sync Policy

## Overview

Sync is structured in four explicit, composable layers. Each layer depends only on the one below it. This makes every layer independently testable and eliminates unnecessary API calls.

```
Layer 4 — WalletImportSyncUseCase  (import/creation flow)
           │
Layer 3 — SyncWalletUseCase        (sync all accounts)
           │
Layer 2 — SyncAccountUseCase       (sync one account's pool)
           │
Layer 1 — SyncAddressUseCase       (sync a single address)
```

---

## Layer 1 — Address Sync (`SyncAddressUseCase`)

**Trigger:** User taps an address row on `AddressesScreen`.

**What it does:**
1. Syncs UTXOs for the single address.
2. Syncs transactions for the single address.
3. Recalculates wallet balance.
4. Updates address status via `SyncAddressStatusUseCase`.

**Key behaviour:** `SyncAddressStatusUseCase` receives a prefetch map containing only this one address. Since the map is provided, all other wallet addresses are **skipped** (not re-queried). `EnsureAddressPool` still runs at the end to replenish the pool if needed.

---

## Layer 2 — Account Sync (`SyncAccountUseCase`)

**Trigger:** User taps "Sync" on an `AccountDetailsScreen`, or called by Layers 3/4.

**Pool definition:**
- Receive chain: addresses with status `fresh` OR `received` (active pool members).
- Change chain: addresses with status `fresh` only.
- Pool size is governed by `ADDRESS_POLICY.minAvailableReceive` (3) and `minAvailableChange` (3).

**Discover loop** (max 20 iterations):
1. Query `findFreshByChain` for receive (`['received']`) and change to get current pool.
2. Filter out addresses already synced in this run (`syncedThisRun` set).
3. If pool is empty → break.
4. Sync UTXOs + transactions for the pool batch.
5. Update `syncedThisRun`, accumulate counters.
6. Call `syncBalance`.
7. Call `syncAddressStatus` with the prefetched tx map → triggers `EnsureAddressPool`.
8. `EnsureAddressPool` may generate new pool addresses (when old ones become spent). Next iteration picks them up.

**Termination:** Loop ends when no unseen pool addresses remain — i.e., `EnsureAddressPool` generates nothing new or the pool was already stable.

**`hasActivity`:** `true` if any pool address returned at least one transaction during any iteration. Used by Layer 4 to drive sequential account discovery.

**Rate limiting:** `SyncUtxosUseCase` and `SyncTransactionsUseCase` respect `SYNC_REQUEST_DELAY_MS` from `syncConfig.ts`.

---

## Layer 3 — Wallet Sync (`SyncWalletUseCase`)

**Trigger:** User taps "Sync" on `HomeScreen`.

**What it does:**
1. Looks up the wallet. Throws `WALLET_NOT_FOUND` if absent.
2. If `AddressManagerService` is wired, calls `ensureDefaultOrigin` (creates the Default account on first sync).
3. Loads all non-archived origins for the wallet.
4. Calls `SyncAccountUseCase.execute` for each origin sequentially, forwarding `onProgress`.
5. Aggregates `newUtxos`, `spentUtxos`, `newTransactions` across all origins.
6. Saves `lastSyncAt` timestamp.

**Progress:** `SyncWalletUseCase` wraps the `OnSyncProgress` callback before forwarding it, injecting `accountName: origin.name` into each event. The `HomeScreen` pill displays "Syncing [account name]…" so the user can distinguish which account is being synced. When syncing multiple accounts (e.g. Default, Account 1), the label updates as each account begins.

---

## Layer 4 — Import/Creation Sync (`WalletImportSyncUseCase`)

**Trigger:** After wallet import (`ImportWalletScreen` or `ConfirmQrWalletImportScreen`) or wallet creation from seed.

**BIP44 sequential account discovery:**
1. Create and sync account 0 (always, even if empty — it is the Default account).
2. If account 0 had activity, probe account 1: create origin, sync it.
3. If the probed account has activity, keep it and continue to the next probe.
4. If the probed account has **no activity**, it is the break signal:
   - Archive the origin from the DB (`originRepository.archive`) so it never appears as a wallet account.
   - Stop discovery — do not probe further accounts.
5. Repeat until a probe finds no activity or `MAX_ACCOUNTS` (20) is reached.

**Important:** the break-signal account is never included in the imported wallet's accounts. Only accounts that actually had transaction activity are kept.

**Watch-only wallets (zpub/vpub):** Limited to account 0 only — xpub keys are already fixed to a single account derivation.

**Progress adapter:** `SyncProgress` (from `SyncAccountUseCase`) is translated to `ImportSyncProgress` (phase `discovering`/`syncing`) for UI compatibility with `usePostImportSync`.

---

## Address Status and the "Used" Rule

An address is considered **used and discarded** only when it has an outgoing transaction. This aligns with the no-address-reuse policy.

| Status | Description | Syncing allowed |
|--------|-------------|----------------|
| `fresh` | No transactions | Yes — active pool member |
| `reserved` | Reserved for pending send | Yes |
| `received` | Receive address with incoming-only txs | Yes — UTXOs still at this address |
| `spent_once` | Receive address with outgoing tx | No — address is done |
| `change` | Change address with any tx | No — change output was used |
| `archived` | Manually archived | No |
| `inconsistent` | Has outgoing tx AND current UTXOs | Yes (anomalous state) |

The `AddressesScreen` enforces this: rows with status `spent_once`, `change`, or `archived` are **disabled** (cannot be tapped to sync). This prevents unnecessary API calls for addresses that will not receive new relevant activity.

---

## SyncAddressStatusUseCase — Prefetch Contract

When `prefetchedTransactions` (a `Map<address, Transaction[]>`) is provided:
- **Only addresses present in the map are processed.** Addresses absent from the map are skipped entirely — no extra blockchain API calls.
- `EnsureAddressPool` still runs unconditionally at the end.

When `prefetchedTransactions` is `undefined`:
- All non-archived addresses are fetched from the blockchain (used for legacy/manual calls).

This contract allows callers (Layers 1–4) to pass exactly the transactions they already fetched, with zero duplicate network calls.

---

## Rate-Limit Compliance

`SYNC_REQUEST_DELAY_MS` (configured in `src/shared/config/syncConfig.ts`) is forwarded to `SyncUtxosUseCase` and `SyncTransactionsUseCase`. These apply a delay between consecutive per-address requests. The discover loop in Layer 2 inherits this automatically since it calls these use cases.

---

## Summary Table

| Layer | Use Case | Trigger | Depends On |
|-------|----------|---------|-----------|
| 1 | `SyncAddressUseCase` | Address row tap | `SyncUtxosUseCase`, `SyncTransactionsUseCase`, `SyncBalanceUseCase`, `SyncAddressStatusUseCase` |
| 2 | `SyncAccountUseCase` | Account sync button | Layer 1 sub-use-cases (directly), `WalletAddressRepository` pool queries |
| 3 | `SyncWalletUseCase` | Home screen sync | Layer 2 (`SyncAccountUseCase`), `AddressOriginRepository` |
| 4 | `WalletImportSyncUseCase` | Import / create flow | Layer 2 (`SyncAccountUseCase`), `CreateAddressOriginUseCase` |
