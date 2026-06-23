UTX Wallet v2.1

── WHAT'S NEW ──────────────────────────────────────────────

• Swipe between Mainnet and Testnet
  The wallet list now lets you swipe left and right to switch
  between Mainnet and Testnet tabs. The active tab follows a
  smooth sliding underline indicator. Tapping the tab labels
  still works as before.

• Authentication on every app open
  The app now requires biometric or PIN authentication each
  time it is opened. The lock screen appears instantly with no
  flash of the wallet list underneath.

• Configurable sync rate and parallel sync
  A new Sync screen under Global Settings → Network lets you
  set the maximum requests per second sent to the blockchain
  API and enable parallel address fetching. Parallel sync is
  intended for personal node users and is locked when no
  personal node is configured.

• PIN keypad improvements
  Wrong PIN attempts now shake the dots to give clear visual
  feedback. The error message disappears as soon as you start
  typing the next attempt, and the keypad can no longer become
  unresponsive after a rejection.

• Seamless PIN hash upgrade
  PINs stored with the legacy hash format are automatically
  upgraded to SHA-256 on the first successful login. No action
  is required.

• Personal node form redesigned
  The separate port field has been removed — include the port
  in the URL instead. The auth token is now behind a toggle
  (similar to the passphrase field) and the network is chosen
  from a radio list.

• Multi-device UTXO sync
  Sync now re-verifies all addresses that have stored UTXOs,
  not just the current address pool batch. Spent outputs
  created on another device are correctly removed.

• Transaction sync fixes
  Cross-iteration merges no longer produce phantom pending
  transactions. The home screen and transaction list refresh
  on every screen focus so stale data is cleared immediately
  after a sync or navigation event.

── ABOUT UTX WALLET ────────────────────────────────────────

Self-custodial Bitcoin wallet. Your keys never leave your
device. Connect to your own node. Full UTXO control.

Open source — https://github.com/misesdev/utx-wallet
