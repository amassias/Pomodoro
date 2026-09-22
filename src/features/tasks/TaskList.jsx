import React, { useCallback, useRef, useState } from 'react';
import { useUserData } from '../../providers/UserDataProvider.jsx';
import { archiveTaskById } from '../../lib/tasks.js';
import ArchiveDialog from './ArchiveDialog.jsx';
import './TaskList.css';

const TaskList = () => {
    const { loading, tasks, setTasks, archivedTasks, setArchivedTasks, activeTask, settings, setSettings } = useUserData();
    const [newTask, setNewTask] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [showArchive, setShowArchive] = useState(false);
    const [animatingTaskId, setAnimatingTaskId] = useState(null);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [addingSubtaskId, setAddingSubtaskId] = useState(null);
    const [subtaskDraft, setSubtaskDraft] = useState('');
    const [confirmRemoveId, setConfirmRemoveId] = useState(null);
    const dragTaskIdRef = useRef(null);

    const closeArchive = useCallback(() => setShowArchive(false), []);

    const toggleArchive = () => setShowArchive(prev => !prev);

    const addTask = (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        const id = crypto.randomUUID();
        setTasks(prev => [...(Array.isArray(prev) ? prev : []), { id, text: newTask.trim(), completed: false, estimatedPomodoros: 1, completedPomodoros: 0, dueDate: newTaskDueDate || null, subtasks: [], createdAt: new Date().toISOString() }]);
        if (!activeTask) setSettings(prev => ({ ...prev, activeTaskId: id }));
        setNewTask('');
        setNewTaskDueDate('');
    };

    const toggleTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task && !task.completed) {
            setAnimatingTaskId(id);
            setTimeout(() => {
                archiveTask(id);
                setAnimatingTaskId(null);
            }, 400);
            return;
        }

        setTasks(prev => prev.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        ));
    };

    const archiveTask = (id) => {
        const result = archiveTaskById(tasks, archivedTasks, id);
        setTasks(result.tasks);
        setArchivedTasks(result.archivedTasks);
    };


    const startEditing = (task) => {
        setEditingTaskId(task.id);
        setEditingText(task.text);
    };

    const saveEditing = (event) => {
        event.preventDefault();
        const trimmed = editingText.trim();
        if (trimmed) {
            setTasks(prev => prev.map(task => task.id === editingTaskId ? { ...task, text: trimmed } : task));
        }
        setEditingTaskId(null);
        setEditingText('');
    };

    const removeActiveTask = (id) => {
        setTasks(prev => prev.filter(task => task.id !== id));
        setConfirmRemoveId(null);
    };

    const addSubtask = (taskId, text) => {
        const value = (text === undefined ? window.prompt('Subtask') : text)?.trim();
        if (!value) return;
        setTasks(prev => prev.map(task => task.id === taskId ? {
            ...task,
            subtasks: [...(task.subtasks || []), { id: crypto.randomUUID(), text: value, completed: false }],
        } : task));
    };

    const submitSubtask = (taskId) => {
        addSubtask(taskId, subtaskDraft);
        setSubtaskDraft('');
        setAddingSubtaskId(null);
    };

    const cancelSubtask = () => {
        setSubtaskDraft('');
        setAddingSubtaskId(null);
    };

    const toggleSubtask = (taskId, subtaskId) => {
        setTasks(prev => prev.map(task => task.id === taskId ? {
            ...task,
            subtasks: (task.subtasks || []).map(subtask => subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask),
        } : task));
    };

    const reorderTask = (targetId) => {
        const sourceId = dragTaskIdRef.current;
        if (!sourceId || sourceId === targetId) return;
        setTasks(prev => {
            const sourceIndex = prev.findIndex(task => task.id === sourceId);
            const targetIndex = prev.findIndex(task => task.id === targetId);
            if (sourceIndex < 0 || targetIndex < 0) return prev;
            const next = [...prev];
            const [moved] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });
        dragTaskIdRef.current = null;
    };

    const saveRoutine = () => {
        const name = window.prompt('Routine name');
        if (!name?.trim() || tasks.length === 0) return;
        const routine = { id: crypto.randomUUID(), name: name.trim().slice(0, 24), tasks: tasks.map(task => ({ text: task.text, estimatedPomodoros: task.estimatedPomodoros || 1, dueDate: task.dueDate || null, subtasks: task.subtasks || [] })) };
        setSettings(prev => ({ ...prev, routines: [...(Array.isArray(prev.routines) ? prev.routines : []), routine].slice(-8) }));
    };

    const applyRoutine = (routine) => {
        if (!window.confirm(`Replace current tasks with “${routine.name}”?`)) return;
        setTasks((routine.tasks || []).map(task => ({ ...task, id: crypto.randomUUID(), completed: false, completedPomodoros: 0, subtasks: (task.subtasks || []).map(subtask => ({ ...subtask, id: crypto.randomUUID(), completed: false }),), createdAt: new Date().toISOString() })));
        setSettings(prev => ({ ...prev, activeTaskId: null }));
    };


    return (
        <div id="focus-tasks" className="task-list-container glass-panel">
            <div className="task-header">
                <div>
                    <span className="section-eyebrow">Session plan</span>
                    <h3>Tasks</h3>
                </div>
                {archivedTasks.length > 0 && (
                    <button
                        className="archive-btn"
                        onClick={toggleArchive}
                        title="View archived tasks"
                        aria-label="View archived tasks"
                        aria-pressed={showArchive}
                    >
                        Archive <span>{archivedTasks.length}</span>
                    </button>
                )}
            </div>
            <form onSubmit={addTask} className="task-form">
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a task..."
                    className="task-input"
                />
                <input type="date" value={newTaskDueDate} onChange={(event) => setNewTaskDueDate(event.target.value)} className="task-date" aria-label="Task due date" />
                <button type="submit" className="add-btn" aria-label="Add task">
                    <span aria-hidden="true">+</span>
                </button>
            </form>
            <div className="routine-bar">
                <button onClick={saveRoutine} disabled={tasks.length === 0}>Save routine</button>
                {(Array.isArray(settings.routines) ? settings.routines : []).map(routine => <button key={routine.id} onClick={() => applyRoutine(routine)}>{routine.name}</button>)}
            </div>
            <ul className="task-list">
                {(!Array.isArray(tasks) || tasks.length === 0) && (
                    <li className="task-empty">
                        <strong>Clear mind, clear list.</strong>
                        <span>Add one priority for this session.</span>
                    </li>
                )}
                {(Array.isArray(tasks) ? tasks : []).map(task => (
                    <li
                        key={task.id}
                        draggable
                        onDragStart={() => { dragTaskIdRef.current = task.id; }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => reorderTask(task.id)}
                        className={`task-item ${task.completed ? 'completed' : ''} ${activeTask?.id === task.id ? 'active-task' : ''} ${animatingTaskId === task.id ? 'animating' : ''} ${editingTaskId === task.id ? 'is-editing' : ''}`}
                    >
                        <button className="checkbox-wrapper" onClick={() => toggleTask(task.id)} aria-label={`Complete ${task.text}`}>
                            {task.completed && <span className="checkmark">✓</span>}
                        </button>
                        {editingTaskId === task.id ? (
                            <form className="task-edit-form" onSubmit={saveEditing}>
                                <input autoFocus value={editingText} onChange={(event) => setEditingText(event.target.value)} aria-label="Edit task" />
                                <button type="submit">Save</button>
                            </form>
                        ) : (
                            <div className="task-content"><span className="task-text">{task.text}</span>{task.dueDate && <small>Due {task.dueDate}</small>}</div>
                        )}
                        <div className="pomodoro-estimate" title="Focus sessions done / estimated" aria-label={`${task.completedPomodoros || 0} of ${task.estimatedPomodoros || 1} focus sessions`}>{task.completedPomodoros || 0}/{task.estimatedPomodoros || 1}</div>

                        <div className="task-item-actions">
                            <button onClick={() => setSettings({ ...settings, activeTaskId: task.id })} aria-label={`Focus ${task.text}`} aria-pressed={activeTask?.id === task.id}>{activeTask?.id === task.id ? 'Active' : 'Focus'}</button>
                            <button onClick={() => setTasks(prev => prev.map(item => item.id === task.id ? { ...item, estimatedPomodoros: Math.min(12, (item.estimatedPomodoros || 1) + 1) } : item))} aria-label={`Increase estimate for ${task.text}`} title="Add one session to the estimate">+1 session</button>
                            <div className="subtask-trigger">
                              <button onClick={() => { setAddingSubtaskId(task.id); setSubtaskDraft(''); }} aria-label={`Add subtask to ${task.text}`}>Subtask</button>
                              {addingSubtaskId === task.id && (
                                <form className="subtask-popover-form" onSubmit={(e) => { e.preventDefault(); submitSubtask(task.id); }}>
                                  <input autoFocus value={subtaskDraft} onChange={(e) => setSubtaskDraft(e.target.value)} placeholder="What's the subtask?" aria-label={`New subtask for ${task.text}`} />
                                  <div className="subtask-card-actions">
                                    <button type="button" onClick={cancelSubtask}>Cancel</button>
                                    <button type="submit">Add subtask</button>
                                  </div>
                                </form>
                              )}
                            </div>
                            <button onClick={() => startEditing(task)} aria-label={`Edit ${task.text}`}>Edit</button>
                            <div className="remove-trigger">
                              {confirmRemoveId === task.id ? (
                                <div className="remove-confirm">
                                  <span>Remove?</span>
                                  <button type="button" onClick={() => setConfirmRemoveId(null)}>No</button>
                                  <button type="button" className="danger" onClick={() => removeActiveTask(task.id)}>Yes</button>
                                </div>
                              ) : (
                                <button className="danger" onClick={() => setConfirmRemoveId(task.id)} aria-label={`Remove ${task.text}`}>Remove</button>
                              )}
                            </div>
                        </div>

                        {(task.subtasks || []).length > 0 && <ul className="subtask-list">{task.subtasks.map(subtask => <li key={subtask.id}><label><input type="checkbox" checked={subtask.completed} onChange={() => toggleSubtask(task.id, subtask.id)} /> <span className={subtask.completed ? 'done' : ''}>{subtask.text}</span></label></li>)}</ul>}
                    </li>
                ))}
            </ul>

            {showArchive && <ArchiveDialog onClose={closeArchive} />}
            {loading && (
                <div className="task-sync-status" aria-live="polite">Syncing…</div>
            )}
        </div>
    );
};

export default TaskList;
