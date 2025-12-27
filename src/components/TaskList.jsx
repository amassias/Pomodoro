import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const TaskList = () => {
    const [tasks, setTasks] = useState(() => {
        const savedTasks = localStorage.getItem('pomodoro-tasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    });
    const [archivedTasks, setArchivedTasks] = useState(() => {
        const saved = localStorage.getItem('pomodoro-archived-tasks');
        return saved ? JSON.parse(saved) : [];
    });
    const [newTask, setNewTask] = useState('');
    const [showArchive, setShowArchive] = useState(false);
    const [animatingTaskId, setAnimatingTaskId] = useState(null);

    useEffect(() => {
        localStorage.setItem('pomodoro-tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        localStorage.setItem('pomodoro-archived-tasks', JSON.stringify(archivedTasks));
    }, [archivedTasks]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && showArchive) {
                setShowArchive(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showArchive]);

    const addTask = (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
        setNewTask('');
    };

    const toggleTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task && !task.completed) {
            // Animate the task before archiving
            setAnimatingTaskId(id);
            setTimeout(() => {
                archiveTask(id);
                setAnimatingTaskId(null);
            }, 400);
        } else {
            setTasks(tasks.map(t =>
                t.id === id ? { ...t, completed: !t.completed } : t
            ));
        }
    };

    const archiveTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            setTasks(tasks.filter(t => t.id !== id));
            setArchivedTasks([...archivedTasks, { ...task, completed: true, archivedAt: new Date().toISOString() }]);
        }
    };

    const restoreTask = (id) => {
        const task = archivedTasks.find(t => t.id === id);
        if (task) {
            const { archivedAt, ...restoredTask } = task;
            setArchivedTasks(archivedTasks.filter(t => t.id !== id));
            setTasks([...tasks, { ...restoredTask, completed: false }]);
            setShowArchive(false);
        }
    };

    const deleteTask = (id) => {
        setArchivedTasks(archivedTasks.filter(t => t.id !== id));
    };

    return (
        <div className="task-list-container glass-panel">
            <div className="task-header">
                <h3>Tasks</h3>
                {archivedTasks.length > 0 && (
                    <button
                        className="archive-btn"
                        onClick={() => setShowArchive(!showArchive)}
                        title="View archived tasks"
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
                <button type="submit" className="add-btn">+</button>
            </form>
            <ul className="task-list">
                {tasks.map(task => (
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
                <div className="archive-modal-overlay" onClick={() => setShowArchive(false)}>
                    <div className="archive-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="archive-header">
                            <h2>Archived Tasks</h2>
                            <button className="close-btn" onClick={() => setShowArchive(false)}>✕</button>
                        </div>
                        {archivedTasks.length === 0 ? (
                            <p className="empty-message">No archived tasks</p>
                        ) : (
                            <ul className="archived-list">
                                {archivedTasks.map(task => (
                                    <li key={task.id} className="archived-item">
                                        <span className="task-text">{task.text}</span>
                                        <div className="archived-actions">
                                            <button
                                                className="icon-btn restore-btn"
                                                onClick={() => restoreTask(task.id)}
                                                title="Restore task"
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
            <style jsx>{`
                .task-list-container {
                    padding: 1.5rem;
                    width: 100%;
                    max-width: 350px;
                    max-height: 400px;
                    overflow-y: auto;
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
                    padding: 2rem;
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
                    width: 98vw;
                    max-width: none;
                    height: 95vh;
                    max-height: none;
                    border-radius: 24px;
                    padding: 3rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    animation: slideUp 0.3s ease-out;
                    box-sizing: border-box;
                    overflow: hidden;
                    background: rgba(20, 20, 20, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.1);
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
                    max-height: 55vh;
                    padding-right: 0.5rem;
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
            `}</style>
        </div>
    );
};

export default TaskList;
