import React, { PropsWithChildren, useRef } from 'react';
import { NetworkService } from '../../core/application/services/NetworkService';
import { WalletService } from '../../core/application/services/WalletService';
import { CreateWalletUseCase } from '../../core/domain/usecases/wallet/CreateWalletUseCase';
import { ImportWalletUseCase } from '../../core/domain/usecases/wallet/ImportWalletUseCase';
import { LoadWalletsUseCase } from '../../core/domain/usecases/wallet/LoadWalletsUseCase';
import { FetchHttpClient } from '../../core/infrastructure/api/HttpClient';
import { MempoolApiClient } from '../../core/infrastructure/api/MempoolApiClient';
import { MempoolApiAdapter } from '../../core/infrastructure/adapters/MempoolApiAdapter';
import { WalletRepositoryImpl } from '../../core/infrastructure/repositories/WalletRepositoryImpl';
import { EncryptedStorageAdapter } from '../../core/infrastructure/storage/EncryptedStorageAdapter';
import { NetworkConfigStorage } from '../../core/infrastructure/storage/NetworkConfigStorage';
import { WalletKeyStorage } from '../../core/infrastructure/storage/WalletKeyStorage';
import { WalletStorage } from '../../core/infrastructure/storage/WalletStorage';
import { DEFAULT_NETWORK } from '../../shared/constants/networks';
import { NetworkProvider } from './NetworkProvider';
import { ThemeProvider } from './ThemeProvider';
import { WalletProvider } from './WalletProvider';

type Dependencies = {
  walletService: WalletService;
  networkService: NetworkService;
};

export function AppProvider({ children }: PropsWithChildren) {
  const depsRef = useRef<Dependencies | null>(null);

  if (!depsRef.current) {
    const secureStorage = new EncryptedStorageAdapter();
    const walletStorage = new WalletStorage(secureStorage);
    const walletKeyStorage = new WalletKeyStorage(secureStorage);
    const walletRepository = new WalletRepositoryImpl(walletStorage, walletKeyStorage);
    const walletService = new WalletService(
      new CreateWalletUseCase(walletRepository),
      new ImportWalletUseCase(walletRepository),
      new LoadWalletsUseCase(walletRepository),
    );

    const networkConfigStorage = new NetworkConfigStorage(secureStorage);
    const httpClient = new FetchHttpClient();
    const mempoolApiClient = new MempoolApiClient(httpClient, 'https://mempool.space');
    const nodeRepository = new MempoolApiAdapter(mempoolApiClient, networkConfigStorage, {
      network: DEFAULT_NETWORK,
      connectivityMode: 'online',
      nodeMode: 'public-api',
    });
    const networkService = new NetworkService(nodeRepository);

    depsRef.current = { walletService, networkService };
  }

  const { walletService, networkService } = depsRef.current;

  return (
    <ThemeProvider>
      <NetworkProvider networkService={networkService}>
        <WalletProvider walletService={walletService}>{children}</WalletProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}
