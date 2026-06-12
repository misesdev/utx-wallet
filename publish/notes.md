UTX Wallet v2.0

── WHAT'S NEW ──────────────────────────────────────────────

• New layered wallet sync
  Wallet sync now runs through explicit address, account,
  wallet, and import sync layers. This keeps sync work
  scoped, easier to test, and avoids unnecessary duplicate
  blockchain requests when transaction data was already
  fetched.

• Per-account sync
  Each account can now be synced independently from the
  account details screen. The home sync also shows which
  account and address are currently being processed, making
  larger wallets easier to follow during synchronization.

• Per-address sync with safer rules
  Address rows can be tapped to refresh a single active
  address. Spent, change, and archived addresses are blocked
  from manual sync, and address sync now validates that the
  address belongs to the selected wallet before any network
  or persistence work is performed.

• Better address pool handling
  Sync refreshes address status using prefetched transaction
  data and replenishes receive/change pools after status
  changes. This keeps the wallet aligned with the no-address-
  reuse policy while reducing extra API calls.

• Safer partial UTXO refreshes
  Partial syncs now preserve UTXOs from addresses that were
  not part of the current sync run. Existing frozen UTXO
  state is also preserved when the same txid:vout is refreshed
  from the blockchain provider.

• Improved transaction status updates
  Opening transaction details can refresh pending/confirmed
  status and persist confirmed updates so the transaction list
  and home screen reflect the latest known state.

• UI refinements
  Account balances refresh with less flicker after sync,
  sync progress labels no longer disappear for short account
  names or addresses, and the Android launcher label now
  displays "UTX Wallet".

── PREVIOUS RELEASE (v1.4) ─────────────────────────────────

• BIP84 zpub / vpub export per account
• Watch-only wallet indicators
• Watch-only sync fixed to a single account
• Correct BIP84 key labels (zprv / zpub)

── ABOUT UTX WALLET ────────────────────────────────────────

Self-custodial Bitcoin wallet. Your keys never leave your
device. Connect to your own node. Full UTXO control.

Open source — https://github.com/misesdev/utx-wallet
