# Wallet Policy

## Import and Creation Flow

### 1. Wallet Import

When a user imports a wallet via seed phrase, the following steps are executed in order:

1. **Key import** — The seed phrase (mnemonic) and optional passphrase are validated and stored securely using `ImportWalletUseCase`. The wallet entity is created in the local database with a unique `walletId`.

2. **HD account discovery** — `WalletDiscoveryUseCase` runs a BIP44-compatible account discovery against the Mempool API:
   - Starting from `accountIndex = 0`, receive addresses are derived and checked for on-chain activity (`chain_stats.tx_count + mempool_stats.tx_count > 0`).
   - A gap limit of **3 consecutive fresh receive addresses** is used to determine that an account has no more activity.
   - Account 0 always has an `AddressOrigin` created (named `"Default"`), even if it has no activity (fresh import).
   - If account N (N > 0) has any activity, an origin named `"Account N"` is created and account N+1 is checked.
   - Discovery stops when an entire account (beyond account 0) has no activity.

3. **Progress feedback** — A `WalletSetupProgressModal` shows three sequential steps to the user:
   - Step 1: "Importing keys" — wallet key setup (sub-message: "Generating HD wallet keys...")
   - Step 2: "Syncing addresses" — HD discovery, with per-address sub-messages: "Account N: checking address X..." or "Account N: found transactions"
   - Step 3: "Syncing accounts" — post-discovery summary
   The modal blocks the UI until all steps complete. On error, the user can retry.

### 2. Wallet Creation

New wallet creation follows the same flow as import, with the mnemonic generated internally by `GenerateMnemonicUseCase`. Since the wallet is brand new, discovery always finds no activity and terminates after creating the default `Account 0` origin (3 API calls at most).

### 3. Address Origins

Each discovered account maps to one `AddressOrigin` record:

| Account Index | Origin Name | Type    |
|---------------|-------------|---------|
| 0             | Default     | default |
| 1             | Account 1   | custom  |
| N             | Account N   | custom  |

Origins are created sequentially by `CreateAddressOriginUseCase`, which assigns `accountIndex = maxExistingIndex + 1`. This ensures correct BIP84 derivation paths (`m/84'/coinType'/accountIndex'/chain/index`).

### 4. Address Pool

After each origin is created, `CreateAddressOriginUseCase` pre-generates an initial address pool:
- `ADDRESS_POLICY.minAvailableReceive` (3) fresh receive addresses
- `ADDRESS_POLICY.minAvailableChange` (3) fresh change addresses

This pool is topped up by `EnsureAddressPoolUseCase` when the wallet syncs.

### 5. Duplicate Wallet Detection

**Status: DISABLED (development mode)**

A `WalletDuplicateDetector` check is planned but intentionally disabled to allow importing the same mnemonic with different names during development and testing. When enabled, it should hash the mnemonic and compare against existing wallet keys to prevent duplicate imports.

### 5.1 Idempotent Origin Creation

`WalletDiscoveryUseCase` is designed to be idempotent: if `CreateAddressOriginUseCase` throws `ORIGIN_EXISTS` (e.g., on retry after partial discovery), it falls back to retrieving the existing origin from `AddressOriginRepository` and continues. This ensures that retrying a failed import does not leave the wallet in an inconsistent state.

`WalletService.importWallet()` and `createWallet()` do **not** call `ensureDefaultOrigin()`. Origin creation is exclusively handled by the discovery flow. `SyncWalletUseCase` calls `ensureDefaultOrigin()` as a safety guard for legacy wallets that predate the discovery flow.

### 6. Sync After Import

Regular sync (`SyncWalletUseCase`) runs independently from import. The user triggers sync manually via "Tap to sync" in the home screen. On sync:
- `ensureDefaultOrigin` is called as a safety guard but is a no-op if origins already exist from discovery.
- UTXOs, transactions, and address statuses are fetched from the blockchain.
- Address pool is topped up to meet the minimum available threshold.

## Security Constraints

- Mnemonics are stored encrypted via `WalletKeyStorage` using `EncryptedStorageAdapter`.
- Mnemonics are never logged or exposed in plain state (stored in `useRef` during wallet creation).
- Screen capture is disabled during seed backup and confirmation screens.
- Authentication gates (PIN/biometric) protect sensitive operations: viewing the seed, sending transactions.

## Network Support

| Network  | Mempool API Base URL                          |
|----------|-----------------------------------------------|
| mainnet  | `https://mempool.space/api`                   |
| testnet  | `https://mempool.space/testnet4/api`          |
| testnet3 | `https://mempool.space/testnet/api`           |
| testnet4 | `https://mempool.space/testnet4/api`          |

Discovery queries the correct Mempool endpoint based on the network selected during import.
