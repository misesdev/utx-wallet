import { HDWallet } from 'bitcoin-tx-lib';
import type { Wallet } from '../../domain/entities/Wallet';
import type { BitcoinNetwork } from '../../domain/entities/Network';
import type { WalletRepository } from '../../domain/repositories/WalletRepository';
import { AppError } from '../../application/errors/AppError';
import { DEFAULT_NETWORK } from '../../../shared/constants/networks';
import { NetworkType } from '../../domain/value-objects/NetworkType';
import { generateId } from '../../../shared/utils/generateId';
import { WalletStorage } from '../storage/WalletStorage';
import { WalletKeyStorage } from '../storage/WalletKeyStorage';
import { WalletImportFormatDetector } from '../../domain/services/WalletImportFormatDetector';

export class WalletRepositoryImpl implements WalletRepository {
  private writeQueue: Promise<unknown> = Promise.resolve();
  private readonly importFormatDetector = new WalletImportFormatDetector();

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

      const network = NetworkType.of(DEFAULT_NETWORK);
      const { mnemonic } = HDWallet.create(undefined, { network: network.toBNetwork(), purpose: 84 });

      const wallet: Wallet = {
        id: generateId(),
        name,
        network: DEFAULT_NETWORK,
        status: 'locked',
        createdAt: new Date().toISOString(),
      };

      await this.walletStorage.save([...wallets, wallet]);
      await this.walletKeyStorage.store(wallet.id, mnemonic!);
      return wallet;
    });
  }

  async import(name: string, secret: string, network?: BitcoinNetwork, passphrase?: string): Promise<Wallet> {
    const trimmed = secret.trim();
    if (!trimmed) {
      throw new AppError('Seed phrase, private key or extended key is required', 'INVALID_SECRET');
    }

    const detected = this.importFormatDetector.detect(trimmed, network);
    if (!detected) {
      throw new AppError(
        'Invalid input. Provide a valid seed phrase, WIF/private key, xpub or xpriv.',
        'INVALID_SECRET',
      );
    }

    const resolvedNetwork = detected.network ?? network ?? DEFAULT_NETWORK;
    const normalizedPassphrase = passphrase?.trim() || undefined;
    return this.serialize(async () => {
      const wallets = await this.walletStorage.load();
      if (wallets.some(w => w.name === name)) {
        throw new AppError(`Wallet "${name}" already exists`, 'WALLET_EXISTS');
      }
      const wallet: Wallet = {
        id: generateId(),
        name,
        network: resolvedNetwork,
        status: detected.isWatchOnly ? 'watch-only' : 'locked',
        createdAt: new Date().toISOString(),
      };
      await this.walletStorage.save([...wallets, wallet]);
      await this.walletKeyStorage.storeKey(
        wallet.id,
        detected.normalizedSecret,
        normalizedPassphrase,
        detected.storageKind,
      );
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

  async rename(id: string, name: string): Promise<Wallet> {
    return this.serialize(async () => {
      const wallets = await this.walletStorage.load();
      const index = wallets.findIndex(w => w.id === id);
      if (index === -1) {
        throw new AppError(`Wallet not found: "${id}"`, 'WALLET_NOT_FOUND');
      }
      if (wallets.some(w => w.id !== id && w.name === name)) {
        throw new AppError(`Wallet "${name}" already exists`, 'WALLET_EXISTS');
      }
      const updated = { ...wallets[index], name };
      const newList = [...wallets];
      newList[index] = updated;
      await this.walletStorage.save(newList);
      return updated;
    });
  }

  async retrieveSeed(id: string): Promise<{ mnemonic: string; passphrase?: string } | null> {
    const key = await this.walletKeyStorage.retrieveKey(id);
    if (!key) return null;
    return { mnemonic: key.mnemonic, passphrase: key.passphrase };
  }

  async delete(id: string): Promise<void> {
    return this.serialize(async () => {
      const wallets = await this.walletStorage.load();
      const filtered = wallets.filter(w => w.id !== id);
      if (filtered.length === wallets.length) {
        throw new AppError(`Wallet not found: "${id}"`, 'WALLET_NOT_FOUND');
      }
      await this.walletStorage.save(filtered);
      await this.walletKeyStorage.remove(id);
    });
  }
}
