import {
  buildSeedChallenge,
  validateSeedChallenge,
} from '../../../src/core/domain/utils/seedChallenge';

const WORDS = [
  'abandon', 'ability', 'able', 'about', 'above',
  'absent', 'absorb', 'abstract', 'absurd', 'abuse',
  'access', 'accident',
];

describe('buildSeedChallenge', () => {
  it('picks exactly 4 challenge positions', () => {
    const { positions } = buildSeedChallenge(WORDS);
    expect(positions).toHaveLength(4);
  });

  it('positions are valid indices into the word list', () => {
    const { positions } = buildSeedChallenge(WORDS);
    positions.forEach(p => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(WORDS.length);
    });
  });

  it('positions are unique', () => {
    const { positions } = buildSeedChallenge(WORDS);
    expect(new Set(positions).size).toBe(4);
  });

  it('positions are sorted ascending', () => {
    const { positions } = buildSeedChallenge(WORDS);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('provides exactly 8 options', () => {
    const { options } = buildSeedChallenge(WORDS);
    expect(options).toHaveLength(8);
  });

  it('options include all 4 correct words', () => {
    const { positions, options } = buildSeedChallenge(WORDS);
    const correct = positions.map(i => WORDS[i]);
    correct.forEach(word => expect(options).toContain(word));
  });

  it('all options are words from the original mnemonic', () => {
    const { options } = buildSeedChallenge(WORDS);
    options.forEach(word => expect(WORDS).toContain(word));
  });
});

describe('validateSeedChallenge', () => {
  it('returns true when all words match their expected positions', () => {
    const challenge = buildSeedChallenge(WORDS);
    const correctAnswers = challenge.positions.map(i => WORDS[i]);
    expect(validateSeedChallenge(WORDS, challenge, correctAnswers)).toBe(true);
  });

  it('returns false when one word is wrong', () => {
    const challenge = buildSeedChallenge(WORDS);
    const wrong = challenge.positions.map(i => WORDS[i]);
    wrong[0] = 'wrongword';
    expect(validateSeedChallenge(WORDS, challenge, wrong)).toBe(false);
  });

  it('returns false when words are in the wrong order', () => {
    const challenge = buildSeedChallenge(WORDS);
    const answers = challenge.positions.map(i => WORDS[i]);
    if (answers.length >= 2) {
      [answers[0], answers[1]] = [answers[1], answers[0]];
    }
    // Only fails if the swap produces a mismatch (positions differ)
    const swapDiffers = challenge.positions[0] !== challenge.positions[1];
    expect(validateSeedChallenge(WORDS, challenge, answers)).toBe(!swapDiffers);
  });

  it('returns false when fewer words are provided', () => {
    const challenge = buildSeedChallenge(WORDS);
    const partial = challenge.positions.slice(0, 2).map(i => WORDS[i]);
    expect(validateSeedChallenge(WORDS, challenge, partial)).toBe(false);
  });
});
