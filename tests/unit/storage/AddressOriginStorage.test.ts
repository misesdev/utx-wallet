import { AddressOriginStorage } from '../../../src/core/infrastructure/storage/AddressOriginStorage';
import { createDatabaseMock } from '../../mocks/database';

const WALLET_ID = 'wallet-1';

function originRow(id: string, accountIndex: number, archivedAt: string | null = null) {
  return {
    id,
    wallet_id: WALLET_ID,
    name: id,
    type: accountIndex === 0 ? 'default' : 'custom',
    account_index: accountIndex,
    created_at: '2026-01-01T00:00:00.000Z',
    archived_at: archivedAt,
  };
}

describe('AddressOriginStorage.getMaxAccountIndex', () => {
  it('returns -1 when no origins exist', async () => {
    const db = createDatabaseMock();
    (db.execute as jest.Mock).mockResolvedValueOnce([]);
    const storage = new AddressOriginStorage(db);

    const result = await storage.getMaxAccountIndex(WALLET_ID);

    expect(result).toBe(-1);
  });

  it('returns the max index among non-archived origins', async () => {
    const db = createDatabaseMock();
    (db.execute as jest.Mock).mockResolvedValueOnce([
      originRow('o-0', 0),
      originRow('o-1', 1),
    ]);
    const storage = new AddressOriginStorage(db);

    const result = await storage.getMaxAccountIndex(WALLET_ID);

    expect(result).toBe(1);
  });

  it('excludes archived origins from the max calculation', async () => {
    // o-0 (active, index 0), o-1 (archived probe, index 1)
    // getMaxAccountIndex must return 0 so the next user account gets index 1, not 2
    const db = createDatabaseMock();
    (db.execute as jest.Mock).mockResolvedValueOnce([
      originRow('o-0', 0, null),
      // archived origin NOT returned — query filters it with archived_at IS NULL
    ]);
    const storage = new AddressOriginStorage(db);

    const result = await storage.getMaxAccountIndex(WALLET_ID);

    expect(result).toBe(0);
    // Verify the SQL query includes the archived_at IS NULL filter
    const [sql] = (db.execute as jest.Mock).mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('archived_at IS NULL');
  });

  it('returns -1 when all origins are archived', async () => {
    // All rows filtered out by archived_at IS NULL → empty result → -1
    const db = createDatabaseMock();
    (db.execute as jest.Mock).mockResolvedValueOnce([]);
    const storage = new AddressOriginStorage(db);

    const result = await storage.getMaxAccountIndex(WALLET_ID);

    expect(result).toBe(-1);
  });

  it('returns 0 when only the default origin (index 0) exists and is active', async () => {
    const db = createDatabaseMock();
    (db.execute as jest.Mock).mockResolvedValueOnce([originRow('default', 0)]);
    const storage = new AddressOriginStorage(db);

    expect(await storage.getMaxAccountIndex(WALLET_ID)).toBe(0);
  });
});

describe('AddressOriginStorage.findByWallet', () => {
  it('maps all rows including archived ones', async () => {
    const db = createDatabaseMock();
    (db.execute as jest.Mock).mockResolvedValueOnce([
      originRow('o-0', 0, null),
      originRow('o-1', 1, '2026-01-02T00:00:00.000Z'),
    ]);
    const storage = new AddressOriginStorage(db);

    const result = await storage.findByWallet(WALLET_ID);

    expect(result).toHaveLength(2);
    expect(result[0].archivedAt).toBeNull();
    expect(result[1].archivedAt).toBe('2026-01-02T00:00:00.000Z');
  });
});
