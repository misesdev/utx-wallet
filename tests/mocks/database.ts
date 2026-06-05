import type { Database } from '../../src/core/infrastructure/storage/DatabaseStorage';

export function createDatabaseMock(): jest.Mocked<Database> {
  return {
    execute: jest.fn().mockResolvedValue([]),
  };
}
