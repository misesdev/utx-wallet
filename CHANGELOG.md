# Changelog

## [3.0.0] — 2026-06-27

### New
- **Safe mode** — wallet refuses to open if no personal node is configured for the target network; prevents accidental use of public APIs when privacy is required
- **Transaction review screen** — dedicated screen shows full UTXO breakdown (inputs and outputs with sats) before you confirm a send
- **Fee selector redesign** — three preset tiles (slow / standard / fast) plus a custom rate row; minimum enforced at 1 sat/vByte; fee and total update live as you type

### Improved
- **Network per wallet** — each wallet now stores its own network (mainnet / testnet4); global network selector removed; routing is automatic based on the active wallet
- **Fee estimation accuracy** — BIP141 marker/flag bytes now correctly counted as 0.5 vB each (overhead 10.5 vB, input 67.75 vB); transactions are now sized and priced more accurately
- **RBF acceleration** — fee bump is always deducted from the recipient output, keeping the change output unchanged; no-change transactions are now eligible for acceleration; the original change address is reused exactly (no new address created)
- **Broadcast resilience** — on a `-26 insufficient fee` rejection, the wallet automatically retries broadcast across all configured personal nodes before giving up
- **Address management** — change addresses are now reserved only when a change output is actually needed (exact-amount sends and drains no longer waste an address); reserved addresses with no blockchain activity are automatically released back to fresh on the next sync; change pool raised to 5 (receive stays at 3)
- **Wallet list performance** — wallet metadata (name, balance, network) loaded from a fast in-memory Zustand store; active wallet data isolated in a separate store for privacy
- **Pending transaction confirmation** — transactions move from pending to confirmed in local storage as soon as the sync detects block confirmation, without waiting for a full re-sync
- **Offline mode guard** — OfflineModeService now validates the wallet network before allowing unsigned transaction export, preventing mismatched network exports
- **Fee rate floor** — selected fee rate is clamped to the node-reported minimum (`minimumSatsPerVByte`) so broadcasts never fail due to below-minimum rates
- **Address sync performance** — removed deprecated `InteractionManager` in address sync; replaced with a zero-delay yield that is compatible with all React Native versions

### Fixed
- Fixed RBF false positive — transactions with all inputs at sequence `0xFFFFFFFE` are no longer incorrectly flagged as RBF-eligible
- Fixed transaction sort order — pending transactions now appear before confirmed ones; confirmed transactions are sorted by block time descending
- Fixed accelerate transaction flow — success state no longer causes a visual freeze; back button returns to Home instead of Transaction Details
- Fixed hardcoded visible strings across 8 screens — `sats`, `sat/vB`, `BTC`, and `PIN incorreto` now go through the translation system in all locales
- Fixed change address pool leak — transactions that were built but never broadcast no longer permanently consume change addresses
- Fixed wallet import discovery gap — phantom-reserved change addresses previously caused sequential discovery to stop early, giving the false impression of lost funds

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
