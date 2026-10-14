// @vitest-environment jsdom
import React, { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Report from './Report';
const state = vi.hoisted(() => ({ value: null }));
vi.mock('../../providers/UserDataProvider.jsx', async () => {
  const React = await import('react');
  const TestContext = React.createContext(null);
  return { TestContext, useUserData: () => React.useContext(TestContext) };
});
import { TestContext } from '../../providers/UserDataProvider.jsx';
vi.mock('../auth/AuthMenu', () => ({ default: () => null }));
const Harness = () => {
  const [pomodoroHistory, setPomodoroHistory] = useState({});
  const [tasks, setTasks] = useState([{ id: 'task', text: 'Audit', completedPomodoros: 0 }]);
  const [settings, setSettings] = useState({ focusDuration: 25, spotifyToken: 'local-secret' });
  const value = { pomodoroHistory, setPomodoroHistory, tasks, setTasks, activeTask: tasks[0], archivedTasks: [], setArchivedTasks: vi.fn(), settings, setSettings };
  useEffect(() => { state.value = value; });
  return <TestContext.Provider value={value}><p>Task sessions: {tasks[0].completedPomodoros}</p><Report /></TestContext.Provider>;
};
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('counts completion once under StrictMode and saves reflection against the original day after midnight', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 14, 23, 59));
  render(<React.StrictMode><Harness /></React.StrictMode>);
  const complete = () => window.dispatchEvent(new CustomEvent('pomodoroCompleted', { detail: { duration: 25, sessionId: 'same-session' } }));
  act(() => { complete(); complete(); });
  expect(screen.getByText('Task sessions: 1')).toBeTruthy();
  const reflection = screen.getByRole('dialog', { name: 'Close your focus session' });
  fireEvent.change(within(reflection).getByLabelText('Result'), { target: { value: 'blocked' } });
  fireEvent.change(within(reflection).getByLabelText('Notes'), { target: { value: 'Review tomorrow' } });
  vi.setSystemTime(new Date(2026, 9, 15, 0, 1));
  fireEvent.click(within(reflection).getByText('Save reflection'));
  expect(state.value.pomodoroHistory['2026-10-14']).toHaveLength(1);
  expect(state.value.pomodoroHistory['2026-10-14'][0]).toMatchObject({ result: 'blocked', notes: 'Review tomorrow', taskId: 'task' });
  expect(state.value.pomodoroHistory['2026-10-15']).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'View statistics' }));
  const report = screen.getByRole('dialog', { name: 'Insights' });
  expect(within(report).getByText('0%')).toBeTruthy();
});
