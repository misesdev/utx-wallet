import React from 'react';
import { AppText } from '../../../src/presentation/components/base/AppText';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import ptBR from '../../../src/shared/i18n/locales/pt-BR.json';
import enUS from '../../../src/shared/i18n/locales/en-US.json';

describe('i18n resources', () => {
  it('renders translated text in a component for en-US', () => {
    const screen = renderWithTheme(<AppText>{enUS.settings.language}</AppText>);

    expect(screen.getByText('Language')).toBeTruthy();
  });

  it('renders translated text in a component for pt-BR', () => {
    const screen = renderWithTheme(<AppText>{ptBR.settings.language}</AppText>);

    expect(screen.getByText('Idioma')).toBeTruthy();
  });

  it('keeps required language keys in both supported locales', () => {
    expect(ptBR.settings.language).toBe('Idioma');
    expect(enUS.settings.language).toBe('Language');
    expect(ptBR.qrScan.unavailableMessage).toBeTruthy();
    expect(enUS.qrScan.unavailableMessage).toBeTruthy();
  });

  it('uses correct seed phrase and optional passphrase wording in wallet creation and import', () => {
    expect(ptBR.createWallet.generateSeed).toBeTruthy();
    expect(enUS.createWallet.generateSeed).toBeTruthy();
    expect(ptBR.createWallet.passphraseSection).toBe('Passphrase opcional');
    expect(enUS.createWallet.passphraseSection).toBe('Optional passphrase');
    expect(ptBR.importWallet.seedLabel).toBe('Frase de recuperação');
    expect(enUS.importWallet.seedLabel).toBe('Seed phrase');
    expect(ptBR.importWallet.passphraseSection).toBe('Passphrase opcional');
    expect(enUS.importWallet.passphraseSection).toBe('Optional passphrase');
  });

  it('does not describe passphrase as an extra seed word in supported locales', () => {
    const flatten = (value: unknown): string[] => {
      if (typeof value === 'string') return [value];
      if (!value || typeof value !== 'object') return [];
      return Object.values(value).flatMap(flatten);
    };

    const allCopy = [...flatten(ptBR), ...flatten(enUS)].join('\n');

    const forbiddenCount = 20 + 5;

    expect(allCopy).not.toMatch(new RegExp(`${forbiddenCount}(?:ª|a|th)?\\s*(?:palavra|word)?`, 'i'));
  });

  describe('globalSettings keys', () => {
    const KEYS: Array<keyof typeof ptBR.globalSettings> = [
      'title', 'groupApp', 'groupNetwork', 'groupAdvanced', 'groupAbout', 'version', 'changelog',
    ];
    it.each(KEYS)('pt-BR has non-empty globalSettings.%s', (key) => {
      expect(ptBR.globalSettings[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty globalSettings.%s', (key) => {
      expect(enUS.globalSettings[key]).toBeTruthy();
    });
  });

  describe('donation keys', () => {
    const KEYS: Array<keyof typeof ptBR.donation> = [
      'title', 'settingsTitle', 'settingsDesc', 'heroTitle', 'description',
      'addressLabel', 'copyAddress', 'copied', 'copyFeedback', 'githubLabel',
    ];
    it.each(KEYS)('pt-BR has non-empty donation.%s', (key) => {
      expect(ptBR.donation[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty donation.%s', (key) => {
      expect(enUS.donation[key]).toBeTruthy();
    });
  });

  describe('walletSettings keys', () => {
    const KEYS: Array<keyof typeof ptBR.walletSettings> = [
      'walletName', 'editName', 'errorNameRequired', 'dangerZone', 'deleteWallet', 'deleteWalletDesc',
    ];
    it.each(KEYS)('pt-BR has non-empty walletSettings.%s', (key) => {
      expect(ptBR.walletSettings[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty walletSettings.%s', (key) => {
      expect(enUS.walletSettings[key]).toBeTruthy();
    });
  });

  describe('settings wallet-screen keys', () => {
    it('pt-BR has walletTitle, viewSeed, addresses, utxos keys', () => {
      expect(ptBR.settings.walletTitle).toBeTruthy();
      expect(ptBR.settings.viewSeed).toBeTruthy();
      expect(ptBR.settings.viewSeedDesc).toBeTruthy();
      expect(ptBR.settings.addresses).toBeTruthy();
      expect(ptBR.settings.addressesDesc).toBeTruthy();
      expect(ptBR.settings.utxos).toBeTruthy();
      expect(ptBR.settings.utxosDesc).toBeTruthy();
    });
    it('en-US has walletTitle, viewSeed, addresses, utxos keys', () => {
      expect(enUS.settings.walletTitle).toBeTruthy();
      expect(enUS.settings.viewSeed).toBeTruthy();
      expect(enUS.settings.viewSeedDesc).toBeTruthy();
      expect(enUS.settings.addresses).toBeTruthy();
      expect(enUS.settings.addressesDesc).toBeTruthy();
      expect(enUS.settings.utxos).toBeTruthy();
      expect(enUS.settings.utxosDesc).toBeTruthy();
    });
  });

  describe('viewSeed keys', () => {
    it('pt-BR has non-empty viewSeed.title', () => {
      expect(ptBR.viewSeed.title).toBeTruthy();
    });
    it('en-US has non-empty viewSeed.title', () => {
      expect(enUS.viewSeed.title).toBeTruthy();
    });
  });

  describe('walletSetup keys', () => {
    const KEYS: Array<keyof typeof ptBR.walletSetup> = [
      'step1Label', 'step2Label', 'step3Label',
      'done', 'doneDesc', 'errorTitle', 'errorDesc', 'retry', 'settingUpTitle',
      'checkingAddress', 'foundActivity', 'generatingKeys', 'syncingChain',
    ];
    it.each(KEYS)('pt-BR has non-empty walletSetup.%s', (key) => {
      expect(ptBR.walletSetup[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty walletSetup.%s', (key) => {
      expect(enUS.walletSetup[key]).toBeTruthy();
    });
  });

  describe('importWallet action key has no arrow', () => {
    it('pt-BR importAction does not contain →', () => {
      expect(ptBR.importWallet.importAction).not.toContain('→');
    });
    it('en-US importAction does not contain →', () => {
      expect(enUS.importWallet.importAction).not.toContain('→');
    });
  });

  describe('walletPolicy keys', () => {
    const KEYS: Array<keyof typeof ptBR.walletPolicy> = [
      'title', 'heroTitle', 'heroDesc',
      's1Title', 's1Body', 's2Title', 's2Body',
      's3Title', 's3Body', 's4Title', 's4Body',
      's5Title', 's5Body', 's6Title', 's6Body',
    ];
    it.each(KEYS)('pt-BR has non-empty walletPolicy.%s', (key) => {
      expect(ptBR.walletPolicy[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty walletPolicy.%s', (key) => {
      expect(enUS.walletPolicy[key]).toBeTruthy();
    });
  });

  describe('addressPolicy keys', () => {
    const KEYS: Array<keyof typeof ptBR.addressPolicy> = [
      'title', 'heroTitle', 'heroDesc',
      's1Title', 's1Body', 's2Title', 's2Body',
      's3Title', 's3Body', 's4Title', 's4Body',
      's5Title', 's5Body', 's6Title', 's6Body',
      's7Title', 's7Body',
    ];
    it.each(KEYS)('pt-BR has non-empty addressPolicy.%s', (key) => {
      expect(ptBR.addressPolicy[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty addressPolicy.%s', (key) => {
      expect(enUS.addressPolicy[key]).toBeTruthy();
    });
  });

  describe('common.info key', () => {
    it('pt-BR has non-empty common.info', () => {
      expect(ptBR.common.info).toBeTruthy();
    });
    it('en-US has non-empty common.info', () => {
      expect(enUS.common.info).toBeTruthy();
    });
  });

  describe('walletList stat keys', () => {
    const KEYS: Array<keyof typeof ptBR.walletList> = ['statBalance', 'statAccounts', 'statUtxos'];
    it.each(KEYS)('pt-BR has non-empty walletList.%s', (key) => {
      expect(ptBR.walletList[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty walletList.%s', (key) => {
      expect(enUS.walletList[key]).toBeTruthy();
    });
  });

  describe('accountDetails keys', () => {
    const KEYS: Array<keyof typeof ptBR.accountDetails> = [
      'title', 'rename', 'renameTitle', 'renamePlaceholder', 'renameError',
      'balance', 'pending', 'transactions', 'noTransactions', 'noTransactionsDesc',
    ];
    it.each(KEYS)('pt-BR has non-empty accountDetails.%s', (key) => {
      expect(ptBR.accountDetails[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty accountDetails.%s', (key) => {
      expect(enUS.accountDetails[key]).toBeTruthy();
    });
  });

  describe('qrScan address keys', () => {
    it('pt-BR has qrScan.addressPlaceholder', () => {
      expect(ptBR.qrScan.addressPlaceholder).toBeTruthy();
    });
    it('en-US has qrScan.addressPlaceholder', () => {
      expect(enUS.qrScan.addressPlaceholder).toBeTruthy();
    });
    it('pt-BR has qrScan.emptyError', () => {
      expect(ptBR.qrScan.emptyError).toBeTruthy();
    });
    it('en-US has qrScan.emptyError', () => {
      expect(enUS.qrScan.emptyError).toBeTruthy();
    });
  });

  describe('fees payFee/recipientReceives keys', () => {
    const KEYS: Array<keyof typeof ptBR.fees> = [
      'payFee', 'payFeeHint', 'noPayFeeHint', 'recipientReceives',
    ];
    it.each(KEYS)('pt-BR has non-empty fees.%s', (key) => {
      expect(ptBR.fees[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty fees.%s', (key) => {
      expect(enUS.fees[key]).toBeTruthy();
    });
  });

  describe('fees inputs/outputs (Electrum-style preview) keys', () => {
    const KEYS: Array<keyof typeof ptBR.fees> = ['inputs', 'outputs', 'changeOutput'];
    it.each(KEYS)('pt-BR has non-empty fees.%s', (key) => {
      expect(ptBR.fees[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty fees.%s', (key) => {
      expect(enUS.fees[key]).toBeTruthy();
    });
  });

  describe('send.errorInsufficientBalance key', () => {
    it('pt-BR has non-empty send.errorInsufficientBalance', () => {
      expect(ptBR.send.errorInsufficientBalance).toBeTruthy();
    });
    it('en-US has non-empty send.errorInsufficientBalance', () => {
      expect(enUS.send.errorInsufficientBalance).toBeTruthy();
    });
  });

  describe('txSuccess.copied key', () => {
    it('pt-BR has non-empty txSuccess.copied', () => {
      expect(ptBR.txSuccess.copied).toBeTruthy();
    });
    it('en-US has non-empty txSuccess.copied', () => {
      expect(enUS.txSuccess.copied).toBeTruthy();
    });
  });

  describe('nodeTutorial keys', () => {
    const KEYS: Array<keyof typeof ptBR.nodeTutorial> = [
      'title', 'heroTitle', 'heroDesc',
      's1Title', 's1Body', 's2Title', 's2Body',
      's3Title', 's3Body', 's4Title', 's4Body',
      's5Title', 's5Body', 's6Title', 's6Body',
      's7Title', 's7Body',
    ];
    it.each(KEYS)('pt-BR has non-empty nodeTutorial.%s', (key) => {
      expect(ptBR.nodeTutorial[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty nodeTutorial.%s', (key) => {
      expect(enUS.nodeTutorial[key]).toBeTruthy();
    });
  });

  describe('manageNodes keys', () => {
    const KEYS: Array<keyof typeof ptBR.manageNodes> = [
      'title', 'subtitle', 'addNode', 'empty', 'emptyDesc',
      'priority', 'publicFallback', 'publicFallbackDesc', 'info',
    ];
    it.each(KEYS)('pt-BR has non-empty manageNodes.%s', (key) => {
      expect(ptBR.manageNodes[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty manageNodes.%s', (key) => {
      expect(enUS.manageNodes[key]).toBeTruthy();
    });
  });

  describe('nodeSettings multi-node keys', () => {
    const KEYS: Array<keyof typeof ptBR.nodeSettings> = [
      'title', 'titleEdit', 'label', 'labelPlaceholder',
      'urlHint',
      'authTokenSection', 'authTokenDesc', 'authToken', 'authTokenPlaceholder',
      'showToken', 'hideToken',
      'networkMainnetDesc', 'networkTestnetDesc',
      'httpNodeWarning',
      'testConnection', 'testRequired', 'saveAndAdd', 'saveChanges',
      'status_connected', 'status_disconnected',
      'statusNotTestedDesc', 'statusConnectedDesc', 'statusDisconnectedDesc',
      'statusNetworkMismatchDesc', 'statusAuthErrorDesc',
    ];
    it.each(KEYS)('pt-BR has non-empty nodeSettings.%s', (key) => {
      expect(ptBR.nodeSettings[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty nodeSettings.%s', (key) => {
      expect(enUS.nodeSettings[key]).toBeTruthy();
    });
  });

  describe('safeMode multi-node keys', () => {
    const KEYS: Array<keyof typeof ptBR.safeMode> = [
      'nodesLabel', 'nodesConfigured', 'noNodesConfigured', 'manageNodes',
    ];
    it.each(KEYS)('pt-BR has non-empty safeMode.%s', (key) => {
      expect(ptBR.safeMode[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty safeMode.%s', (key) => {
      expect(enUS.safeMode[key]).toBeTruthy();
    });
  });

  describe('safeMode wallet blocking keys', () => {
    const KEYS: Array<keyof typeof ptBR.safeMode> = [
      'walletBlocked', 'walletBlockedDesc', 'disableSafeModeAndOpen', 'noNodeForNetwork',
    ];
    it.each(KEYS)('pt-BR has non-empty safeMode.%s', (key) => {
      expect(ptBR.safeMode[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty safeMode.%s', (key) => {
      expect(enUS.safeMode[key]).toBeTruthy();
    });
  });

  describe('accountPolicy keys', () => {
    const KEYS: Array<keyof typeof ptBR.accountPolicy> = [
      'title', 'heroTitle', 'heroDesc',
      's1Title', 's1Body', 's2Title', 's2Body',
      's3Title', 's3Body', 's4Title', 's4Body',
      's5Title', 's5Body', 's6Title', 's6Body',
      's7Title', 's7Body',
    ];
    it.each(KEYS)('pt-BR has non-empty accountPolicy.%s', (key) => {
      expect(ptBR.accountPolicy[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty accountPolicy.%s', (key) => {
      expect(enUS.accountPolicy[key]).toBeTruthy();
    });
  });

  describe('pinModal keys', () => {
    const KEYS: Array<keyof typeof ptBR.pinModal> = [
      'setNewTitle', 'confirmNewTitle', 'verifyToRemoveTitle', 'verifyTitle',
      'setNewSubtitle', 'confirmNewSubtitle', 'verifyToRemoveSubtitle', 'verifySubtitle',
    ];
    it.each(KEYS)('pt-BR has non-empty pinModal.%s', (key) => {
      expect(ptBR.pinModal[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty pinModal.%s', (key) => {
      expect(enUS.pinModal[key]).toBeTruthy();
    });
  });

  describe('walletExport keys', () => {
    const KEYS: Array<keyof typeof ptBR.walletExport> = [
      'title', 'chooseFormat',
      'formatMnemonic', 'formatMnemonicDesc',
      'formatXpriv', 'formatXprivDesc',
      'formatXpub', 'formatXpubDesc',
      'formatWif', 'formatWifDesc',
      'exportedKey', 'warningTitle', 'warningBody',
      'copied', 'loadError', 'loading',
    ];
    it.each(KEYS)('pt-BR has non-empty walletExport.%s', (key) => {
      expect(ptBR.walletExport[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty walletExport.%s', (key) => {
      expect(enUS.walletExport[key]).toBeTruthy();
    });
  });

  describe('settings export keys', () => {
    it('pt-BR has settings.export and settings.exportDesc', () => {
      expect(ptBR.settings.export).toBeTruthy();
      expect(ptBR.settings.exportDesc).toBeTruthy();
    });
    it('en-US has settings.export and settings.exportDesc', () => {
      expect(enUS.settings.export).toBeTruthy();
      expect(enUS.settings.exportDesc).toBeTruthy();
    });
  });

  describe('home.testnetBanner key', () => {
    it('pt-BR has non-empty home.testnetBanner', () => {
      expect(ptBR.home.testnetBanner).toBeTruthy();
    });
    it('en-US has non-empty home.testnetBanner', () => {
      expect(enUS.home.testnetBanner).toBeTruthy();
    });
  });

  describe('transactions.replaced and txDetails.replacedBy keys', () => {
    it('pt-BR has non-empty transactions.replaced', () => {
      expect(ptBR.transactions.replaced).toBeTruthy();
    });
    it('en-US has non-empty transactions.replaced', () => {
      expect(enUS.transactions.replaced).toBeTruthy();
    });
    it('pt-BR has non-empty txDetails.replacedBy', () => {
      expect(ptBR.txDetails.replacedBy).toBeTruthy();
    });
    it('en-US has non-empty txDetails.replacedBy', () => {
      expect(enUS.txDetails.replacedBy).toBeTruthy();
    });
  });

  describe('syncSettings keys', () => {
    const KEYS = [
      'title', 'sectionRate', 'sectionParallel',
      'maxRps', 'maxRpsDesc', 'requestDelay', 'delayValue',
      'parallelSync', 'parallelSyncDesc', 'requiresPersonalNode',
      'parallelWarning', 'rateLimitInfo', 'info',
    ] as const;
    it.each(KEYS)('pt-BR has non-empty syncSettings.%s', (key) => {
      expect(ptBR.syncSettings[key]).toBeTruthy();
    });
    it.each(KEYS)('en-US has non-empty syncSettings.%s', (key) => {
      expect(enUS.syncSettings[key]).toBeTruthy();
    });

    it('pt-BR has settings.syncSettings and settings.syncSettingsDesc', () => {
      expect(ptBR.settings.syncSettings).toBeTruthy();
      expect(ptBR.settings.syncSettingsDesc).toBeTruthy();
    });
    it('en-US has settings.syncSettings and settings.syncSettingsDesc', () => {
      expect(enUS.settings.syncSettings).toBeTruthy();
      expect(enUS.settings.syncSettingsDesc).toBeTruthy();
    });
  });

});
