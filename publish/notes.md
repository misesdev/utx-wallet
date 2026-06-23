UTX Wallet v2.5

── WHAT'S NEW ──────────────────────────────────────────────

• Testnet4 displayed explicitly throughout the app
  All screens, badges, banners and node settings that showed
  "Testnet" now display "Testnet4" so there is no ambiguity
  with the legacy Testnet3. Testnet4 is now the canonical
  testnet used for new wallets, nodes and imports.

• Parallel sync fixed — now works with personal nodes
  Enabling parallel sync in Sync Settings was previously
  ineffective even with a personal node configured. The root
  cause was a network name mismatch: nodes were stored as
  "testnet" while wallets stored "testnet4". A normalization
  layer now equates all testnet variants, so a personal node
  configured for either value correctly enables parallel sync.

• Parallel sync restricted to personal-node wallets
  (carried forward from v2.4) The parallel sync option now
  applies only to wallets whose network is backed by an active
  personal node, preventing HTTP 429 errors against the
  public Mempool API.

• Personal node used for all blockchain operations
  (carried forward from v2.4) Configuring a personal node
  activates it for every operation: balance sync, UTXO sync,
  transaction queries, fee estimation, broadcast, and wallet
  discovery. The wallet no longer leaks addresses to the
  public API during import.

── ABOUT UTX WALLET ────────────────────────────────────────

Self-custodial Bitcoin wallet. Your keys never leave your
device. Connect to your own node. Full UTXO control.
Mainnet and Testnet4 supported.

Open source — https://github.com/misesdev/utx-wallet
