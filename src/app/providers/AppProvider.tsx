import React, { PropsWithChildren, useRef } from 'react';
import { AddressService } from '../../core/application/services/AddressService';
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
import { SelectWalletUseCase } from '../../core/domain/usecases/wallet/SelectWalletUseCase';
import { SyncWalletUseCase } from '../../core/domain/usecases/wallet/SyncWalletUseCase';
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
import { ChangeNetworkUseCase } from '../../core/domain/usecases/network/ChangeNetworkUseCase';
import { NodeConnectionTestUseCase } from '../../core/domain/usecases/network/NodeConnectionTestUseCase';
import { NodeProviderSelector } from '../../core/infrastructure/adapters/NodeProviderSelector';
import { PersonalNodeAdapter } from '../../core/infrastructure/adapters/PersonalNodeAdapter';
import { WalletKeyAddressProvider } from '../../core/infrastructure/adapters/WalletKeyAddressProvider';
import { WalletTransactionSigner } from '../../core/infrastructure/adapters/WalletTransactionSigner';
import { MempoolExplorerAdapter } from '../../core/infrastructure/adapters/MempoolExplorerAdapter';
import { NoopBiometricAuthAdapter } from '../../core/infrastructure/adapters/BiometricAuthAdapter';
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
import { TransactionRepositoryImpl } from '../../core/infrastructure/repositories/TransactionRepositoryImpl';
import { UtxoRepositoryImpl } from '../../core/infrastructure/repositories/UtxoRepositoryImpl';
import { WalletRepositoryImpl } from '../../core/infrastructure/repositories/WalletRepositoryImpl';
import { AddressStorage } from '../../core/infrastructure/storage/AddressStorage';
import { EncryptedStorageAdapter } from '../../core/infrastructure/storage/EncryptedStorageAdapter';
import { NetworkConfigStorage } from '../../core/infrastructure/storage/NetworkConfigStorage';
import { OpSQLiteDatabase } from '../../core/infrastructure/storage/DatabaseStorage';
import { SyncStateStorage } from '../../core/infrastructure/storage/SyncStateStorage';
import { TransactionStorage } from '../../core/infrastructure/storage/TransactionStorage';
import { UtxoStorage } from '../../core/infrastructure/storage/UtxoStorage';
import { WalletKeyStorage } from '../../core/infrastructure/storage/WalletKeyStorage';
import { WalletStorage } from '../../core/infrastructure/storage/WalletStorage';
import { DEFAULT_NETWORK } from '../../shared/constants/networks';
import { AddressProvider } from './AddressProvider';
import { NetworkProvider } from './NetworkProvider';
import { OfflineModeProvider } from './OfflineModeProvider';
import { SecurityProvider } from './SecurityProvider';
import { SendProvider } from './SendProvider';
import { ThemeProvider } from './ThemeProvider';
import { TransactionHistoryProvider } from './TransactionHistoryProvider';
import { WalletProvider } from './WalletProvider';

type Dependencies = {
  walletService: WalletService;
  networkService: NetworkService;
  addressService: AddressService;
  sendService: SendService;
  transactionHistoryService: TransactionHistoryService;
  offlineModeService: OfflineModeService;
  securityService: SecurityService;
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

    const networkConfigStorage = new NetworkConfigStorage(secureStorage);
    const httpClient = new FetchHttpClient();
    const defaultNetworkConfig = {
      network: DEFAULT_NETWORK,
      connectivityMode: 'online' as const,
      nodeMode: 'public-api' as const,
    };
    const publicNodeAdapter = new MempoolApiAdapter(httpClient, networkConfigStorage, defaultNetworkConfig);
    const personalNodeAdapter = new PersonalNodeAdapter(httpClient, networkConfigStorage, defaultNetworkConfig);
    const nodeRepository = new NodeProviderSelector(publicNodeAdapter, publicNodeAdapter, personalNodeAdapter);

    const syncStateStorage = new SyncStateStorage(secureStorage);
    const walletAddressProvider = new WalletKeyAddressProvider(walletKeyStorage);

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

    const syncUtxos = new SyncUtxosUseCase(utxoRepository, nodeRepository);
    const syncTransactions = new SyncTransactionsUseCase(transactionRepository, nodeRepository);
    const syncBalance = new SyncBalanceUseCase(utxoRepository);
    const syncWalletUseCase = new SyncWalletUseCase(
      walletRepository,
      addressRepository,
      generateReceiveAddressUseCase,
      syncUtxos,
      syncTransactions,
      syncBalance,
      syncStateStorage,
    );

    const walletService = new WalletService(
      new CreateWalletUseCase(walletRepository),
      new ImportWalletUseCase(walletRepository),
      new LoadWalletsUseCase(walletRepository),
      new SelectWalletUseCase(walletRepository),
      new DeleteWalletUseCase(walletRepository),
      new LoadTransactionsUseCase(transactionRepository),
      new LoadUtxosUseCase(utxoRepository),
      syncWalletUseCase,
      new FreezeUtxoUseCase(utxoRepository),
      new UnfreezeUtxoUseCase(utxoRepository),
    );

    const networkService = new NetworkService(
      nodeRepository,
      new NodeConnectionTestUseCase(personalNodeAdapter),
      new ChangeNetworkUseCase(nodeRepository),
    );

    const feeEstimation = new FeeEstimationService();
    const coinSelection = new CoinSelectionService(feeEstimation);
    const walletSigner = new WalletTransactionSigner(walletKeyStorage);

    const explorerAdapter = new MempoolExplorerAdapter();
    const transactionHistoryService = new TransactionHistoryService(
      new GetTransactionDetailUseCase(nodeRepository, explorerAdapter),
    );

    const buildTransactionUseCase = new BuildTransactionUseCase(
      utxoRepository,
      coinSelection,
      feeEstimation,
      walletAddressProvider,
    );
    const signTransactionUseCase = new SignTransactionUseCase(walletSigner);

    const sendService = new SendService(
      new ValidateAddressUseCase(),
      new FetchFeeRatesUseCase(nodeRepository),
      new PreviewTransactionUseCase(utxoRepository),
      buildTransactionUseCase,
      signTransactionUseCase,
      new BroadcastTransactionUseCase(nodeRepository, transactionRepository, utxoRepository),
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
    const biometricProvider = new NoopBiometricAuthAdapter();
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

    depsRef.current = {
      walletService,
      networkService,
      addressService,
      sendService,
      transactionHistoryService,
      offlineModeService,
      securityService,
    };
  }

  const { walletService, networkService, addressService, sendService, transactionHistoryService, offlineModeService, securityService } = depsRef.current;

  return (
    <ThemeProvider>
      <SecurityProvider service={securityService}>
        <NetworkProvider networkService={networkService}>
          <WalletProvider walletService={walletService}>
            <AddressProvider addressService={addressService}>
              <SendProvider sendService={sendService}>
                <TransactionHistoryProvider service={transactionHistoryService}>
                  <OfflineModeProvider service={offlineModeService}>
                    {children}
                  </OfflineModeProvider>
                </TransactionHistoryProvider>
              </SendProvider>
            </AddressProvider>
          </WalletProvider>
        </NetworkProvider>
      </SecurityProvider>
    </ThemeProvider>
  );
}
