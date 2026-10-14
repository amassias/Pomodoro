// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

const Harness = ({ settings = {}, showSettings = false, close = vi.fn() }) => {
  useKeyboardShortcuts({ settings, setSettings: vi.fn(), showSettings, setShowSettings: close });
  return <><button>Action</button><input aria-label="Task" /><select aria-label="Choice"><option>One</option></select><div contentEditable suppressContentEditableWarning>Editable</div></>;
};
afterEach(cleanup);

describe('global shortcuts', () => {
  it('supports default Space but respects focused controls, modifiers, repeat and modal dialogs', () => {
    const toggle = vi.fn();
    window.addEventListener('timer-toggle', toggle);
    try {
      render(<Harness />);
      fireEvent.keyDown(window, { key: ' ', code: 'Space' });
      expect(toggle).toHaveBeenCalledTimes(1);
      for (const target of [screen.getByRole('button'), screen.getByLabelText('Task'), screen.getByLabelText('Choice'), screen.getByText('Editable')]) {
        fireEvent.keyDown(target, { key: ' ', code: 'Space' });
      }
      for (const flag of ['repeat', 'ctrlKey', 'metaKey', 'altKey', 'shiftKey', 'isComposing']) {
        fireEvent.keyDown(window, { key: ' ', code: 'Space', [flag]: true });
      }
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      document.body.append(dialog);
      try { fireEvent.keyDown(window, { key: ' ', code: 'Space' }); }
      finally { dialog.remove(); }
      expect(toggle).toHaveBeenCalledTimes(1);
    } finally { window.removeEventListener('timer-toggle', toggle); }
  });

  it('allows Escape to close settings while a field is focused', () => {
    const close = vi.fn();
    render(<Harness showSettings close={close} />);
    fireEvent.keyDown(screen.getByLabelText('Task'), { key: 'Escape' });
    expect(close).toHaveBeenCalledWith(false);
  });
});
