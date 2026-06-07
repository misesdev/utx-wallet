---
name: project-address-manager
description: HD Address Manager feature — BIP84 multi-origin address management with pool, status sync, and coin selection grouping; 1061 tests passing
metadata:
  type: project
---

Complete implementation of HD address management policy (policys/address.md).

**Why:** Privacy, non-address-reuse, and logical fund segregation (origins/caixinhas).

**How to apply:** All new receive/change flows should go through AddressManagerService. Legacy AddressService still works for backward compatibility.

## Entities
- `WalletAddress` — rich address with status, stats, path, chain, accountIndex
- `AddressOrigin` — logical segregation (default=account 0, custom=next index)
- Statuses: fresh | reserved | received | spent_once | change | archived | inconsistent

## Key rules
- Pool: always 3 fresh receive + 3 fresh change per origin
- BIP84 paths: `m/84'/coinType'/accountIndex'/chain/index` (testnet coinType=1)
- CoinSelection: selecting any UTXO from an address includes ALL UTXOs from that address (no partial address spending)
- GetNextReceiveAddress: returns lowest-index fresh; reserve=true marks reserved and replenishes pool
- SyncAddressStatus: fresh(no tx) → received(incoming only) → spent_once(outgoing) → inconsistent(outgoing+hasUtxos)

## Infrastructure
- Tables: `address_origins`, `wallet_addresses` in op-sqlite database
- `WalletAddressRepositoryImpl` + `AddressOriginRepositoryImpl`
- `WalletKeyAddressProvider` updated: supports `accountIndex` via `PathOptions { account }`
- `WalletTransactionSigner` updated: fast-path lookup via `WalletAddressRepository.findByAddress`, falls back to account-0 scan

## Application
- `AddressManagerService` — facade over 5 address use cases
- `AddressManagerProvider` + `useAddressManager` hook
- `AppProvider` wires the full HD system and passes it to `SyncWalletUseCase` and `BuildTransactionUseCase`

## Tests
- 28 integration tests in `tests/integration/11_addressManager.test.ts`
- `InMemoryDatabase` updated: handles quoted string literals and LIMIT in WHERE
- `CoinSelectionService` unit tests updated: each UTXO gets unique address (grouping behavior)
- `useReceiveBitcoin` hook updated: tries HD system first, falls back to legacy

## Change address bug fix (completed)
Root cause: Default origin never created on wallet import → `GetNextChangeAddress` threw `ORIGIN_NOT_FOUND` → fell back to legacy change address (`m/84'/1'/0'/1/0`) which was NOT in `wallet_addresses` table → `SyncWalletUseCase` didn't sync it → balance "disappeared".

Fix applied across 3 files:
- `AddressManagerService.ensureDefaultOrigin()`: idempotent default origin creation
- `WalletService.createWallet/importWallet`: calls `ensureDefaultOrigin` after every wallet op
- `SyncWalletUseCase`: calls `ensureDefaultOrigin` as safety net for pre-existing wallets (11th param: `addressManager`)
- `AppProvider`: wired `addressOriginRepository` into `AddressManagerService` (6th param), `addressManagerService` into `WalletService` (11th param), `addressManagerService` into `SyncWalletUseCase` (11th param)

**Total: 1061 tests, 93 suites, all passing**
