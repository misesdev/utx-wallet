export {};
const fs = require('fs');
const path = require('path');

declare const process: { cwd(): string };

const FILES = [
  'src/presentation/components/wallet/BalanceCard.tsx',
  'src/presentation/components/wallet/TransactionItem.tsx',
  'src/presentation/components/wallet/UtxoItem.tsx',
  'src/presentation/screens/home/HomeScreen.tsx',
  'src/presentation/screens/wallet/UtxosScreen.tsx',
  'src/presentation/screens/wallet/ReceiveScreen.tsx',
  'src/presentation/screens/settings/SettingsScreen.tsx',
  'src/presentation/screens/offline/OfflineModeScreen.tsx',
];

const FORBIDDEN = [
  'Available to send',
  'secured',
  'Received',
  'Sent',
  'Confirmed',
  'Pending',
  'Failed to load',
  'Loading accounts',
  'Go back',
  'Freeze',
  'Unfreeze',
  'Other',
];

describe('i18n policy', () => {
  it('keeps known visible strings out of principal UI files', () => {
    const root = process.cwd();
    const violations = FILES.flatMap(file => {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      return FORBIDDEN
        .filter(text => source.includes(`>${text}<`) || source.includes(`'${text}'`) || source.includes(`"${text}"`))
        .map(text => `${file}: ${text}`);
    });

    expect(violations).toEqual([]);
  });
});
