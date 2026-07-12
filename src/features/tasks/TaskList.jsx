import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUserData } from '../../providers/UserDataProvider.jsx';
import { archiveTaskById, restoreTaskById } from '../../lib/tasks.js';
import { useDialogFocus } from '../../shared/ui/useDialogFocus.js';

const TaskList = () => {
    const { loading, tasks, setTasks, archivedTasks, setArchivedTasks, activeTask, settings, setSettings } = useUserData();
    const [newTask, setNewTask] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [showArchive, setShowArchive] = useState(false);
    const [animatingTaskId, setAnimatingTaskId] = useState(null);
    const [selectedArchivedIds, setSelectedArchivedIds] = useState(() => new Set());
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingText, setEditingText] = useState('');
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
        if (window.confirm('Remove this task?')) {
            setTasks(prev => prev.filter(task => task.id !== id));
        }
    };

    const addSubtask = (taskId) => {
        const text = window.prompt('Subtask');
        if (!text?.trim()) return;
        setTasks(prev => prev.map(task => task.id === taskId ? {
            ...task,
            subtasks: [...(task.subtasks || []), { id: crypto.randomUUID(), text: text.trim(), completed: false }],
        } : task));
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
                <button type="submit" className="add-btn" aria-label="Add task">+</button>
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
                        className={`task-item ${task.completed ? 'completed' : ''} ${activeTask?.id === task.id ? 'active-task' : ''} ${animatingTaskId === task.id ? 'animating' : ''}`}
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
                        <div className="pomodoro-estimate" aria-label={`${task.completedPomodoros || 0} of ${task.estimatedPomodoros || 1} Pomodoros`}>{task.completedPomodoros || 0}/{task.estimatedPomodoros || 1}</div>
                        <div className="task-item-actions">
                            <button onClick={() => setSettings({ ...settings, activeTaskId: task.id })} aria-label={`Focus ${task.text}`} aria-pressed={activeTask?.id === task.id}>{activeTask?.id === task.id ? 'Active' : 'Focus'}</button>
                            <button onClick={() => setTasks(prev => prev.map(item => item.id === task.id ? { ...item, estimatedPomodoros: Math.min(12, (item.estimatedPomodoros || 1) + 1) } : item))} aria-label={`Increase estimate for ${task.text}`}>+🍅</button>
                            <button onClick={() => addSubtask(task.id)} aria-label={`Add subtask to ${task.text}`}>Subtask</button>
                            <button onClick={() => startEditing(task)} aria-label={`Edit ${task.text}`}>Edit</button>
                            <button className="danger" onClick={() => removeActiveTask(task.id)} aria-label={`Remove ${task.text}`}>Remove</button>
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
            <style>{`
                .task-list-container {
                    padding: 1.4rem;
                    width: 100%;
                    max-width: none;
                    min-height: 100%;
                    max-height: 440px;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .task-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .section-eyebrow { display: block; color: var(--accent-color); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 0.2rem; }

                h3 {
                    font-weight: 650;
                    letter-spacing: -0.01em;
                    margin: 0;
                }

                .archive-btn {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: rgba(255,255,255,0.7);
                    padding: 0.3rem 0.6rem;
                    border-radius: 999px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .archive-btn span { display: inline-grid; place-items: center; min-width: 1.25rem; height: 1.25rem; margin-left: 0.25rem; border-radius: 50%; background: rgba(255,255,255,0.1); }

                .task-empty { display: flex; flex-direction: column; gap: 0.25rem; padding: 1.4rem 0.75rem; text-align: center; color: var(--text-secondary); }
                .task-empty strong { color: var(--text-primary); font-size: 0.88rem; }
                .task-empty span { font-size: 0.78rem; }

                .task-item-actions { display: flex; gap: 0.35rem; margin-left: auto; opacity: 0; transition: opacity 0.2s ease; }
                .task-item:hover .task-item-actions, .task-item:focus-within .task-item-actions { opacity: 1; }
                .task-item-actions button { color: var(--text-secondary); background: transparent; font-size: 0.68rem; padding: 0.3rem; }
                .task-item-actions button:hover { color: #fff; }
                .task-item-actions .danger:hover { color: var(--accent-color); }
                .task-item.active-task { border-color: rgba(255,113,107,0.42); background: rgba(255,113,107,0.08); }
                .pomodoro-estimate { color: var(--text-muted); font-size: 0.68rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
                .task-edit-form { flex: 1; display: flex; gap: 0.4rem; }
                .task-edit-form input { min-width: 0; flex: 1; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid var(--glass-border); border-radius: 8px; padding: 0.4rem; }
                .task-edit-form button { color: #fff; background: var(--accent-soft); border-radius: 8px; padding: 0.35rem 0.55rem; }

                .archive-btn:hover {
                    background: rgba(255,255,255,0.15);
                    color: #fff;
                }

                .task-form {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(8.5rem, 0.55fr) auto;
                    gap: 0.5rem;
                }
                .task-date { width: 9rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; padding: 0.45rem; }
                .routine-bar { display: flex; flex-wrap: wrap; gap: 0.35rem; }
                .routine-bar button { padding: 0.35rem 0.55rem; color: var(--text-secondary); background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 999px; font-size: 0.68rem; }

                .task-input {
                    flex: 1;
                    min-width: 0;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    color: #fff;
                    font-family: inherit;
                    font-size: 16px; /* Prevents auto-zoom on iOS */
                }

                .task-input::placeholder {
                    color: rgba(255,255,255,0.4);
                }

                .task-input:focus {
                    outline: none;
                    border-color: rgba(255,255,255,0.5);
                    background: rgba(255,255,255,0.15);
                }

                .add-btn {
                    background: #fff;
                    color: #000;
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    font-size: 1.2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s;
                }

                .add-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 12px rgba(255,255,255,0.3);
                }

                .task-list {
                    list-style: none;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    padding: 0;
                    margin: 0;
                }

                .task-item {
                    display: grid;
                    grid-template-columns: 28px minmax(0, 1fr) auto;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.5rem;
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                    transition: all 0.2s;
                    animation: slideIn 0.3s ease-out;
                }
                .task-item-actions { grid-column: 1 / -1; margin-left: 0; justify-content: flex-end; }
                .subtask-list { grid-column: 2 / -1; }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .task-item.animating {
                    animation: slideOut 0.4s ease-in forwards;
                }

                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }

                .task-item.completed .task-text {
                    text-decoration: line-through;
                    color: var(--text-secondary);
                }
                .task-content { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 0.1rem; }
                .task-content small { color: var(--text-muted); font-size: 0.64rem; }
                .subtask-list { width: 100%; list-style: none; display: grid; gap: 0.25rem; margin: 0.2rem 0 0 1.8rem; padding: 0; color: var(--text-secondary); font-size: 0.72rem; }
                .subtask-list label { display: flex; gap: 0.4rem; align-items: center; }
                .subtask-list .done { text-decoration: line-through; color: var(--text-muted); }

                .checkbox-wrapper {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 0.8rem;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }

                /* Larger tap-target without changing the visual checkbox size */
                .checkbox-wrapper {
                    padding: 12px;
                    margin: -12px;
                }

                .checkbox-wrapper:hover {
                    border-color: rgba(255,255,255,0.5);
                }

                .task-item.completed .checkbox-wrapper {
                    background: var(--accent-color);
                    border-color: var(--accent-color);
                }

                .task-text {
                    flex: 1;
                    font-size: 0.95rem;
                    word-break: break-word;
                }

                /* Archive Modal Styles */
                .archive-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: calc(1rem + env(safe-area-inset-top, 0px))
                             calc(1rem + env(safe-area-inset-right, 0px))
                             calc(1rem + env(safe-area-inset-bottom, 0px))
                             calc(1rem + env(safe-area-inset-left, 0px));
                    box-sizing: border-box;
                    animation: fadeIn 0.2s ease-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                .archive-modal {
                    width: min(98vw, 980px);
                    max-width: none;
                    max-height: calc(100vh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
                    border-radius: 24px;
                    padding: clamp(1rem, 3vw, 3rem);
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    animation: slideUp 0.3s ease-out;
                    box-sizing: border-box;
                    overflow: hidden;
                    background: rgba(20, 20, 20, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                @supports (max-height: 100dvh) {
                    .archive-modal {
                        max-height: calc(100dvh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
                    }
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .archive-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 1.5rem;
                    border-bottom: 2px solid rgba(255,255,255,0.1);
                }

                .archive-header h2 {
                    margin: 0;
                    font-size: 2rem;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }

                .close-btn {
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.6);
                    font-size: 2rem;
                    cursor: pointer;
                    transition: color 0.2s;
                    line-height: 1;
                    padding: 0.5rem;
                    flex-shrink: 0;
                }

                .close-btn:hover {
                    color: #fff;
                }

                .archived-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                    flex: 1;
                    min-height: 0;
                    padding-right: 0.5rem;
                }

                .archive-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                }

                .select-all {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    color: rgba(255,255,255,0.7);
                    font-size: 0.95rem;
                    user-select: none;
                }

                .select-all input {
                    width: 18px;
                    height: 18px;
                    accent-color: var(--accent-color);
                }

                .bulk-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                }

                .selected-count {
                    color: rgba(255,255,255,0.5);
                    font-size: 0.9rem;
                    min-width: 90px;
                    text-align: right;
                }

                .bulk-btn {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.15);
                    color: rgba(255,255,255,0.85);
                    padding: 0.55rem 0.9rem;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.95rem;
                }

                .bulk-btn:hover {
                    background: rgba(255,255,255,0.15);
                    border-color: rgba(255,255,255,0.25);
                }

                .bulk-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                .bulk-btn.danger:hover {
                    color: #f87171;
                    background: rgba(248, 113, 113, 0.12);
                    border-color: rgba(248, 113, 113, 0.25);
                }
                
                .archived-list::-webkit-scrollbar {
                    width: 6px;
                }
                
                .archived-list::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.05);
                    border-radius: 3px;
                }
                
                .archived-list::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 3px;
                }
                
                .archived-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.3);
                }

                .archived-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                    padding: 1.5rem;
                    background: rgba(0,0,0,0.3);
                    border-radius: 12px;
                    transition: all 0.2s;
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .archived-item.selected {
                    border-color: rgba(255,255,255,0.18);
                    background: rgba(0,0,0,0.38);
                }

                .archived-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex: 1;
                    min-width: 0;
                }

                .select-box {
                    width: 24px;
                    height: 24px;
                    border: 2px solid rgba(255,255,255,0.25);
                    border-radius: 8px;
                    background: transparent;
                    color: #fff;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: all 0.2s;
                    font-size: 0.95rem;
                    line-height: 1;
                }

                .select-box:hover {
                    border-color: rgba(255,255,255,0.45);
                    background: rgba(255,255,255,0.06);
                }

                .select-box.checked {
                    border-color: var(--accent-color);
                    background: rgba(255,255,255,0.06);
                }

                .archived-item:hover {
                    background: rgba(0,0,0,0.4);
                    border-color: rgba(255,255,255,0.1);
                    transform: translateX(4px);
                }

                .archived-item .task-text {
                    flex: 1;
                    font-size: 1.05rem;
                    font-weight: 500;
                    min-width: 0;
                    word-break: break-word;
                    color: rgba(255,255,255,0.9);
                    text-decoration: line-through;
                    text-decoration-color: rgba(255,255,255,0.4);
                }

                .archived-actions {
                    display: flex;
                    gap: 0.8rem;
                }

                .icon-btn {
                    background: transparent;
                    border: none;
                    padding: 0.6rem;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    color: rgba(255, 255, 255, 0.6);
                }

                .icon-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: scale(1.1);
                }

                .restore-btn:hover {
                    color: #4ade80; /* Green for restore */
                    background: rgba(74, 222, 128, 0.15);
                }

                .delete-btn:hover {
                    color: #f87171; /* Red for delete */
                    background: rgba(248, 113, 113, 0.15);
                }

                .icon-btn:active {
                    transform: scale(0.95);
                }

                .empty-message {
                    text-align: center;
                    color: rgba(255,255,255,0.5);
                    padding: 3rem 2rem;
                    font-style: italic;
                    font-size: 1.05rem;
                }

                @media (max-width: 768px) {
                    .task-list-container {
                        max-width: none;
                        max-height: none;
                        overflow-y: visible;
                    }
                    .add-btn {
                        width: 44px;
                        height: 44px;
                    }
                    .task-input {
                        padding: 0.75rem 1rem;
                    }
                    .archive-toolbar {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .bulk-actions {
                        justify-content: space-between;
                        flex-wrap: wrap;
                    }
                    .selected-count {
                        min-width: 0;
                        text-align: left;
                    }
                    .archived-item {
                        gap: 1rem;
                        padding: 1rem;
                    }
                }

                @media (max-width: 520px) {
                    .task-form { grid-template-columns: minmax(0, 1fr) auto; }
                    .task-date { grid-column: 1 / -1; width: 100%; }
                    .task-item { grid-template-columns: 28px minmax(0, 1fr); }
                    .pomodoro-estimate { grid-column: 2; }
                    .task-item-actions { opacity: 1; justify-content: flex-start; flex-wrap: wrap; }
                }
            `}</style>
        </div>
    );
};

export default TaskList;
