---
name: project-ux-review
description: UX/UI review + redesign passes; current state after Home redesign and new screens
metadata:
  type: project
---

## Home screen redesign (completed 2026-06-06)
Full redesign of HomeScreen:
- Header row: wallet name (left) + safe mode badge + NetworkBadge (right)
- Balance hero: centered sats (display variant, 44px), BTC below, Pending inline — NO card/border
- Tap balance or "›" chevron → navigates to `Transactions` screen
- Sync pill: centered, "Last sync: HH:MM:SS" / "Tap to sync"
- 4 round quick-action buttons (58px circles): Segregação, Configurações, UTXOs, Endereços
  - Portuguese display labels, English a11yLabels for accessibility
- Origins/accounts list: each origin card with icon, name, account index, Default badge
- Bottom dock: only Send (primary/amber) + Receive (success color), no secondary row
- Activity section: all transactions inline (no TransactionItem component), testID=`transaction-{id}`

**Why:** User requested Nubank-style balance hero, segregation account list, and simplified dock.

## New screens
- `TransactionListScreen` (route: `Transactions`) — full tx list, navigated from balance tap
- `SegregationScreen` (route: `Segregation`) — list origins + create new via modal with TextInput
- `AddressesScreen` (route: `Addresses`) — HD addresses grouped by origin → receive/change chains

## Routes added
`AppRoutes.Transactions`, `AppRoutes.Segregation`, `AppRoutes.Addresses`

## AddressManagerService additions
- `walletAddressRepository` as 7th constructor param
- `listAddresses(walletId)` method → exposes `findByWallet`
- `AddressManagerProvider` exposes `listAddresses` in context
- `AppProvider` wires `walletAddressRepository` as 7th arg

## Previous UX work
- AppSkeleton, AppConfirmModal, AppEmptyState(action), BalanceCard(hidden), SettingsScreen real nav, all screens in English

**Total: 1061 tests, 93 suites, all passing**
