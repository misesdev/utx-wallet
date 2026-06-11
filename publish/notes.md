UTX Wallet v1.4

── WHAT'S NEW ──────────────────────────────────────────────

• BIP84 zpub / vpub export per account
  Export the extended public key for any individual account.
  An account picker shows all derived accounts with their
  BIP84 derivation paths before exporting. Each account
  produces its own unique zpub (mainnet) or vpub (testnet)
  at m/84'/coin_type'/account', ready to import into any
  watch-only wallet (Sparrow, Electrum, Ledger Live, etc.).

• Watch-only wallet indicators
  Wallets imported via zpub/vpub are now clearly labelled
  "Watch Only" on the wallet list and home screen header.
  The account segregation screen and wallet settings
  disable features that require the private key (new
  accounts, seed backup, key export) and explain why.

• Watch-only sync fixed to a single account
  A zpub/vpub covers exactly one BIP84 account. The import
  and discovery flows now respect this: address scanning
  stops after account 0 for watch-only wallets, preventing
  the infinite multi-account discovery loop that occurred
  when all account indices resolved to the same key.

• Correct BIP84 key labels (zprv / zpub)
  The export format screen now displays the proper BIP84
  key names — zprv / vprv for the extended private key and
  zpub / vpub for the extended public key — instead of the
  generic xpriv / xpub labels.

── PREVIOUS RELEASE (v1.3) ─────────────────────────────────

• Message signing
• Balance privacy eye button
• Biometric unlock on app open
• Screenshot prevention (Android FLAG_SECURE)
• Seed auto-hides on app switch
• Navigation param hardening

── ABOUT UTX WALLET ────────────────────────────────────────

Self-custodial Bitcoin wallet. Your keys never leave your
device. Connect to your own node. Full UTXO control.

Open source — https://github.com/misesdev/utx-wallet
