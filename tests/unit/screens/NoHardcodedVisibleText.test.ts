export {};
declare const process: { cwd(): string };

const fs = require('fs');
const path = require('path');

const UI_FILES = [
  'src/presentation/components/security/PinInputModal.tsx',
  'src/presentation/components/wallet/FeeSelector.tsx',
  'src/presentation/components/wallet/AddressInput.tsx',
  'src/presentation/screens/settings/BackupSettingsScreen.tsx',
  'src/presentation/screens/wallet/WalletDetailsScreen.tsx',
  'src/presentation/screens/settings/LanguageScreen.tsx',
];

const FORBIDDEN_VISIBLE_TEXT = [
  'Criar PIN',
  'Confirmar PIN',
  'Digite um PIN',
  'Cancelar',
  'Taxa de rede',
  'Econômica',
  'Rápida',
  'sats por vByte',
  'Camera scanning will be available in a future update.',
  'Wallets loaded:',
  'Carteiras',
];

describe('main UI i18n coverage', () => {
  it('does not keep known visible UI copy hardcoded in principal screens/components', () => {
    const root = process.cwd();
    const violations = UI_FILES.flatMap(file => {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      return FORBIDDEN_VISIBLE_TEXT
        .filter(text => source.includes(text))
        .map(text => `${file}: ${text}`);
    });

    expect(violations).toEqual([]);
  });
});
