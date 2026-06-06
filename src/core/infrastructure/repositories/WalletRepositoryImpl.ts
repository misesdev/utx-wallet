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

  async import(name: string, secret: string, network?: BitcoinNetwork): Promise<Wallet> {
    const trimmed = secret.trim();
    if (!trimmed) {
      throw new AppError('Seed phrase or extended key is required', 'INVALID_SECRET');
    }

    try {
      // BIP39 mnemonics are network-agnostic; purpose:44 avoids zpub derivation issues
      HDWallet.import(trimmed, undefined, { network: 'testnet', purpose: 44 });
    } catch {
      throw new AppError(
        'Invalid input. Provide a valid BIP39 mnemonic or extended key (xpub/xpriv).',
        'INVALID_SECRET',
      );
    }

    const resolvedNetwork = network ?? DEFAULT_NETWORK;
    return this.serialize(async () => {
      const wallets = await this.walletStorage.load();
      if (wallets.some(w => w.name === name)) {
        throw new AppError(`Wallet "${name}" already exists`, 'WALLET_EXISTS');
      }
      const wallet: Wallet = {
        id: generateId(),
        name,
        network: resolvedNetwork,
        status: 'locked',
        createdAt: new Date().toISOString(),
      };
      await this.walletStorage.save([...wallets, wallet]);
      await this.walletKeyStorage.store(wallet.id, trimmed);
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
