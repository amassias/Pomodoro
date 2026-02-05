/**
 * Request notification permission if not already granted.
 * Returns true if permission is granted, false otherwise.
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
};

/**
 * Show a browser notification.
 * Silently no-ops if permission is not granted or API is unavailable.
 */
export const showNotification = (title, options = {}) => {
  if (!('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notification = new Notification(title, {
      icon: '/logos/pomodoro-192.png',
      badge: '/logos/pomodoro-192.png',
      silent: true, // We already play our own alarm sound
      ...options,
    });

    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);

    // Focus the tab when clicked
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch {
    return null;
  }
};
