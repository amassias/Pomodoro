import { useEffect } from 'react';

// Global timer shortcuts (start/pause, reset, mute) plus Escape to close Settings.
export const useKeyboardShortcuts = ({ settings, setSettings, showSettings, setShowSettings }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented || e.isComposing) return;
      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
        return;
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (showSettings || document.querySelector('[aria-modal="true"]')) return;
      // Preserve native keyboard behavior on interactive and editable controls.
      if (e.target instanceof Element && e.target.closest(
        'input, textarea, select, button, a, [role="button"], [role="slider"], [role="combobox"], [contenteditable]:not([contenteditable="false"])'
      )) return;

      const toggleKey = String(settings.shortcutToggle || 'Space');
      if (settings.shortcutsEnabled !== false && (e.code === toggleKey || e.key.toLowerCase() === toggleKey.toLowerCase())) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('timer-toggle'));
      } else if (settings.shortcutsEnabled !== false && e.key.toLowerCase() === String(settings.shortcutReset || 'r').toLowerCase()) {
        window.dispatchEvent(new CustomEvent('timer-reset'));
      } else if (settings.shortcutsEnabled !== false && e.key.toLowerCase() === String(settings.shortcutMute || 'm').toLowerCase()) {
        // Mute the group together, then restore the user's previous choices.
        setSettings(prev => {
          const volume = (value, fallback) => Math.min(100, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : fallback));
          const alarmVolume = volume(prev.alarmVolume ?? 70, 70);
          const tickingVolume = volume(prev.tickingVolume ?? 50, 50);
          if (alarmVolume > 0 || tickingVolume > 0) return { ...prev, mutedSoundVolumes: { alarmVolume, tickingVolume }, alarmVolume: 0, tickingVolume: 0 };
          const restoredAlarm = volume(prev.mutedSoundVolumes?.alarmVolume ?? 70, 70);
          const restoredTick = volume(prev.mutedSoundVolumes?.tickingVolume ?? 50, 50);
          return { ...prev, alarmVolume: restoredAlarm || restoredTick ? restoredAlarm : 70, tickingVolume: restoredAlarm || restoredTick ? restoredTick : 50 };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, setShowSettings, setSettings, settings.shortcutsEnabled, settings.shortcutToggle, settings.shortcutReset, settings.shortcutMute]);
};
