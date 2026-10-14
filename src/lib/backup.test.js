import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from './backup';
const data = { tasks: [{ id: 'a', text: 'Write', subtasks: [] }], archivedTasks: [], pomodoroHistory: { '2026-10-14': [{ duration: 25 }] }, settings: { focusDuration: 25, spotifyToken: 'secret', spotifyRefreshToken: 'refresh', spotifyTokenExpiresAt: 123 }, city: 'tokyo', favoriteCities: ['tokyo'], customLocations: { custom: { name: 'Coast', id: 'abcdefghijk' } } };
describe('backup interface', () => {
  it('round-trips work and atmospheres without exporting credentials', () => {
    const serialized = JSON.stringify(createBackup(data));
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('spotifyToken');
    expect(parseBackup(serialized)).toMatchObject({ tasks: data.tasks, settings: { focusDuration: 25 }, city: 'tokyo', favoriteCities: ['tokyo'], customLocations: data.customLocations });
  });
  it('strips credentials from old v1 backups and rejects broken data before any replacement', () => {
    expect(parseBackup(JSON.stringify({ version: 1, ...data })).settings.spotifyToken).toBeUndefined();
    for (const patch of [{ settings: null }, { settings: [] }, { tasks: [null] }, { pomodoroHistory: [] }, { pomodoroHistory: { bad: 'broken' } }, { settings: { focusDuration: -5 } }, { settings: { routines: [null] } }]) {
      expect(() => parseBackup(JSON.stringify({ version: 1, ...data, ...patch }))).toThrow();
    }
  });
});
