import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { LanguageScreen } from '../../../src/presentation/screens/settings/LanguageScreen';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const mockGoBack = jest.fn();
const mockChangeLanguage = jest.fn();
let mockCurrentLanguage = 'pt-BR';

jest.mock('../../../src/presentation/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('../../../src/app/providers/LanguageProvider', () => ({
  useLanguage: () => ({ language: mockCurrentLanguage, changeLanguage: mockChangeLanguage }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('LanguageScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentLanguage = 'pt-BR';
    mockChangeLanguage.mockResolvedValue(undefined);
  });

  it('changes language from the settings language selector', async () => {
    const screen = renderWithTheme(<LanguageScreen />);

    fireEvent.press(screen.getByTestId('language-option-en-US'));

    await waitFor(() => expect(mockChangeLanguage).toHaveBeenCalledWith('en-US'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not persist again when selecting the current language', () => {
    const screen = renderWithTheme(<LanguageScreen />);

    fireEvent.press(screen.getByTestId('language-option-pt-BR'));

    expect(mockChangeLanguage).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
