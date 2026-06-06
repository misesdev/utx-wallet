import type { Wallet } from '../entities/Wallet';
import type { BitcoinNetwork } from '../entities/Network';

export interface WalletRepository {
  create(name: string): Promise<Wallet>;
  import(name: string, secret: string, network?: BitcoinNetwork): Promise<Wallet>;
  list(): Promise<Wallet[]>;
  findById(id: string): Promise<Wallet | null>;
  delete(id: string): Promise<void>;
}
