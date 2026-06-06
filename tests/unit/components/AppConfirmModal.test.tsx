import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppConfirmModal } from '../../../src/presentation/components/base/AppConfirmModal';
import { renderWithTheme } from '../../mocks/renderWithProviders';

const onConfirm = jest.fn();
const onCancel = jest.fn();

const DEFAULT_PROPS = {
  visible: true,
  title: 'Confirm action',
  message: 'Are you sure?',
  onConfirm,
  onCancel,
};

describe('AppConfirmModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders title and message', () => {
    const screen = renderWithTheme(<AppConfirmModal {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('confirm-modal-title')).toBeTruthy();
    expect(screen.getByTestId('confirm-modal-message')).toBeTruthy();
    expect(screen.getByText('Confirm action')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
  });

  it('calls onConfirm when confirm button is pressed', () => {
    const screen = renderWithTheme(<AppConfirmModal {...DEFAULT_PROPS} />);
    fireEvent.press(screen.getByTestId('confirm-modal-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is pressed', () => {
    const screen = renderWithTheme(<AppConfirmModal {...DEFAULT_PROPS} />);
    fireEvent.press(screen.getByTestId('confirm-modal-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom confirm and cancel labels', () => {
    const screen = renderWithTheme(
      <AppConfirmModal
        {...DEFAULT_PROPS}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />,
    );
    expect(screen.getByText('Delete')).toBeTruthy();
    expect(screen.getByText('Keep')).toBeTruthy();
  });

  it('disables cancel button when isLoading is true', () => {
    const screen = renderWithTheme(<AppConfirmModal {...DEFAULT_PROPS} isLoading />);
    const cancelBtn = screen.getByTestId('confirm-modal-cancel');
    expect(cancelBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('does not render when visible is false', () => {
    const screen = renderWithTheme(
      <AppConfirmModal {...DEFAULT_PROPS} visible={false} />,
    );
    expect(screen.queryByTestId('confirm-modal-title')).toBeNull();
  });

  it('renders danger variant without crashing', () => {
    expect(() =>
      renderWithTheme(<AppConfirmModal {...DEFAULT_PROPS} variant="danger" />),
    ).not.toThrow();
  });
});
