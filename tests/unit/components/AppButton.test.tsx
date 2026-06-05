import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppButton } from '../../../src/presentation/components/base/AppButton';
import { renderWithTheme } from '../../mocks/renderWithProviders';

describe('AppButton', () => {
  it('renders the title and handles press', () => {
    const onPress = jest.fn();
    const screen = renderWithTheme(<AppButton title="Create wallet" onPress={onPress} />);

    fireEvent.press(screen.getByText('Create wallet'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
