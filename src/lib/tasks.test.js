import { describe, expect, it } from 'vitest';
import { archiveTaskById, restoreTaskById } from './tasks';

describe('task transitions', () => {
  it('archives a task without mutating the source collections', () => {
    const tasks = [{ id: '1', text: 'Deep work', completed: false }];
    const archivedTasks = [];
    const result = archiveTaskById(tasks, archivedTasks, '1', '2026-07-11T10:00:00.000Z');

    expect(tasks).toHaveLength(1);
    expect(result.tasks).toEqual([]);
    expect(result.archivedTasks[0]).toMatchObject({ id: '1', completed: true });
  });

  it('restores a task and removes archive metadata', () => {
    const archivedTasks = [{ id: '1', text: 'Deep work', completed: true, archivedAt: '2026-07-11T10:00:00.000Z' }];
    const result = restoreTaskById([], archivedTasks, '1');

    expect(result.archivedTasks).toEqual([]);
    expect(result.tasks).toEqual([{ id: '1', text: 'Deep work', completed: false }]);
  });

  it('leaves collections unchanged when the task does not exist', () => {
    const tasks = [{ id: '1', text: 'Deep work', completed: false }];
    const archivedTasks = [];
    expect(archiveTaskById(tasks, archivedTasks, 'missing')).toEqual({ tasks, archivedTasks });
  });
});
