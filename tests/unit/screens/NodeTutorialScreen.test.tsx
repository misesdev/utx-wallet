import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { NodeTutorialScreen } from '../../../src/presentation/screens/info/NodeTutorialScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('NodeTutorialScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the tutorial title', () => {
    const screen = renderWithTheme(<NodeTutorialScreen />);
    expect(screen.getByText('nodeTutorial.title')).toBeTruthy();
  });

  it('renders the hero title', () => {
    const screen = renderWithTheme(<NodeTutorialScreen />);
    expect(screen.getByText('nodeTutorial.heroTitle')).toBeTruthy();
  });

  it('renders the hero description', () => {
    const screen = renderWithTheme(<NodeTutorialScreen />);
    expect(screen.getByText('nodeTutorial.heroDesc')).toBeTruthy();
  });

  it('renders all 7 section titles', () => {
    const screen = renderWithTheme(<NodeTutorialScreen />);
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(`nodeTutorial.s${i}Title`)).toBeTruthy();
    }
  });

  it('renders all 7 section bodies', () => {
    const screen = renderWithTheme(<NodeTutorialScreen />);
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(`nodeTutorial.s${i}Body`)).toBeTruthy();
    }
  });

  it('navigates back when back button is pressed', () => {
    const screen = renderWithTheme(<NodeTutorialScreen />);
    fireEvent.press(screen.getByTestId('btn-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
