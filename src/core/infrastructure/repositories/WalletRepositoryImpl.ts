import type { Wallet } from '../../domain/entities/Wallet';
import type { WalletRepository } from '../../domain/repositories/WalletRepository';
import { AppError } from '../../application/errors/AppError';
import { DEFAULT_NETWORK } from '../../../shared/constants/networks';
import { generateId } from '../../../shared/utils/generateId';
import { WalletStorage } from '../storage/WalletStorage';
import { WalletKeyStorage } from '../storage/WalletKeyStorage';

export class WalletRepositoryImpl implements WalletRepository {
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly walletStorage: WalletStorage,
    private readonly walletKeyStorage: WalletKeyStorage,
  ) {}

  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.writeQueue.then(fn);
    this.writeQueue = task.catch(() => {});
    return task;
  }

  async create(name: string): Promise<Wallet> {
    return this.serialize(async () => {
      const wallets = await this.walletStorage.load();
      if (wallets.some(w => w.name === name)) {
        throw new AppError(`Wallet "${name}" already exists`, 'WALLET_EXISTS');
      }
      const wallet: Wallet = {
        id: generateId(),
        name,
        network: DEFAULT_NETWORK,
        status: 'locked',
        createdAt: new Date().toISOString(),
      };
      await this.walletStorage.save([...wallets, wallet]);
      return wallet;
    });
  }

  async import(name: string, secret: string): Promise<Wallet> {
    if (!secret || secret.trim().length === 0) {
      throw new AppError('Secret (seed phrase or xpub) is required', 'INVALID_SECRET');
    }
    return this.serialize(async () => {
      const wallets = await this.walletStorage.load();
      if (wallets.some(w => w.name === name)) {
        throw new AppError(`Wallet "${name}" already exists`, 'WALLET_EXISTS');
      }
      const wallet: Wallet = {
        id: generateId(),
        name,
        network: DEFAULT_NETWORK,
        status: 'locked',
        createdAt: new Date().toISOString(),
      };
      await this.walletStorage.save([...wallets, wallet]);
      await this.walletKeyStorage.store(wallet.id, secret.trim());
      return wallet;
    });
  }

  async list(): Promise<Wallet[]> {
    return this.walletStorage.load();
  }

  async findById(id: string): Promise<Wallet | null> {
    const wallets = await this.walletStorage.load();
    return wallets.find(w => w.id === id) ?? null;
  }
}
