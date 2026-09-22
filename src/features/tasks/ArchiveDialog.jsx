import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUserData } from '../../providers/UserDataProvider.jsx';
import { restoreTaskById } from '../../lib/tasks.js';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';

// Mounted only while open, so the selection resets every time the archive closes.
const ArchiveDialog = ({ onClose }) => {
    const { tasks, setTasks, archivedTasks, setArchivedTasks } = useUserData();
    const [selectedArchivedIds, setSelectedArchivedIds] = useState(() => new Set());
    const archiveDialogRef = useRef(null);

    useDialogFocus({ open: true, onClose, dialogRef: archiveDialogRef });

    const restoreTask = (id) => {
        const result = restoreTaskById(tasks, archivedTasks, id);
        setArchivedTasks(result.archivedTasks);
        setTasks(result.tasks);
        onClose();
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

    return createPortal(
        <div className="archive-modal-overlay" onClick={onClose}>
            <div ref={archiveDialogRef} className="archive-modal glass-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="archive-title">
                <div className="archive-header">
                    <h2 id="archive-title">Archived Tasks</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
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
    );
};

export default ArchiveDialog;
