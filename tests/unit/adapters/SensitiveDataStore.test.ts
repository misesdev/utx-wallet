import {
  clearAllSensitiveData,
  popSensitiveData,
  stashSensitiveData,
} from '../../../src/core/infrastructure/adapters/SensitiveDataStore';

describe('SensitiveDataStore', () => {
  afterEach(() => {
    clearAllSensitiveData();
  });

  describe('stashSensitiveData', () => {
    it('returns an opaque string key', () => {
      const key = stashSensitiveData('my-secret');
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('returns a different key for each call', () => {
      const k1 = stashSensitiveData('a');
      const k2 = stashSensitiveData('b');
      expect(k1).not.toBe(k2);
    });

    it('key does not contain the original value', () => {
      const secret = 'abandon abandon abandon';
      const key = stashSensitiveData(secret);
      expect(key).not.toContain(secret);
    });
  });

  describe('popSensitiveData', () => {
    it('returns the stashed value', () => {
      const secret = 'super-secret-seed';
      const key = stashSensitiveData(secret);
      expect(popSensitiveData(key)).toBe(secret);
    });

    it('returns undefined on second pop (value deleted after first read)', () => {
      const key = stashSensitiveData('one-time');
      popSensitiveData(key);
      expect(popSensitiveData(key)).toBeUndefined();
    });

    it('returns undefined for an unknown key', () => {
      expect(popSensitiveData('nonexistent-key')).toBeUndefined();
    });

    it('different stash keys are independent', () => {
      const k1 = stashSensitiveData('val1');
      const k2 = stashSensitiveData('val2');
      expect(popSensitiveData(k1)).toBe('val1');
      expect(popSensitiveData(k2)).toBe('val2');
    });
  });

  describe('clearAllSensitiveData', () => {
    it('wipes all stashed values', () => {
      const k1 = stashSensitiveData('a');
      const k2 = stashSensitiveData('b');
      clearAllSensitiveData();
      expect(popSensitiveData(k1)).toBeUndefined();
      expect(popSensitiveData(k2)).toBeUndefined();
    });
  });
});
