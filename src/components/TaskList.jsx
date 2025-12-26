import React, { useState, useEffect } from 'react';

const TaskList = () => {
    const [tasks, setTasks] = useState(() => {
        const savedTasks = localStorage.getItem('pomodoro-tasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    });
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        localStorage.setItem('pomodoro-tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
        setNewTask('');
    };

    const toggleTask = (id) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    };

    const deleteTask = (id) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    return (
        <div className="task-list-container glass-panel">
            <h3>Tasks</h3>
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
                    <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                        <div className="checkbox-wrapper" onClick={() => toggleTask(task.id)}>
                            {task.completed && <div className="checkmark">✔</div>}
                        </div>
                        <span className="task-text">{task.text}</span>
                        <button className="delete-btn" onClick={() => deleteTask(task.id)}>×</button>
                    </li>
                ))}
            </ul>
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
                h3 {
                    font-weight: 500;
                    letter-spacing: 1px;
                    margin-bottom: 0.5rem;
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
                }
                .task-list {
                    list-style: none;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    padding: 0;
                }
                .task-item {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.5rem;
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                    transition: all 0.2s;
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
                }
                .task-item.completed .checkbox-wrapper {
                    background: var(--accent-color);
                    border-color: var(--accent-color);
                }
                .task-text {
                    flex: 1;
                    font-size: 0.95rem;
                }
                .delete-btn {
                    background: transparent;
                    color: rgba(255,255,255,0.3);
                    font-size: 1.2rem;
                    padding: 0 0.5rem;
                }
                .delete-btn:hover {
                    color: #ff6b6b;
                }
            `}</style>
        </div>
    );
};

export default TaskList;
