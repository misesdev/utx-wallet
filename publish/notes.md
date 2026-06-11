UTX Wallet v1.3

── WHAT'S NEW ──────────────────────────────────────────────

• Message signing
  Sign any text with your wallet key and share the result
  as a compact QR code. Verify signatures from other wallets
  directly in-app — no third-party tools needed.

• Balance privacy eye button
  When "Hide Balances" is on, a tap on the eye button
  temporarily reveals balances on that screen after PIN
  verification. Tap again to re-hide instantly — no need
  to visit settings.

• Biometric unlock on app open
  If a PIN is configured the app now tries biometric
  authentication (fingerprint or face) first when opening,
  falling back to PIN automatically. Sensitive flows
  (send, view seed) continue to require the PIN so you
  never forget it.

• Screenshot prevention
  Enabling "Block Screenshots" now enforces Android
  FLAG_SECURE: the OS blocks screenshots, screen recording,
  and hides the app thumbnail in the recent-apps switcher.

• Seed auto-hides on app switch
  The recovery phrase is cleared from the screen the
  moment you switch away from the app, so it never
  appears in the task switcher.

• Navigation param hardening
  Seeds and private keys are no longer stored in navigation
  state. Sensitive values are held in an in-memory store
  and consumed on first read, reducing the attack surface
  if navigation state is ever inspected.

── PREVIOUS RELEASE (v1.2) ─────────────────────────────────

• Wallet import with adaptive address discovery
• Multi-account support (BIP44)
• Address segregation and coin control
• Multiple personal nodes with priority and failover
• Node setup guide (Docker, Umbrel, RaspiBlitz, Start9)
• Account policy screen
• Navigation hardening after terminal flows

── ABOUT UTX WALLET ────────────────────────────────────────

Self-custodial Bitcoin wallet. Your keys never leave your
device. Connect to your own node. Full UTXO control.

Open source — https://github.com/misesdev/utx-wallet
