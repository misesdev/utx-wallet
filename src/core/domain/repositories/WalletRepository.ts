import type { Wallet } from '../entities/Wallet';

export interface WalletRepository {
  create(name: string): Promise<Wallet>;
  import(name: string, secret: string): Promise<Wallet>;
  list(): Promise<Wallet[]>;
  findById(id: string): Promise<Wallet | null>;
}
