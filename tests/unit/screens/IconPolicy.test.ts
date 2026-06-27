export {};
const fs = require('fs');
const path = require('path');

declare const process: { cwd(): string };

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: any) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('icon policy', () => {
  const root = process.cwd();
  const uiFiles = walk(path.join(root, 'src/presentation'));

  it('does not import Ionicons directly outside AppIcon', () => {
    const offenders = uiFiles
      .filter(file => !file.endsWith('src/presentation/components/base/AppIcon.tsx'))
      .filter(file => fs.readFileSync(file, 'utf8').includes('react-native-vector-icons/Ionicons'));

    expect(offenders.map(file => path.relative(root, file))).toEqual([]);
  });

  it('does not use legacy emoji/symbol glyphs as primary UI icons', () => {
    const legacyIconPattern = /[◎◈⊠⊛⬡◌⊞⚙◉⊡↙↗↺↑↓✕👁↔⬛❄]/u;
    const offenders = uiFiles.flatMap(file => {
      const source = fs.readFileSync(file, 'utf8');
      return legacyIconPattern.test(source) ? [path.relative(root, file)] : [];
    });

    expect(offenders).toEqual([]);
  });

  it('keeps principal wallet components on AppIcon', () => {
    const files = [
      'src/presentation/components/wallet/AddressInput.tsx',
      'src/presentation/components/wallet/TransactionItem.tsx',
      'src/presentation/components/wallet/UtxoItem.tsx',
      'src/presentation/screens/home/HomeScreen.tsx',
      'src/presentation/screens/wallet/WalletScreen.tsx',
      'src/presentation/screens/settings/SettingsScreen.tsx',
    ];

    const missing = files.filter(file => !fs.readFileSync(path.join(root, file), 'utf8').includes('<AppIcon'));
    expect(missing).toEqual([]);
  });
});
