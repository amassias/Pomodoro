import React, { useState, useEffect } from 'react';

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

            {showArchive && (
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
                                        <button 
                                            className="restore-btn"
                                            onClick={() => restoreTask(task.id)}
                                            title="Restore task"
                                        >
                                            ↺ Restore
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
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
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
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
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    border-radius: 20px;
                    padding: 2.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    animation: slideUp 0.3s ease-out;
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
                    padding-bottom: 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }

                .archive-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .close-btn {
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.6);
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: color 0.2s;
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
                    gap: 0.5rem;
                    overflow-y: auto;
                }

                .archived-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1.5rem;
                    padding: 1.2rem;
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .archived-item:hover {
                    background: rgba(0,0,0,0.3);
                }

                .archived-item .task-text {
                    flex: 1;
                    font-size: 1rem;
                    min-width: 0;
                    word-break: break-word;
                }

                .restore-btn {
                    background: rgba(107, 180, 255, 0.2);
                    border: 1px solid rgba(107, 180, 255, 0.3);
                    color: #6bb4ff;
                    padding: 0.6rem 1.2rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                    transition: all 0.2s;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .restore-btn:hover {
                    background: rgba(107, 180, 255, 0.3);
                    border-color: rgba(107, 180, 255, 0.5);
                }

                .empty-message {
                    text-align: center;
                    color: rgba(255,255,255,0.5);
                    padding: 2rem 1rem;
                    font-style: italic;
                }
            `}</style>
        </div>
    );
};

export default TaskList;
