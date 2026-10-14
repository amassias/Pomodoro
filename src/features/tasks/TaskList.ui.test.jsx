// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TaskList from './TaskList';

expect.extend(toHaveNoViolations);

const mockData = vi.hoisted(() => ({
  tasks: [],
  archivedTasks: [],
  settings: { activeTaskId: null },
}));

vi.mock('../../providers/UserDataProvider.jsx', () => ({
  useUserData: () => ({
    loading: false,
    tasks: mockData.tasks,
    archivedTasks: mockData.archivedTasks,
    settings: mockData.settings,
    activeTask: mockData.tasks.find((task) => task.id === mockData.settings.activeTaskId) || mockData.tasks[0] || null,
    setTasks: (update) => { mockData.tasks = typeof update === 'function' ? update(mockData.tasks) : update; },
    setArchivedTasks: (update) => { mockData.archivedTasks = typeof update === 'function' ? update(mockData.archivedTasks) : update; },
    setSettings: (update) => { mockData.settings = typeof update === 'function' ? update(mockData.settings) : update; },
  }),
}));

afterEach(cleanup);

describe('TaskList interactions', () => {

  beforeEach(() => {
    mockData.tasks = [];
    mockData.archivedTasks = [];
    mockData.settings = { activeTaskId: null };
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('task-1');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('adds, focuses, edits and completes a task', async () => {
    const user = userEvent.setup();
    render(<TaskList />);

    await user.type(screen.getByPlaceholderText('Add a task...'), 'Prepare roadmap');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByText('Prepare roadmap')).toBeTruthy();
    expect(mockData.settings.activeTaskId).toBe('task-1');

    await user.click(screen.getByRole('button', { name: 'Edit Prepare roadmap' }));
    const editInput = screen.getByRole('textbox', { name: 'Edit task' });
    await user.clear(editInput);
    await user.type(editInput, 'Ship roadmap');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Ship roadmap')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Complete Ship roadmap' }));
    await waitFor(() => expect(mockData.archivedTasks).toHaveLength(1), { timeout: 1000 });
    expect(mockData.archivedTasks[0]).toMatchObject({ text: 'Ship roadmap', completed: true });
  });

  it('adds a task when pressing Enter', async () => {
    const user = userEvent.setup();
    render(<TaskList />);

    await user.type(screen.getByPlaceholderText('Add a task...'), 'Write notes{Enter}');
    expect(mockData.tasks.map((task) => task.text)).toEqual(['Write notes']);
  });

  it('restores selected tasks from the archive', async () => {
    mockData.archivedTasks = [
      { id: 'a1', text: 'Old report', completed: true, archivedAt: '2026-09-01' },
      { id: 'a2', text: 'Old email', completed: true, archivedAt: '2026-09-01' },
    ];
    const user = userEvent.setup();
    render(<TaskList />);

    await user.click(screen.getByRole('button', { name: 'View archived tasks' }));
    const dialog = screen.getByRole('dialog', { name: 'Archived Tasks' });
    await user.click(within(dialog).getAllByRole('button', { name: 'Select task' })[0]);
    expect(within(dialog).getByText('1 selected')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Restore selected' }));

    expect(mockData.archivedTasks.map((task) => task.id)).toEqual(['a2']);
    expect(mockData.tasks).toEqual([{ id: 'a1', text: 'Old report', completed: false }]);
  });

  it('has no automated accessibility violations in its empty state', async () => {
    const { container } = render(<TaskList />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

it('preserves a task added while another task is completing', async () => {
  mockData.tasks = [{ id: 'first', text: 'First', completed: false, subtasks: [] }];
  mockData.archivedTasks = [];
  mockData.settings = {};
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('second');
  const user = userEvent.setup();
  render(<TaskList />);
  await user.click(screen.getByRole('button', { name: 'Complete First' }));
  await user.type(screen.getByPlaceholderText('Add a task...'), 'Second{Enter}');
  await waitFor(() => expect(mockData.archivedTasks).toHaveLength(1), { timeout: 1000 });
  expect(mockData.tasks.map(task => task.text)).toEqual(['Second']);
});

it('adds and renames subtasks, increases estimates and saves a reusable routine', async () => {
  mockData.tasks = [{ id: 'parent', text: 'Plan', subtasks: [], estimatedPomodoros: 1 }];
  mockData.archivedTasks = []; mockData.settings = {};
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('child');
  vi.spyOn(window, 'prompt').mockReturnValue('Morning');
  const user = userEvent.setup();
  const view = render(<TaskList />);
  await user.click(screen.getByRole('button', { name: 'Add subtask to Plan' }));
  await user.type(screen.getByRole('textbox', { name: 'New subtask for Plan' }), 'Outline{Enter}');
  await user.click(screen.getByRole('button', { name: 'Outline' }));
  const name = screen.getByRole('textbox', { name: 'Rename subtask' });
  await user.clear(name); await user.type(name, 'Draft{Enter}');
  expect(mockData.tasks[0].subtasks[0].text).toBe('Draft');
  await user.click(screen.getByRole('button', { name: 'Increase estimate for Plan' }));
  expect(mockData.tasks[0].estimatedPomodoros).toBe(2);
  view.rerender(<TaskList />);
  await user.click(screen.getByRole('button', { name: 'Save routine' }));
  expect(mockData.settings.routines[0]).toMatchObject({ name: 'Morning', tasks: [{ text: 'Plan', estimatedPomodoros: 2, subtasks: [{ text: 'Draft' }] }] });
});
