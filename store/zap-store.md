# Zap Store — Publication Guide

UTX Wallet is configured for the [Zap Store](https://zapstore.dev), a decentralized
Android app store built on the Nostr protocol.

---

## How it works

Publishing to the Zap Store creates two signed Nostr events:

- **App metadata** — name, description, icon, screenshots (published once / on update)
- **App release** — version, APK hash, download URL (published per release)

Events are signed with your Nostr private key (`nsec`) and propagated to Nostr relays.
Users on the Zap Store app discover and install your app trustlessly — they verify the
APK integrity via the SHA-256 hash embedded in the Nostr event.

---

## One-time setup

### 1. Generate or locate your Nostr key

If you already have a Nostr identity (e.g., from Primal, Damus, Amethyst), use that
nsec — your app will be associated with your Nostr pubkey.

To generate a fresh key:
```bash
# Using nak (Nostr Army Knife)
brew install nak          # macOS
# or download from https://github.com/fiatjaf/nak/releases

nak key generate
# Output: nsec1... (keep this secret) + npub1... (your public identity)
```

### 2. Add GitHub Actions secrets

In **GitHub → Settings → Secrets and variables → Actions**, add:

| Secret name | Value |
|-------------|-------|
| `NOSTR_SECRET_KEY` | Your `nsec1...` Nostr private key |
| `KEYSTORE_BASE64` | `base64 -w 0 android/app/utxwallet-release.keystore` |
| `KEYSTORE_PASSWORD` | Android keystore password |
| `KEY_ALIAS` | `utxwallet-key` |
| `KEY_PASSWORD` | Android key password |

### 3. Add screenshots

Add the six screenshot files to `store/screenshots/` as described in
`store/screenshots/README.md`. The `zapstore.yaml` references them by filename.

---

## Publishing a new release

```bash
# 1. Bump versionCode + versionName in android/app/build.gradle
# 2. Update publish/notes.md with the new release notes
# 3. Commit, then tag and push:
git tag v1.3
git push origin v1.3
```

The `zapstore.yml` GitHub Actions workflow fires automatically on the tag push:
1. Builds the signed release APK
2. Installs `zapstore-cli`
3. Runs `zapstore publish` — reads `zapstore.yaml`, uploads assets, signs and
   broadcasts the Nostr events

---

## Local publish (without CI)

Install `zapstore-cli` locally:

```bash
# Linux (amd64)
curl -sL https://github.com/zapstore/zapstore-cli/releases/latest/download/zapstore-linux-x64.tar.gz \
  | tar xz
sudo mv zapstore /usr/local/bin/

# Verify
zapstore --version
```

Build the APK:
```bash
cd android && ./gradlew assembleRelease
```

Publish:
```bash
NOSTR_SECRET_KEY=nsec1... zapstore publish
```

---

## App listing

Once published, the app appears at:
```
https://zapstore.dev/app/com.misesdev.utxwallet
```

Users can also find it by searching "UTX Wallet" inside the Zap Store Android app.
