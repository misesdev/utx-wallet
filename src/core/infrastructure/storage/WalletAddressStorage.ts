import type { WalletAddress, AddressChain, AddressStatus } from '../../domain/entities/WalletAddress';
import type { Database } from './DatabaseStorage';

type WalletAddressRow = {
  id: string;
  wallet_id: string;
  origin_id: string;
  origin_name: string;
  address: string;
  path: string;
  account_index: number;
  chain: string;
  index_num: number;
  status: string;
  total_received_sats: number;
  total_sent_sats: number;
  tx_count: number;
  incoming_tx_count: number;
  outgoing_tx_count: number;
  has_utxos: number;
  is_frozen: number;
  created_at: string;
  used_at: string | null;
  last_synced_at: string | null;
};

const COLS = `
  id, wallet_id, origin_id, origin_name, address, path, account_index, chain,
  index_num, status, total_received_sats, total_sent_sats, tx_count,
  incoming_tx_count, outgoing_tx_count, has_utxos, is_frozen,
  created_at, used_at, last_synced_at
`.trim();

export class WalletAddressStorage {
  constructor(private readonly db: Database) {}

  async findByWallet(walletId: string): Promise<WalletAddress[]> {
    const rows = await this.db.execute<WalletAddressRow>(
      `SELECT ${COLS} FROM wallet_addresses WHERE wallet_id = ?`,
      [walletId],
    );
    return rows.map(this.mapRow);
  }

  async findByOrigin(walletId: string, originId: string): Promise<WalletAddress[]> {
    const rows = await this.db.execute<WalletAddressRow>(
      `SELECT ${COLS} FROM wallet_addresses WHERE wallet_id = ? AND origin_id = ?`,
      [walletId, originId],
    );
    return rows.map(this.mapRow);
  }

  async findByChain(walletId: string, originId: string, chain: AddressChain): Promise<WalletAddress[]> {
    const rows = await this.db.execute<WalletAddressRow>(
      `SELECT ${COLS} FROM wallet_addresses WHERE wallet_id = ? AND origin_id = ? AND chain = ?`,
      [walletId, originId, chain],
    );
    return rows.map(this.mapRow);
  }

  async findFreshByChain(
    walletId: string,
    originId: string,
    chain: AddressChain,
    additionalStatuses: string[] = [],
  ): Promise<WalletAddress[]> {
    const statuses = ['fresh', ...additionalStatuses];
    const placeholders = statuses.map(() => '?').join(', ');
    const rows = await this.db.execute<WalletAddressRow>(
      `SELECT ${COLS} FROM wallet_addresses WHERE wallet_id = ? AND origin_id = ? AND chain = ? AND status IN (${placeholders}) ORDER BY index_num ASC`,
      [walletId, originId, chain, ...statuses],
    );
    return rows.map(this.mapRow);
  }

  async findByAddress(address: string): Promise<WalletAddress | null> {
    const rows = await this.db.execute<WalletAddressRow>(
      `SELECT ${COLS} FROM wallet_addresses WHERE address = ? LIMIT 1`,
      [address],
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async save(wa: WalletAddress): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO wallet_addresses
        (id, wallet_id, origin_id, origin_name, address, path, account_index, chain,
         index_num, status, total_received_sats, total_sent_sats, tx_count,
         incoming_tx_count, outgoing_tx_count, has_utxos, is_frozen,
         created_at, used_at, last_synced_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        wa.id, wa.walletId, wa.originId, wa.originName, wa.address, wa.path,
        wa.accountIndex, wa.chain, wa.index, wa.status,
        wa.totalReceivedSats, wa.totalSentSats, wa.txCount,
        wa.incomingTxCount, wa.outgoingTxCount,
        wa.hasUtxos ? 1 : 0, wa.isFrozen ? 1 : 0,
        wa.createdAt, wa.usedAt, wa.lastSyncedAt,
      ],
    );
  }

  async saveMany(addresses: WalletAddress[]): Promise<void> {
    for (const wa of addresses) {
      await this.save(wa);
    }
  }

  async updateStatus(id: string, status: AddressStatus, usedAt?: string): Promise<void> {
    if (usedAt) {
      await this.db.execute(
        'UPDATE wallet_addresses SET status = ?, used_at = ? WHERE id = ?',
        [status, usedAt, id],
      );
    } else {
      await this.db.execute(
        'UPDATE wallet_addresses SET status = ? WHERE id = ?',
        [status, id],
      );
    }
  }

  async updateOriginName(originId: string, originName: string): Promise<void> {
    await this.db.execute(
      'UPDATE wallet_addresses SET origin_name = ? WHERE origin_id = ?',
      [originName, originId],
    );
  }

  async updateSyncData(
    id: string,
    data: Partial<Pick<WalletAddress,
      | 'status' | 'totalReceivedSats' | 'totalSentSats' | 'txCount'
      | 'incomingTxCount' | 'outgoingTxCount' | 'hasUtxos' | 'lastSyncedAt'
    >>,
  ): Promise<void> {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.status !== undefined) { sets.push('status = ?'); params.push(data.status); }
    if (data.totalReceivedSats !== undefined) { sets.push('total_received_sats = ?'); params.push(data.totalReceivedSats); }
    if (data.totalSentSats !== undefined) { sets.push('total_sent_sats = ?'); params.push(data.totalSentSats); }
    if (data.txCount !== undefined) { sets.push('tx_count = ?'); params.push(data.txCount); }
    if (data.incomingTxCount !== undefined) { sets.push('incoming_tx_count = ?'); params.push(data.incomingTxCount); }
    if (data.outgoingTxCount !== undefined) { sets.push('outgoing_tx_count = ?'); params.push(data.outgoingTxCount); }
    if (data.hasUtxos !== undefined) { sets.push('has_utxos = ?'); params.push(data.hasUtxos ? 1 : 0); }
    if (data.lastSyncedAt !== undefined) { sets.push('last_synced_at = ?'); params.push(data.lastSyncedAt ?? null); }

    if (sets.length === 0) return;
    params.push(id);
    await this.db.execute(`UPDATE wallet_addresses SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  async countFreshByChain(
    walletId: string,
    originId: string,
    chain: AddressChain,
    additionalStatuses: string[] = [],
  ): Promise<number> {
    const statuses = ['fresh', ...additionalStatuses];
    const placeholders = statuses.map(() => '?').join(', ');
    const rows = await this.db.execute<WalletAddressRow>(
      `SELECT id FROM wallet_addresses WHERE wallet_id = ? AND origin_id = ? AND chain = ? AND status IN (${placeholders})`,
      [walletId, originId, chain, ...statuses],
    );
    return rows.length;
  }

  async getMaxIndexByChain(walletId: string, originId: string, chain: AddressChain): Promise<number> {
    const rows = await this.db.execute<WalletAddressRow>(
      `SELECT index_num FROM wallet_addresses WHERE wallet_id = ? AND origin_id = ? AND chain = ?`,
      [walletId, originId, chain],
    );
    if (rows.length === 0) return -1;
    return Math.max(...rows.map(r => r.index_num));
  }

  async deleteByOrigin(walletId: string, originId: string): Promise<void> {
    await this.db.execute(
      'DELETE FROM wallet_addresses WHERE wallet_id = ? AND origin_id = ?',
      [walletId, originId],
    );
  }

  async deleteByWallet(walletId: string): Promise<void> {
    await this.db.execute('DELETE FROM wallet_addresses WHERE wallet_id = ?', [walletId]);
  }

  private mapRow(row: WalletAddressRow): WalletAddress {
    return {
      id: row.id,
      walletId: row.wallet_id,
      originId: row.origin_id,
      originName: row.origin_name,
      address: row.address,
      path: row.path,
      accountIndex: row.account_index,
      chain: row.chain as AddressChain,
      index: row.index_num,
      status: row.status as AddressStatus,
      totalReceivedSats: row.total_received_sats,
      totalSentSats: row.total_sent_sats,
      txCount: row.tx_count,
      incomingTxCount: row.incoming_tx_count,
      outgoingTxCount: row.outgoing_tx_count,
      hasUtxos: row.has_utxos === 1,
      isFrozen: row.is_frozen === 1,
      createdAt: row.created_at,
      usedAt: row.used_at,
      lastSyncedAt: row.last_synced_at,
    };
  }
}
