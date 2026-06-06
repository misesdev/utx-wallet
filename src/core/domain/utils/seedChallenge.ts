export type SeedChallenge = {
  /** Sorted, 0-indexed positions from the mnemonic that the user must identify. */
  positions: number[];
  /** 8 shuffled word options (4 correct + 4 decoys from the same mnemonic). */
  options: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds a 4-word challenge from the given mnemonic word list.
 * Correct words + decoys from the same mnemonic are shuffled together.
 */
export function buildSeedChallenge(words: string[]): SeedChallenge {
  const positions = shuffle(words.map((_, i) => i))
    .slice(0, 4)
    .sort((a, b) => a - b);

  const correct = positions.map(i => words[i]);
  const decoys = shuffle(words.filter((_, i) => !positions.includes(i))).slice(0, 4);

  return {
    positions,
    options: shuffle([...correct, ...decoys]),
  };
}

/**
 * Returns true if `selectedWords[i]` matches `words[challenge.positions[i]]` for all i.
 */
export function validateSeedChallenge(
  words: string[],
  challenge: SeedChallenge,
  selectedWords: string[],
): boolean {
  if (selectedWords.length !== challenge.positions.length) return false;
  return challenge.positions.every((pos, i) => selectedWords[i] === words[pos]);
}
