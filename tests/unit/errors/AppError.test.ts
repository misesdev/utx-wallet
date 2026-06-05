import { AppError } from '../../../src/core/application/errors/AppError';

describe('AppError', () => {
  it('stores message and code', () => {
    const error = new AppError('something failed', 'TEST_CODE');
    expect(error.message).toBe('something failed');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('AppError');
  });

  it('instanceof AppError returns true (Hermes-compatible prototype chain)', () => {
    const error = new AppError('msg', 'CODE');
    expect(error instanceof AppError).toBe(true);
  });

  it('instanceof Error returns true', () => {
    const error = new AppError('msg', 'CODE');
    expect(error instanceof Error).toBe(true);
  });

  it('is catchable as AppError in catch blocks', () => {
    const fn = () => {
      throw new AppError('wallet not found', 'NOT_FOUND');
    };
    expect(fn).toThrow(AppError);
    expect(fn).toThrow('wallet not found');
  });

  it('allows discriminating by code in catch blocks', () => {
    let caught: AppError | null = null;
    try {
      throw new AppError('duplicate', 'WALLET_EXISTS');
    } catch (e) {
      if (e instanceof AppError) caught = e;
    }
    expect(caught?.code).toBe('WALLET_EXISTS');
  });
});
