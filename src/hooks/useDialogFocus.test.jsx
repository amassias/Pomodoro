// @vitest-environment jsdom
import React, { useRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDialogFocus } from './useDialogFocus';
const Dialog = ({ name, close = vi.fn(), hidden = false }) => {
  const ref = useRef(null);
  useDialogFocus({ open: true, onClose: close, dialogRef: ref });
  return <div ref={ref} role="dialog" aria-label={name}><button>{name} first</button><button>{name} last</button>{hidden && <input hidden aria-label="Invisible" />}</div>;
};
afterEach(cleanup);
it('traps Tab at visible controls and only closes the topmost dialog', () => {
  const outer = vi.fn(), inner = vi.fn();
  render(<><Dialog name="Outer" close={outer} /><Dialog name="Inner" close={inner} hidden /></>);
  const last = screen.getByText('Inner last');
  last.focus();
  fireEvent.keyDown(last, { key: 'Tab' });
  expect(document.activeElement).toBe(screen.getByText('Inner first'));
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(inner).toHaveBeenCalledTimes(1);
  expect(outer).not.toHaveBeenCalled();
});
