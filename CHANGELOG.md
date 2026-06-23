# Changelog

## [2.1.0] — 2026-06-22

### New
- **Swipe navigation** between Mainnet and Testnet tabs on the wallet list screen — slide to switch, tap still works
- **Sync settings screen** — configure max requests per second (1–20) and enable parallel address sync for personal nodes
- **App-open authentication** — biometric (with PIN fallback) required every time the app is opened
- **PIN keypad shake** — dots shake when the wrong PIN is entered; error message disappears as soon as you start typing the next attempt

### Improved
- PIN hash silently migrated from legacy djb2 to SHA-256 — no action required; first successful login upgrades the stored hash automatically
- Auth overlay no longer flashes the wallet list before presenting the lock screen
- UTXO sync now verifies **all** addresses with stored UTXOs on multi-device setups, removing spent outputs that were created on another device
- Transaction sync cross-iteration merge fix — avoids phantom pending transactions appearing across sync cycles
- Home screen and Transaction list now refresh on every screen focus, not just on mount
- Personal node form redesigned — removed redundant port field; auth token behind a toggle (like passphrase); network selector as radio list
- Personal node probe changed to `/v1/fees/recommended` — the correct health-check endpoint

### Fixed
- Fixed auth overlay briefly showing wallet list before the lock screen appears
- Fixed "Incorrect PIN" error after SHA-256 security upgrade (djb2 fallback now works seamlessly)
- Fixed PIN keypad becoming unresponsive after a wrong attempt
- Fixed QR wallet import not running address discovery + full sync after completing
- Fixed stale wallet/transaction data on Home screen when returning from child screens

---

## [2.0.0] — 2026-05-14

### Features
- Bitcoin wallet with **BIP84 native SegWit** address derivation (bc1q / tb1q)
- Full transaction lifecycle: build → review → sign → broadcast
- **Multi-account segregation** — isolate funds in independent BIP44 account indexes
- **UTXO management** — freeze/unfreeze individual UTXOs; coin control in send flow
- **Watch-only wallets** — import via zpub / vpub or QR code scan; signing is disabled
- **Message signing and verification** — sign arbitrary text with your wallet key; verify any signature
- **Multi-personal-node routing** — priority-ordered node list with public API fallback
- **Safe mode** — force all blockchain traffic through personal nodes
- **Offline mode** — prepare and export unsigned transactions without internet; import and broadcast later
- **Security** — PIN, biometrics, auto-lock, hide balance, screenshot blocking
- **BIP39 passphrase** support end-to-end (create, import, backup, export)
- Seed phrase backup with word-by-word confirmation
- Export in multiple formats: mnemonic, zpub/vpub, zprv/vprv, WIF
- **Multi-language** — English (US) and Português (Brasil), with automatic device locale detection
- Dark and light theme support
- **RBF transaction acceleration** — bump fee on unconfirmed transactions
- Automatic HD address pool with BIP44 gap-limit scanning
- Adaptive batch import — discovers accounts and syncs address chains in parallel
- Personal node setup tutorial and BIP84 / address policy guide screens
- QR code scanner for receiving addresses, zpub import, and manual hex entry
