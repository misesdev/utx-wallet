import React from 'react';
import { SeedWordGrid } from '../../../src/presentation/components/wallet/SeedWordGrid';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const WORDS_12 = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent',
  'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
];

const WORDS_24 = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent',
  'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
  'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire',
  'across', 'action', 'actor', 'actress', 'actual', 'adapt',
];

describe('SeedWordGrid', () => {
  it('renders all 12 words', () => {
    const screen = renderWithTheme(<SeedWordGrid words={WORDS_12} />);
    WORDS_12.forEach(word => {
      expect(screen.getByText(word)).toBeTruthy();
    });
  });

  it('renders all 24 words', () => {
    const screen = renderWithTheme(<SeedWordGrid words={WORDS_24} />);
    WORDS_24.forEach(word => {
      expect(screen.getByText(word)).toBeTruthy();
    });
  });

  it('renders 1-indexed position numbers for 12 words', () => {
    const screen = renderWithTheme(<SeedWordGrid words={WORDS_12} />);
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByText(String(i))).toBeTruthy();
    }
  });

  it('renders 1-indexed position numbers for 24 words', () => {
    const screen = renderWithTheme(<SeedWordGrid words={WORDS_24} />);
    for (let i = 1; i <= 24; i++) {
      expect(screen.getByText(String(i))).toBeTruthy();
    }
  });

  it('renders exactly 4 rows for a 12-word seed', () => {
    const screen = renderWithTheme(<SeedWordGrid words={WORDS_12} testID="grid" />);
    const grid = screen.getByTestId('grid');
    expect(grid.props.children).toHaveLength(4);
  });

  it('renders exactly 8 rows for a 24-word seed', () => {
    const screen = renderWithTheme(<SeedWordGrid words={WORDS_24} testID="grid" />);
    const grid = screen.getByTestId('grid');
    expect(grid.props.children).toHaveLength(8);
  });

  it('renders a long BIP39 word without truncation issues', () => {
    const words = ['umbrella', 'envelope', 'cabbage'];
    const screen = renderWithTheme(<SeedWordGrid words={words} />);
    expect(screen.getByText('umbrella')).toBeTruthy();
    expect(screen.getByText('envelope')).toBeTruthy();
    expect(screen.getByText('cabbage')).toBeTruthy();
  });
});
