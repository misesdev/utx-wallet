UTX Wallet v2.4

── WHAT'S NEW ──────────────────────────────────────────────

• Personal node now used for all blockchain operations
  Configuring a personal node now automatically activates it
  for every operation — balance sync, UTXO sync, transaction
  queries, fee estimation, broadcast, and wallet discovery.
  Previously the node was silently ignored unless "Safe Mode"
  was enabled separately. The wallet also no longer leaks
  addresses to the public Mempool API during import discovery.

• Parallel sync restricted to personal-node wallets
  The parallel sync option in Sync Settings now applies only
  to wallets whose network is backed by a personal node.
  Enabling it for public-API wallets was causing HTTP 429
  rate-limit errors. The toggle in the settings screen now
  correctly reflects whether the active network qualifies.

• Transaction inputs and outputs shown in send preview
  The fee review screen now lists the UTXOs selected as
  inputs and the resulting outputs (recipient + change),
  matching the Electrum-style breakdown familiar to advanced
  users. The same detail view appears in Transaction Details.

• RBF acceleration no longer shows false "ineligible"
  Transactions with sufficient change were sometimes flagged
  as ineligible for acceleration. The root cause was the sync
  engine overwriting the stored recipient address on every
  scan; the recipient address is now preserved so the RBF
  check finds the correct output.

• Transactions sorted correctly by date
  Same-day transactions were appearing out of order on the
  home screen. The list is now sorted by timestamp descending
  in all cases.

• Spent and change addresses can be re-synced
  The address list previously blocked manual sync on
  spent_once and change addresses. These addresses can
  receive new transactions, so the restriction has been
  lifted. Only archived addresses remain non-syncable.

── ABOUT UTX WALLET ────────────────────────────────────────

Self-custodial Bitcoin wallet. Your keys never leave your
device. Connect to your own node. Full UTXO control.
Mainnet and Testnet4 supported.

Open source — https://github.com/misesdev/utx-wallet
