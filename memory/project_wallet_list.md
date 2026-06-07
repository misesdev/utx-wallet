---
name: project-wallet-list
description: "WalletListScreen as initial app screen; network tabs (mainnet/testnet3/testnet4/node); wallet cards with delete; 1085 tests passing"
metadata:
  type: project
---

WalletListScreen is now the first screen users see. Replaces the old wallet-count condition that switched between AppNavigator and AuthNavigator.

**Why:** User wanted multi-wallet support from the start — list all wallets, filter by network, delete wallets, tap to open.

**How to apply:** RootNavigator always shows AppNavigator (no AuthNavigator). WalletListScreen is the first Stack.Screen. CreateWalletProvider wraps AppNavigator so auth flow screens (CreateWallet, BackupSeed, ConfirmSeed, ImportWallet) are reachable from AppNavigator.

## Architecture changes

- `RootNavigator.tsx` — removed `wallets.length > 0` condition; always renders `<AppNavigator />`
- `AppNavigator.tsx` — wrapped with `CreateWalletProvider`; WalletList is first screen; auth screens (CreateWallet, ImportWallet, BackupSeed, ConfirmSeed) added to AppNavigator
- `routes.ts` — `AppStackParamList` and `AppRoutes` include WalletList, CreateWallet, ImportWallet, BackupSeed, ConfirmSeed
- `BackupSeedScreen.tsx` — uses `AppRoutes.ConfirmSeed` (was `AuthRoutes.ConfirmSeed`)
- `CreateWalletScreen.tsx` — uses `AppRoutes.BackupSeed` (was `AuthRoutes.BackupSeed`)
- `ConfirmSeedScreen.tsx` — after save, `useEffect` detects `step==='saving' && !isLoading && !error`, calls `reset()` then navigates to `AppRoutes.WalletList`

## WalletListScreen design

- Network tabs: Mainnet | Testnet3 | Testnet4 | Node (filter wallets by network)
- "Node" tab = wallets whose `network` is not mainnet/testnet3/testnet4 (catch-all)
- Each wallet card: colored strip + icon + name + date + network badge + status badge + chevron
- Delete: ✕ button on card → AppConfirmModal confirmation
- Empty state: "No wallets yet" + "Create wallet" + "Import wallet" CTAs
- Header: AppLogo + "Wallets" title + Import (↓) + Create (+) header buttons

## Test result

1085 tests passing across 95 suites. Zero lint warnings.
