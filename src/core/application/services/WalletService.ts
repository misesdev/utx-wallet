import type { Wallet } from '../../domain/entities/Wallet';
import { CreateWalletUseCase } from '../../domain/usecases/wallet/CreateWalletUseCase';
import { ImportWalletUseCase } from '../../domain/usecases/wallet/ImportWalletUseCase';
import { LoadWalletsUseCase } from '../../domain/usecases/wallet/LoadWalletsUseCase';

export class WalletService {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly importWalletUseCase: ImportWalletUseCase,
    private readonly loadWalletsUseCase: LoadWalletsUseCase,
  ) {}

  createWallet(name: string): Promise<Wallet> {
    return this.createWalletUseCase.execute(name);
  }

  importWallet(name: string, secret: string): Promise<Wallet> {
    return this.importWalletUseCase.execute(name, secret);
  }

  loadWallets(): Promise<Wallet[]> {
    return this.loadWalletsUseCase.execute();
  }
}
