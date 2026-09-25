import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ConfirmDialog } from './confirm-dialog';

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Deactivate Ada?"
      description="This hides her from the list."
      confirmLabel="Deactivate"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('is an accessible alert dialog and starts with focus on the safe choice', () => {
    setup();
    const dialog = screen.getByRole('alertdialog', { name: 'Deactivate Ada?' });
    expect(dialog).toHaveAccessibleDescription('This hides her from the list.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('cancels on Escape and confirms only via the confirm button', () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab focus inside the dialog', () => {
    setup();
    const confirm = screen.getByRole('button', { name: 'Deactivate' });
    confirm.focus();
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('locks the dialog while pending and shows errors inside it', () => {
    const { onCancel } = setup({ pending: true, pendingLabel: 'Deactivating…', error: 'Boom' });
    expect(screen.getByRole('button', { name: 'Deactivating…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
