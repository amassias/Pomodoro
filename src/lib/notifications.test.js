// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { requestNotificationPermission } from './notifications';
afterEach(() => vi.unstubAllGlobals());
it('keeps the timer usable when permission is denied, unsupported or throws', async () => {
  vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() });
  expect(await requestNotificationPermission()).toBe(false);
  expect(Notification.requestPermission).not.toHaveBeenCalled();
  vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockRejectedValue(new Error('Blocked')) });
  expect(await requestNotificationPermission()).toBe(false);
});
