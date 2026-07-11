import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUserData } from '../../providers/UserDataProvider.jsx';

const TaskList = () => {
    const { loading, tasks, setTasks, archivedTasks, setArchivedTasks } = useUserData();
    const [newTask, setNewTask] = useState('');
    const [showArchive, setShowArchive] = useState(false);
    const [animatingTaskId, setAnimatingTaskId] = useState(null);
    const [selectedArchivedIds, setSelectedArchivedIds] = useState(() => new Set());

    const closeArchive = useCallback(() => {
        setShowArchive(false);
        if (selectedArchivedIds.size > 0) {
            setSelectedArchivedIds(new Set());
        }
    }, [selectedArchivedIds.size]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && showArchive) {
                closeArchive();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showArchive, closeArchive]);

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
        setTasks(prev => [...(Array.isArray(prev) ? prev : []), { id: crypto.randomUUID(), text: newTask.trim(), completed: false }]);
        setNewTask('');
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
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        setTasks(prev => prev.filter(t => t.id !== id));
        setArchivedTasks(prevArchived => [
            ...prevArchived,
            { ...task, completed: true, archivedAt: new Date().toISOString() }
        ]);
    };

    const restoreTask = (id) => {
        const task = archivedTasks.find(t => t.id === id);
        if (!task) return;

        const restoredTask = { ...task };
        delete restoredTask.archivedAt;
        setArchivedTasks(prev => prev.filter(t => t.id !== id));
        setTasks(prevTasks => [...prevTasks, { ...restoredTask, completed: false }]);
        closeArchive();
    };

    const deleteTask = (id) => {
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

        setArchivedTasks(prev => prev.filter(t => !ids.includes(t.id)));
        setSelectedArchivedIds(new Set());
    };

    return (
        <div className="task-list-container glass-panel">
            <div className="task-header">
                <h3>Tasks</h3>
                {archivedTasks.length > 0 && (
                    <button
                        className="archive-btn"
                        onClick={toggleArchive}
                        title="View archived tasks"
                        aria-label="View archived tasks"
                        aria-pressed={showArchive}
                    >
                        📦 {archivedTasks.length}
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
                <button type="submit" className="add-btn" aria-label="Add task">+</button>
            </form>
            <ul className="task-list">
                {(Array.isArray(tasks) ? tasks : []).map(task => (
                    <li
                        key={task.id}
                        className={`task-item ${task.completed ? 'completed' : ''} ${animatingTaskId === task.id ? 'animating' : ''}`}
                    >
                        <div className="checkbox-wrapper" onClick={() => toggleTask(task.id)}>
                            {task.completed && <div className="checkmark">✔</div>}
                        </div>
                        <span className="task-text">{task.text}</span>
                    </li>
                ))}
            </ul>

            {showArchive && createPortal(
                <div className="archive-modal-overlay" onClick={closeArchive}>
                    <div className="archive-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="archive-header">
                            <h2>Archived Tasks</h2>
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
                    padding: 1.5rem;
                    width: 100%;
                    max-width: 350px;
                    max-height: 400px;
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

                h3 {
                    font-weight: 500;
                    letter-spacing: 1px;
                    margin: 0;
                }

                .archive-btn {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: rgba(255,255,255,0.7);
                    padding: 0.3rem 0.6rem;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .archive-btn:hover {
                    background: rgba(255,255,255,0.15);
                    color: #fff;
                }

                .task-form {
                    display: flex;
                    gap: 0.5rem;
                }

                .task-input {
                    flex: 1;
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
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.5rem;
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                    transition: all 0.2s;
                    animation: slideIn 0.3s ease-out;
                }

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
            `}</style>
        </div>
    );
};

export default TaskList;
