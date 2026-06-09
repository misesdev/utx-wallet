import React from 'react';
import { renderWithTheme } from '../../mocks/renderWithProviders';
import { AccountPolicyScreen } from '../../../src/presentation/screens/info/AccountPolicyScreen';

const mockGoBack = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
}));

describe('AccountPolicyScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('renders the screen title', () => {
    const { getByText } = renderWithTheme(<AccountPolicyScreen />);
    expect(getByText('accountPolicy.title')).toBeTruthy();
  });

  it('renders the hero title', () => {
    const { getByText } = renderWithTheme(<AccountPolicyScreen />);
    expect(getByText('accountPolicy.heroTitle')).toBeTruthy();
  });

  it('renders the hero description', () => {
    const { getByText } = renderWithTheme(<AccountPolicyScreen />);
    expect(getByText('accountPolicy.heroDesc')).toBeTruthy();
  });

  it('renders all 7 section titles', () => {
    const { getByText } = renderWithTheme(<AccountPolicyScreen />);
    for (let i = 1; i <= 7; i++) {
      expect(getByText(`accountPolicy.s${i}Title`)).toBeTruthy();
    }
  });

  it('renders all 7 section bodies', () => {
    const { getByText } = renderWithTheme(<AccountPolicyScreen />);
    for (let i = 1; i <= 7; i++) {
      expect(getByText(`accountPolicy.s${i}Body`)).toBeTruthy();
    }
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderWithTheme(<AccountPolicyScreen />);
    getByTestId('btn-back').props.onClick?.();
    // fire press
    const btn = getByTestId('btn-back');
    btn.props.onPress?.();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
