// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('has no automated accessibility violations in its empty state', async () => {
    const { container } = render(<TaskList />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
