import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChangePasswordModal } from './ChangePasswordModal';

describe('ChangePasswordModal', () => {
  it('blocks submit when the new passwords do not match', () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <ChangePasswordModal visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText('Current password'), 'oldpass');
    fireEvent.changeText(getByLabelText('New password'), 'newpass1');
    fireEvent.changeText(getByLabelText('Confirm new password'), 'newpass2');
    fireEvent.press(getByLabelText('Save password'));

    expect(getByText('Passwords do not match')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits current and new passwords when valid', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <ChangePasswordModal visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText('Current password'), 'oldpass');
    fireEvent.changeText(getByLabelText('New password'), 'newpass');
    fireEvent.changeText(getByLabelText('Confirm new password'), 'newpass');
    fireEvent.press(getByLabelText('Save password'));

    expect(onSubmit).toHaveBeenCalledWith({
      currentPassword: 'oldpass',
      newPassword: 'newpass',
    });
  });
});
