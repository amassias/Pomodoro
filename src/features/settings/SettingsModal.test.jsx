// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsModal from './SettingsModal';

const baseSettings = { focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15 };

describe('SettingsModal', () => {
  afterEach(cleanup);

  it('refreshes duration fields when saved durations change', () => {
    const props = { updateSettings: vi.fn(), onClose: vi.fn(), onRestartTour: vi.fn() };
    const { rerender } = render(<SettingsModal settings={baseSettings} {...props} />);
    expect(screen.getByLabelText('Focus').value).toBe('25');

    rerender(<SettingsModal settings={{ ...baseSettings, focusDuration: 50 }} {...props} />);
    expect(screen.getByLabelText('Focus').value).toBe('50');
  });

  it('commits an edited duration on blur and closes with Escape', async () => {
    const user = userEvent.setup();
    const updateSettings = vi.fn();
    const onClose = vi.fn();
    render(<SettingsModal settings={baseSettings} updateSettings={updateSettings} onClose={onClose} onRestartTour={vi.fn()} />);

    const focus = screen.getByLabelText('Focus');
    await user.clear(focus);
    await user.type(focus, '40');
    await user.tab();
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ focusDuration: 40 }));

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a muted volume as 0 instead of the default', () => {
    render(<SettingsModal settings={{ ...baseSettings, alarmVolume: 0, tickingVolume: 0 }} updateSettings={vi.fn()} onClose={vi.fn()} onRestartTour={vi.fn()} />);
    expect(document.querySelector('input[name="alarmVolume"]').value).toBe('0');
    expect(document.querySelector('input[name="tickingVolume"]').value).toBe('0');
  });
});
