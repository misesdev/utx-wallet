import React, { PropsWithChildren, useRef } from 'react';
import { LanguageStorage } from '../../core/infrastructure/storage/LanguageStorage';
import { LanguageService } from '../../core/application/services/LanguageService';
import { DetectDeviceLanguageUseCase } from '../../core/domain/usecases/language/DetectDeviceLanguageUseCase';
import { GetCurrentLanguageUseCase } from '../../core/domain/usecases/language/GetCurrentLanguageUseCase';
import { SetLanguageUseCase } from '../../core/domain/usecases/language/SetLanguageUseCase';
import { LanguageProvider } from './LanguageProvider';
import { AddressService } from '../../core/application/services/AddressService';
import { AddressManagerService } from '../../core/application/services/AddressManagerService';
import { NetworkService } from '../../core/application/services/NetworkService';
import { WalletService } from '../../core/application/services/WalletService';
import { SendService } from '../../core/application/services/SendService';
import { SecurityService } from '../../core/application/services/SecurityService';
import { CoinSelectionService } from '../../core/domain/services/CoinSelectionService';
import { FeeEstimationService } from '../../core/domain/services/FeeEstimationService';
import { CreateWalletUseCase } from '../../core/domain/usecases/wallet/CreateWalletUseCase';
import { DeleteWalletUseCase } from '../../core/domain/usecases/wallet/DeleteWalletUseCase';
import { GenerateReceiveAddressUseCase } from '../../core/domain/usecases/wallet/GenerateReceiveAddressUseCase';
import { GetCurrentReceiveAddressUseCase } from '../../core/domain/usecases/wallet/GetCurrentReceiveAddressUseCase';
import { ImportWalletUseCase } from '../../core/domain/usecases/wallet/ImportWalletUseCase';
import { LoadWalletsUseCase } from '../../core/domain/usecases/wallet/LoadWalletsUseCase';
import { LoadTransactionsUseCase } from '../../core/domain/usecases/wallet/LoadTransactionsUseCase';
import { LoadUtxosUseCase } from '../../core/domain/usecases/wallet/LoadUtxosUseCase';
import { MarkAddressUsedUseCase } from '../../core/domain/usecases/wallet/MarkAddressUsedUseCase';
import { RenameWalletUseCase } from '../../core/domain/usecases/wallet/RenameWalletUseCase';
import { GetWalletSeedUseCase } from '../../core/domain/usecases/wallet/GetWalletSeedUseCase';
import { ExportWalletKeyUseCase } from '../../core/domain/usecases/wallet/ExportWalletKeyUseCase';
import { SelectWalletUseCase } from '../../core/domain/usecases/wallet/SelectWalletUseCase';
import { SyncWalletUseCase } from '../../core/domain/usecases/wallet/SyncWalletUseCase';
import { SyncAccountUseCase } from '../../core/domain/usecases/wallet/SyncAccountUseCase';
import { SyncAddressUseCase } from '../../core/domain/usecases/wallet/SyncAddressUseCase';
import { WalletImportSyncUseCase } from '../../core/domain/usecases/wallet/WalletImportSyncUseCase';
import { SyncUtxosUseCase } from '../../core/domain/usecases/wallet/SyncUtxosUseCase';
import { SyncTransactionsUseCase } from '../../core/domain/usecases/wallet/SyncTransactionsUseCase';
import { SyncBalanceUseCase } from '../../core/domain/usecases/wallet/SyncBalanceUseCase';
import { FreezeUtxoUseCase } from '../../core/domain/usecases/wallet/FreezeUtxoUseCase';
import { UnfreezeUtxoUseCase } from '../../core/domain/usecases/wallet/UnfreezeUtxoUseCase';
import { ValidateAddressUseCase } from '../../core/domain/usecases/transaction/ValidateAddressUseCase';
import { FetchFeeRatesUseCase } from '../../core/domain/usecases/transaction/FetchFeeRatesUseCase';
import { PreviewTransactionUseCase } from '../../core/domain/usecases/transaction/PreviewTransactionUseCase';
import { BuildTransactionUseCase } from '../../core/domain/usecases/transaction/BuildTransactionUseCase';
import { SignTransactionUseCase } from '../../core/domain/usecases/transaction/SignTransactionUseCase';
import { BroadcastTransactionUseCase } from '../../core/domain/usecases/transaction/BroadcastTransactionUseCase';
import { AccelerateTransactionUseCase } from '../../core/domain/usecases/transaction/AccelerateTransactionUseCase';
import { CreateAddressOriginUseCase } from '../../core/domain/usecases/address/CreateAddressOriginUseCase';
import { ListAddressOriginsUseCase } from '../../core/domain/usecases/address/ListAddressOriginsUseCase';
import { GetNextReceiveAddressUseCase } from '../../core/domain/usecases/address/GetNextReceiveAddressUseCase';
import { GetNextChangeAddressUseCase } from '../../core/domain/usecases/address/GetNextChangeAddressUseCase';
import { EnsureAddressPoolUseCase } from '../../core/domain/usecases/address/EnsureAddressPoolUseCase';
import { SyncAddressStatusUseCase } from '../../core/domain/usecases/address/SyncAddressStatusUseCase';
import { LoadSecuritySettingsUseCase } from '../../core/domain/usecases/security/LoadSecuritySettingsUseCase';
import { SaveSecuritySettingsUseCase } from '../../core/domain/usecases/security/SaveSecuritySettingsUseCase';
import { SetPinUseCase } from '../../core/domain/usecases/security/SetPinUseCase';
import { VerifyPinUseCase } from '../../core/domain/usecases/security/VerifyPinUseCase';
import { ClearPinUseCase } from '../../core/domain/usecases/security/ClearPinUseCase';
import { CheckBiometricAvailabilityUseCase } from '../../core/domain/usecases/security/CheckBiometricAvailabilityUseCase';
import { AuthenticateWithBiometricUseCase } from '../../core/domain/usecases/security/AuthenticateWithBiometricUseCase';
import { ReauthenticateUseCase } from '../../core/domain/usecases/security/ReauthenticateUseCase';
import { FetchHttpClient } from '../../core/infrastructure/api/HttpClient';
import { MempoolApiAdapter } from '../../core/infrastructure/adapters/MempoolApiAdapter';
import { MempoolAddressActivityChecker } from '../../core/infrastructure/adapters/MempoolAddressActivityChecker';
import { WalletDiscoveryUseCase } from '../../core/domain/usecases/wallet/WalletDiscoveryUseCase';
import { ChangeNetworkUseCase } from '../../core/domain/usecases/network/ChangeNetworkUseCase';
import { NodeConnectionTestUseCase } from '../../core/domain/usecases/network/NodeConnectionTestUseCase';
import { NodeProviderSelector } from '../../core/infrastructure/adapters/NodeProviderSelector';
import { PersonalNodeAdapter } from '../../core/infrastructure/adapters/PersonalNodeAdapter';
import { MultiNodeBlockchainProvider } from '../../core/infrastructure/adapters/MultiNodeBlockchainProvider';
import { WalletKeyAddressProvider } from '../../core/infrastructure/adapters/WalletKeyAddressProvider';
import { WalletTransactionSigner } from '../../core/infrastructure/adapters/WalletTransactionSigner';
import { MempoolExplorerAdapter } from '../../core/infrastructure/adapters/MempoolExplorerAdapter';
import { NativeBiometricAuthAdapter } from '../../core/infrastructure/adapters/BiometricAuthAdapter';
import { WebCryptoPinHasher } from '../../core/infrastructure/adapters/PinHasherAdapter';
import { GetTransactionDetailUseCase } from '../../core/domain/usecases/transaction/GetTransactionDetailUseCase';
import { TransactionHistoryService } from '../../core/application/services/TransactionHistoryService';
import { OfflineModeService } from '../../core/application/services/OfflineModeService';
import { SaveOfflineTransactionUseCase } from '../../core/domain/usecases/offline/SaveOfflineTransactionUseCase';
import { LoadOfflineTransactionsUseCase } from '../../core/domain/usecases/offline/LoadOfflineTransactionsUseCase';
import { DeleteOfflineTransactionUseCase } from '../../core/domain/usecases/offline/DeleteOfflineTransactionUseCase';
import { OfflineTransactionStorage } from '../../core/infrastructure/storage/OfflineTransactionStorage';
import { OfflineTransactionRepositoryImpl } from '../../core/infrastructure/repositories/OfflineTransactionRepositoryImpl';
import { SecuritySettingsStorage } from '../../core/infrastructure/storage/SecuritySettingsStorage';
import { SecuritySettingsRepositoryImpl } from '../../core/infrastructure/repositories/SecuritySettingsRepositoryImpl';
import { AddressRepositoryImpl } from '../../core/infrastructure/repositories/AddressRepositoryImpl';
import { AddressOriginRepositoryImpl } from '../../core/infrastructure/repositories/AddressOriginRepositoryImpl';
import { WalletAddressRepositoryImpl } from '../../core/infrastructure/repositories/WalletAddressRepositoryImpl';
import { TransactionRepositoryImpl } from '../../core/infrastructure/repositories/TransactionRepositoryImpl';
import { UtxoRepositoryImpl } from '../../core/infrastructure/repositories/UtxoRepositoryImpl';
import { WalletRepositoryImpl } from '../../core/infrastructure/repositories/WalletRepositoryImpl';
import { AddressOriginStorage } from '../../core/infrastructure/storage/AddressOriginStorage';
import { AddressStorage } from '../../core/infrastructure/storage/AddressStorage';
import { EncryptedStorageAdapter } from '../../core/infrastructure/storage/EncryptedStorageAdapter';
import { WalletAddressStorage } from '../../core/infrastructure/storage/WalletAddressStorage';
import { NetworkConfigStorage } from '../../core/infrastructure/storage/NetworkConfigStorage';
import { OpSQLiteDatabase } from '../../core/infrastructure/storage/DatabaseStorage';
import { SyncStateStorage } from '../../core/infrastructure/storage/SyncStateStorage';
import { TransactionStorage } from '../../core/infrastructure/storage/TransactionStorage';
import { UtxoStorage } from '../../core/infrastructure/storage/UtxoStorage';
import { WalletKeyStorage } from '../../core/infrastructure/storage/WalletKeyStorage';
import { WalletStorage } from '../../core/infrastructure/storage/WalletStorage';
import { DEFAULT_NETWORK } from '../../shared/constants/networks';
import { SYNC_REQUEST_DELAY_MS } from '../../shared/config/syncConfig';
import { SyncSettingsStorage } from '../../core/infrastructure/storage/SyncSettingsStorage';
import { SyncSettingsRepositoryImpl } from '../../core/infrastructure/repositories/SyncSettingsRepositoryImpl';
import { LoadSyncSettingsUseCase } from '../../core/domain/usecases/sync/LoadSyncSettingsUseCase';
import { SaveSyncSettingsUseCase } from '../../core/domain/usecases/sync/SaveSyncSettingsUseCase';
import { AccelerateProvider } from './AccelerateProvider';
import { SyncSettingsProvider } from './SyncSettingsProvider';
import { AddressManagerProvider } from './AddressManagerProvider';
import { AddressProvider } from './AddressProvider';
import { NetworkProvider } from './NetworkProvider';
import { OfflineModeProvider } from './OfflineModeProvider';
import { SecurityProvider } from './SecurityProvider';
import { SendProvider } from './SendProvider';
import { ThemeProvider } from './ThemeProvider';
import { TransactionHistoryProvider } from './TransactionHistoryProvider';
import { WalletProvider } from './WalletProvider';
import { WalletNetworkSync } from './WalletNetworkSync';
import { SignatureProvider } from './SignatureProvider';
import { ScreenshotGuard } from './ScreenshotGuard';
import { MessageSigningService } from '../../core/domain/services/MessageSigningService';
import { WalletMessageSigner } from '../../core/infrastructure/adapters/WalletMessageSigner';
import { SignMessageUseCase } from '../../core/domain/usecases/wallet/SignMessageUseCase';
import { VerifyMessageUseCase } from '../../core/domain/usecases/wallet/VerifyMessageUseCase';

type Dependencies = {
  walletService: WalletService;
  networkService: NetworkService;
  addressService: AddressService;
  addressManagerService: AddressManagerService;
  sendService: SendService;
  transactionHistoryService: TransactionHistoryService;
  offlineModeService: OfflineModeService;
  securityService: SecurityService;
  getCurrentLanguage: GetCurrentLanguageUseCase;
  setLanguageUseCase: SetLanguageUseCase;
  accelerateUseCase: AccelerateTransactionUseCase;
  signingService: MessageSigningService;
  signMessageUseCase: SignMessageUseCase;
  verifyMessageUseCase: VerifyMessageUseCase;
  loadSyncSettings: LoadSyncSettingsUseCase;
  saveSyncSettings: SaveSyncSettingsUseCase;
};

export function AppProvider({ children }: PropsWithChildren) {
  const depsRef = useRef<Dependencies | null>(null);

  if (!depsRef.current) {
    const secureStorage = new EncryptedStorageAdapter();
    const walletKeyStorage = new WalletKeyStorage(secureStorage);
    const walletStorage = new WalletStorage(secureStorage);
    const walletRepository = new WalletRepositoryImpl(walletStorage, walletKeyStorage);

    const db = new OpSQLiteDatabase('wallet.db');
    const utxoStorage = new UtxoStorage(db);
    const transactionStorage = new TransactionStorage(db);
    const utxoRepository = new UtxoRepositoryImpl(utxoStorage);
    const transactionRepository = new TransactionRepositoryImpl(transactionStorage);

    const walletAddressStorage = new WalletAddressStorage(db);
    const addressOriginStorage = new AddressOriginStorage(db);
    const walletAddressRepository = new WalletAddressRepositoryImpl(walletAddressStorage);
    const addressOriginRepository = new AddressOriginRepositoryImpl(addressOriginStorage);

    const networkConfigStorage = new NetworkConfigStorage(secureStorage);
    const httpClient = new FetchHttpClient();
    const defaultNetworkConfig = {
      network: DEFAULT_NETWORK,
      connectivityMode: 'online' as const,
      nodeMode: 'public-api' as const,
    };
    const publicNodeAdapter = new MempoolApiAdapter(httpClient, networkConfigStorage, defaultNetworkConfig);
    const personalNodeAdapter = new PersonalNodeAdapter(httpClient, networkConfigStorage, defaultNetworkConfig);
    const multiNodeProvider = new MultiNodeBlockchainProvider(httpClient, networkConfigStorage, publicNodeAdapter);
    const nodeRepository = new NodeProviderSelector(publicNodeAdapter, publicNodeAdapter, personalNodeAdapter, multiNodeProvider);

    const syncStateStorage = new SyncStateStorage(secureStorage);
    const walletAddressProvider = new WalletKeyAddressProvider(walletKeyStorage);

    // HD address use cases
    const ensureAddressPool = new EnsureAddressPoolUseCase(
      walletAddressRepository,
      addressOriginRepository,
      walletAddressProvider,
    );
    const getNextReceiveAddress = new GetNextReceiveAddressUseCase(
      walletAddressRepository,
      addressOriginRepository,
      ensureAddressPool,
    );
    const getNextChangeAddress = new GetNextChangeAddressUseCase(
      walletAddressRepository,
      addressOriginRepository,
      ensureAddressPool,
    );
    const syncAddressStatus = new SyncAddressStatusUseCase(
      walletAddressRepository,
      addressOriginRepository,
      utxoRepository,
      nodeRepository,
      ensureAddressPool,
    );
    const createAddressOriginUseCase = new CreateAddressOriginUseCase(
      addressOriginRepository,
      walletAddressRepository,
      walletAddressProvider,
    );
    const activityChecker = new MempoolAddressActivityChecker(httpClient);
    const walletDiscoveryUseCase = new WalletDiscoveryUseCase(
      walletAddressProvider,
      activityChecker,
      createAddressOriginUseCase,
      addressOriginRepository,
      walletRepository,
    );

    const syncBalance = new SyncBalanceUseCase(utxoRepository);
    const syncUtxos = new SyncUtxosUseCase(utxoRepository, nodeRepository, SYNC_REQUEST_DELAY_MS);
    const syncTransactions = new SyncTransactionsUseCase(transactionRepository, nodeRepository, SYNC_REQUEST_DELAY_MS);

    const syncSettingsStorage = new SyncSettingsStorage(secureStorage);
    const syncSettingsRepository = new SyncSettingsRepositoryImpl(syncSettingsStorage);
    const loadSyncSettings = new LoadSyncSettingsUseCase(syncSettingsRepository);
    const saveSyncSettings = new SaveSyncSettingsUseCase(syncSettingsRepository);

    const syncAccountUseCase = new SyncAccountUseCase(
      walletRepository,
      walletAddressRepository,
      syncUtxos,
      syncTransactions,
      syncBalance,
      syncStateStorage,
      syncAddressStatus,
      syncSettingsRepository,
    );

    const walletImportSyncUseCase = new WalletImportSyncUseCase(
      walletRepository,
      addressOriginRepository,
      createAddressOriginUseCase,
      syncAccountUseCase,
    );

    const addressManagerService = new AddressManagerService(
      createAddressOriginUseCase,
      new ListAddressOriginsUseCase(addressOriginRepository),
      getNextReceiveAddress,
      getNextChangeAddress,
      ensureAddressPool,
      addressOriginRepository,
      walletAddressRepository,
      null,
      walletDiscoveryUseCase,
      walletImportSyncUseCase,
    );

    const addressStorage = new AddressStorage(db);
    const addressRepository = new AddressRepositoryImpl(addressStorage);
    const generateReceiveAddressUseCase = new GenerateReceiveAddressUseCase(
      walletRepository,
      walletAddressProvider,
      addressRepository,
    );
    const addressService = new AddressService(
      new GetCurrentReceiveAddressUseCase(addressRepository, generateReceiveAddressUseCase),
      generateReceiveAddressUseCase,
      new MarkAddressUsedUseCase(addressRepository),
    );

    const syncWalletUseCase = new SyncWalletUseCase(
      walletRepository,
      addressOriginRepository,
      syncAccountUseCase,
      syncStateStorage,
      addressManagerService,
    );

    const walletService = new WalletService(
      new CreateWalletUseCase(walletRepository),
      new ImportWalletUseCase(walletRepository),
      new LoadWalletsUseCase(walletRepository),
      new SelectWalletUseCase(walletRepository),
      new DeleteWalletUseCase(
        walletRepository,
        utxoRepository,
        transactionRepository,
        walletAddressRepository,
        addressOriginRepository,
        addressRepository,
        syncStateStorage,
      ),
      new RenameWalletUseCase(walletRepository),
      new GetWalletSeedUseCase(walletRepository),
      new LoadTransactionsUseCase(transactionRepository),
      new LoadUtxosUseCase(utxoRepository),
      syncWalletUseCase,
      new FreezeUtxoUseCase(utxoRepository),
      new UnfreezeUtxoUseCase(utxoRepository),
      addressManagerService,
      new ExportWalletKeyUseCase(walletRepository),
      syncAccountUseCase,
      new SyncAddressUseCase(
        walletRepository,
        walletAddressRepository,
        syncUtxos,
        syncTransactions,
        syncBalance,
        syncAddressStatus,
      ),
    );

    const nodeConnectionTestUseCase = new NodeConnectionTestUseCase(personalNodeAdapter);
    const networkService = new NetworkService(
      nodeRepository,
      nodeConnectionTestUseCase,
      new ChangeNetworkUseCase(nodeRepository),
      personalNodeAdapter,
    );

    const feeEstimation = new FeeEstimationService();
    const coinSelection = new CoinSelectionService(feeEstimation);
    const walletSigner = new WalletTransactionSigner(walletKeyStorage, walletAddressRepository);

    const explorerAdapter = new MempoolExplorerAdapter();
    const transactionHistoryService = new TransactionHistoryService(
      new GetTransactionDetailUseCase(nodeRepository, explorerAdapter, transactionRepository),
    );

    const buildTransactionUseCase = new BuildTransactionUseCase(
      utxoRepository,
      coinSelection,
      feeEstimation,
      walletAddressProvider,
      getNextChangeAddress,
    );
    const signTransactionUseCase = new SignTransactionUseCase(walletSigner);

    const broadcastTransactionUseCase = new BroadcastTransactionUseCase(nodeRepository, transactionRepository, utxoRepository);

    const sendService = new SendService(
      new ValidateAddressUseCase(),
      new FetchFeeRatesUseCase(nodeRepository),
      new PreviewTransactionUseCase(utxoRepository),
      buildTransactionUseCase,
      signTransactionUseCase,
      broadcastTransactionUseCase,
    );

    const accelerateUseCase = new AccelerateTransactionUseCase(
      nodeRepository,
      feeEstimation,
      signTransactionUseCase,
      broadcastTransactionUseCase,
      transactionRepository,
    );

    const offlineTransactionStorage = new OfflineTransactionStorage(db);
    const offlineTransactionRepository = new OfflineTransactionRepositoryImpl(offlineTransactionStorage);
    const offlineModeService = new OfflineModeService(
      buildTransactionUseCase,
      signTransactionUseCase,
      new SaveOfflineTransactionUseCase(offlineTransactionRepository),
      new LoadOfflineTransactionsUseCase(offlineTransactionRepository),
      new DeleteOfflineTransactionUseCase(offlineTransactionRepository),
      nodeRepository,
    );

    const securitySettingsStorage = new SecuritySettingsStorage(secureStorage);
    const securitySettingsRepository = new SecuritySettingsRepositoryImpl(securitySettingsStorage);
    const pinHasher = new WebCryptoPinHasher();
    const biometricProvider = new NativeBiometricAuthAdapter();
    const verifyPinUseCase = new VerifyPinUseCase(securitySettingsRepository, pinHasher);
    const securityService = new SecurityService(
      new LoadSecuritySettingsUseCase(securitySettingsRepository),
      new SaveSecuritySettingsUseCase(securitySettingsRepository),
      new SetPinUseCase(securitySettingsRepository, pinHasher),
      verifyPinUseCase,
      new ClearPinUseCase(securitySettingsRepository),
      new CheckBiometricAvailabilityUseCase(biometricProvider),
      new ReauthenticateUseCase(verifyPinUseCase, new AuthenticateWithBiometricUseCase(biometricProvider)),
    );

    const languageStorage = new LanguageStorage();
    const languageService = new LanguageService(languageStorage);
    const detectDeviceLanguage = new DetectDeviceLanguageUseCase();
    const getCurrentLanguage = new GetCurrentLanguageUseCase(languageService, detectDeviceLanguage);
    const setLanguageUseCase = new SetLanguageUseCase(languageService);

    const signingService = new MessageSigningService();
    const walletMessageSigner = new WalletMessageSigner(walletKeyStorage, signingService);
    const signMessageUseCase = new SignMessageUseCase(walletMessageSigner);
    const verifyMessageUseCase = new VerifyMessageUseCase(signingService);

    depsRef.current = {
      walletService,
      networkService,
      addressService,
      addressManagerService,
      sendService,
      transactionHistoryService,
      offlineModeService,
      securityService,
      getCurrentLanguage,
      setLanguageUseCase,
      accelerateUseCase,
      signingService,
      signMessageUseCase,
      verifyMessageUseCase,
      loadSyncSettings,
      saveSyncSettings,
    };
  }

  const { walletService, networkService, addressService, addressManagerService, sendService, transactionHistoryService, offlineModeService, securityService, getCurrentLanguage, setLanguageUseCase, accelerateUseCase, signingService, signMessageUseCase, verifyMessageUseCase, loadSyncSettings, saveSyncSettings } = depsRef.current;

  return (
    <LanguageProvider getCurrentLanguage={getCurrentLanguage} setLanguage={setLanguageUseCase}>
    <ThemeProvider>
      <SecurityProvider service={securityService}>
        <ScreenshotGuard>
        <NetworkProvider networkService={networkService}>
          <SyncSettingsProvider loadUseCase={loadSyncSettings} saveUseCase={saveSyncSettings}>
          <WalletProvider walletService={walletService}>
            <WalletNetworkSync />
            <AddressManagerProvider service={addressManagerService}>
            <AddressProvider addressService={addressService}>
              <SendProvider sendService={sendService}>
                <AccelerateProvider useCase={accelerateUseCase}>
                <TransactionHistoryProvider service={transactionHistoryService}>
                  <OfflineModeProvider service={offlineModeService}>
                  <SignatureProvider
                    signMessageUseCase={signMessageUseCase}
                    verifyMessageUseCase={verifyMessageUseCase}
                    signingService={signingService}
                  >
                    {children}
                  </SignatureProvider>
                  </OfflineModeProvider>
                </TransactionHistoryProvider>
                </AccelerateProvider>
              </SendProvider>
            </AddressProvider>
            </AddressManagerProvider>
          </WalletProvider>
          </SyncSettingsProvider>
        </NetworkProvider>
        </ScreenshotGuard>
      </SecurityProvider>
    </ThemeProvider>
    </LanguageProvider>
  );
}
