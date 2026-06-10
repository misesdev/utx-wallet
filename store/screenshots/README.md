# Store Screenshots

Add screenshots here before publishing to the Zap Store.

## Required files (referenced in `zapstore.yaml`)

| File | Screen |
|------|--------|
| `01-home.png` | Home screen — balance, recent transactions, sync status |
| `02-send.png` | Send screen — address input + fee selector |
| `03-utxos.png` | UTXO screen — full list with freeze controls |
| `04-nodes.png` | Personal nodes — ManageNodes with multi-node priority list |
| `05-receive.png` | Receive screen — QR code |
| `06-security.png` | Security settings — PIN + biometrics |

## Recommended specs

- **Dimensions:** 1080 × 1920 px (portrait, 9:16)
- **Format:** PNG
- **Content:** Real app screenshots, no device frames required

## How to capture

1. Run the app on a physical device or emulator
2. Enable dark mode for a premium look (app supports both themes)
3. Use `adb exec-out screencap -p > screenshot.png` or the device screenshot gesture
4. Rename and place files in this folder
