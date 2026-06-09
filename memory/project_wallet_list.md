---
name: project-wallet-list
description: "WalletListScreen with elegant WalletCard showing balance/accounts/UTXOs; delete removed from card (settings only); 1588 tests passing"
metadata:
  type: project
---

WalletListScreen is the first screen users see. Uses redesigned WalletCard with async stat loading.

**Why:** Multi-wallet UX with richer info at a glance; delete removed from card to prevent accidental deletions.

**How to apply:** WalletCard shows a 3px top accent strip (orange=mainnet, purple=testnet), identity row with wallet icon + name + network badge + date, then a 3-stat footer (BALANCE / ACCOUNTS / UTXOs). Stats load asynchronously via `listUtxos` + `getOrigins` after `wallets` changes; show `—` while loading. Balance ≥1 BTC shows in BTC notation (4 decimals), otherwise sats with `toLocaleString`. Delete is accessible only from WalletSettingsScreen, not from the list.

## Architecture

- `RootNavigator.tsx` — always renders `<AppNavigator />` (no auth gate)
- `AppNavigator.tsx` — WalletList is first screen; wrapped with `CreateWalletProvider`
- `WalletListScreen.tsx` — `WalletCard` + `StatCol` + `NetworkTabChip` + `EmptyState` subcomponents; summaries loaded in `useEffect([wallets])`
- Tabs: Mainnet | Testnet (testnet/testnet3/testnet4 all mapped to Testnet tab)

## Test result

1588 tests passing, 126 suites. Zero lint/TypeScript warnings.
