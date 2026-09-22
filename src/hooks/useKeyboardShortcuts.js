import { useEffect } from 'react';

// Global timer shortcuts (start/pause, reset, mute) plus Escape to close Settings.
export const useKeyboardShortcuts = ({ settings, setSettings, showSettings, setShowSettings }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
      } else if (settings.shortcutsEnabled !== false && (e.code === settings.shortcutToggle || e.key.toLowerCase() === String(settings.shortcutToggle || 'Space').toLowerCase())) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('timer-toggle'));
      } else if (settings.shortcutsEnabled !== false && e.key.toLowerCase() === String(settings.shortcutReset || 'r').toLowerCase()) {
        window.dispatchEvent(new CustomEvent('timer-reset'));
      } else if (settings.shortcutsEnabled !== false && e.key.toLowerCase() === String(settings.shortcutMute || 'm').toLowerCase()) {
        // Toggle Mute: Toggle between 0 and defaults (70/50)
        setSettings(prev => {
          const newAlarmVol = prev.alarmVolume === 0 ? 70 : 0;
          const newTickVol = prev.tickingVolume === 0 ? 50 : 0;
          return { ...prev, alarmVolume: newAlarmVol, tickingVolume: newTickVol };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, setShowSettings, setSettings, settings.shortcutsEnabled, settings.shortcutToggle, settings.shortcutReset, settings.shortcutMute]);
};
