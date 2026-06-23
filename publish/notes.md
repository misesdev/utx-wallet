UTX Wallet v2.3

── WHAT'S NEW ──────────────────────────────────────────────

• Wallet balance no longer zeroes after a send
  The change address allocated during a transaction was being
  silently excluded from sync, making the wallet appear empty
  until a full re-discovery. The sync engine now includes
  reserved change addresses in every iteration so the returning
  balance appears immediately after a send confirms.

• Frozen UTXOs excluded from available balance
  Coins marked as frozen are now correctly excluded from the
  spendable balance shown on the send screen, the account
  summary, and the transaction preview. Previously the app
  would show a higher-than-real balance and then fail at
  broadcast time when the coin selection skipped the frozen
  inputs.

• Accelerate transaction requires authentication
  The "Confirm acceleration" button on the RBF screen now
  requires PIN or biometric verification before broadcasting,
  consistent with the send flow.

• Replaced transactions no longer stay pending forever
  When a transaction is accelerated via RBF the original
  transaction is immediately marked as Replaced in local
  storage. Subsequent syncs preserve that status so the old
  transaction never reappears as pending. The transaction
  detail screen shows the replacement txid so you can track
  the new transaction.

• Personal node used for address status sync
  Address status lookups (used to advance the HD address pool
  after a receive) now go through the personal node when one
  is configured, instead of always falling back to the public
  Mempool API.

• Pending status corrected after cross-iteration sync
  When a spend and its change address are discovered in
  different sync iterations, the merged transaction record
  now correctly reflects a confirmed status as soon as either
  side confirms on-chain.

── ABOUT UTX WALLET ────────────────────────────────────────

Self-custodial Bitcoin wallet. Your keys never leave your
device. Connect to your own node. Full UTXO control.

Open source — https://github.com/misesdev/utx-wallet
