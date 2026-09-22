import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUserData } from '../../providers/UserDataProvider.jsx';
import { archiveTaskById, restoreTaskById } from '../../lib/tasks.js';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';
import './TaskList.css';

const TaskList = () => {
    const { loading, tasks, setTasks, archivedTasks, setArchivedTasks, activeTask, settings, setSettings } = useUserData();
    const [newTask, setNewTask] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [showArchive, setShowArchive] = useState(false);
    const [animatingTaskId, setAnimatingTaskId] = useState(null);
    const [selectedArchivedIds, setSelectedArchivedIds] = useState(() => new Set());
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [addingSubtaskId, setAddingSubtaskId] = useState(null);
    const [subtaskDraft, setSubtaskDraft] = useState('');
    const [confirmRemoveId, setConfirmRemoveId] = useState(null);
    const archiveDialogRef = useRef(null);
    const dragTaskIdRef = useRef(null);

    const closeArchive = useCallback(() => {
        setShowArchive(false);
        if (selectedArchivedIds.size > 0) {
            setSelectedArchivedIds(new Set());
        }
    }, [selectedArchivedIds.size]);

    useDialogFocus({ open: showArchive, onClose: closeArchive, dialogRef: archiveDialogRef });

    const toggleArchive = () => {
        setShowArchive(prev => {
            const next = !prev;
            if (prev && selectedArchivedIds.size > 0) {
                setSelectedArchivedIds(new Set());
            }
            return next;
        });
    };

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

    const restoreTask = (id) => {
        const result = restoreTaskById(tasks, archivedTasks, id);
        setArchivedTasks(result.archivedTasks);
        setTasks(result.tasks);
        closeArchive();
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

    const deleteTask = (id) => {
        if (!window.confirm('Delete this archived task permanently?')) return;
        setArchivedTasks(prev => prev.filter(t => t.id !== id));
        if (selectedArchivedIds.has(id)) {
            setSelectedArchivedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const toggleArchivedSelection = (id) => {
        setSelectedArchivedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllArchived = () => {
        setSelectedArchivedIds(prev => {
            // We need current archivedTasks length, but for selecting all we can use the closure
            // since this is a UI action that happens synchronously with the current view
            if (archivedTasks.length > 0 && prev.size === archivedTasks.length) {
                return new Set();
            }
            return new Set(archivedTasks.map(t => t.id));
        });
    };

    const restoreSelectedArchived = () => {
        const ids = Array.from(selectedArchivedIds);
        if (ids.length === 0) return;

        const toRestore = archivedTasks
            .filter(t => ids.includes(t.id))
            .map((task) => {
                const restoredTask = { ...task };
                delete restoredTask.archivedAt;
                return { ...restoredTask, completed: false };
            });

        setArchivedTasks(prev => prev.filter(t => !ids.includes(t.id)));
        setTasks(prev => [...prev, ...toRestore]);
        setSelectedArchivedIds(new Set());
    };

    const deleteSelectedArchived = () => {
        const ids = Array.from(selectedArchivedIds);
        if (ids.length === 0) return;
        if (!window.confirm(`Delete ${ids.length} archived ${ids.length === 1 ? 'task' : 'tasks'} permanently?`)) return;

        setArchivedTasks(prev => prev.filter(t => !ids.includes(t.id)));
        setSelectedArchivedIds(new Set());
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

            {showArchive && createPortal(
                <div className="archive-modal-overlay" onClick={closeArchive}>
                    <div ref={archiveDialogRef} className="archive-modal glass-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="archive-title">
                        <div className="archive-header">
                            <h2 id="archive-title">Archived Tasks</h2>
                            <button className="close-btn" onClick={closeArchive} aria-label="Close">✕</button>
                        </div>
                        {archivedTasks.length > 0 && (
                            <div className="archive-toolbar">
                                <label className="select-all">
                                    <input
                                        type="checkbox"
                                        checked={archivedTasks.length > 0 && selectedArchivedIds.size === archivedTasks.length}
                                        onChange={selectAllArchived}
                                    />
                                    <span>Select all</span>
                                </label>
                                <div className="bulk-actions">
                                    <span className="selected-count">{selectedArchivedIds.size > 0 ? `${selectedArchivedIds.size} selected` : ''}</span>
                                    <button
                                        className="bulk-btn"
                                        disabled={selectedArchivedIds.size === 0}
                                        onClick={restoreSelectedArchived}
                                        title="Restore selected"
                                    >
                                        Restore selected
                                    </button>
                                    <button
                                        className="bulk-btn danger"
                                        disabled={selectedArchivedIds.size === 0}
                                        onClick={deleteSelectedArchived}
                                        title="Delete selected"
                                    >
                                        Delete selected
                                    </button>
                                </div>
                            </div>
                        )}
                        {(Array.isArray(archivedTasks) ? archivedTasks : []).length === 0 ? (
                            <p className="empty-message">No archived tasks</p>
                        ) : (
                            <ul className="archived-list">
                                {(Array.isArray(archivedTasks) ? archivedTasks : []).map(task => (
                                    <li
                                        key={task.id}
                                        className={`archived-item ${selectedArchivedIds.has(task.id) ? 'selected' : ''}`}
                                    >
                                        <div className="archived-left">
                                            <button
                                                type="button"
                                                className={`select-box ${selectedArchivedIds.has(task.id) ? 'checked' : ''}`}
                                                onClick={() => toggleArchivedSelection(task.id)}
                                                title={selectedArchivedIds.has(task.id) ? 'Unselect' : 'Select'}
                                                aria-label={selectedArchivedIds.has(task.id) ? 'Unselect task' : 'Select task'}
                                                aria-pressed={selectedArchivedIds.has(task.id)}
                                            >
                                                {selectedArchivedIds.has(task.id) ? '✓' : ''}
                                            </button>
                                            <span className="task-text">{task.text}</span>
                                        </div>
                                        <div className="archived-actions">
                                            <button
                                                className="icon-btn restore-btn"
                                                onClick={() => restoreTask(task.id)}
                                                title="Restore task"
                                                aria-label="Restore task"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="1 4 1 10 7 10"></polyline>
                                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                                </svg>
                                            </button>
                                            <button
                                                className="icon-btn delete-btn"
                                                onClick={() => deleteTask(task.id)}
                                                title="Delete permanently"
                                                aria-label="Delete permanently"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>,
                document.body
            )}
            {loading && (
                <div className="task-sync-status" aria-live="polite">Syncing…</div>
            )}
        </div>
    );
};

export default TaskList;
