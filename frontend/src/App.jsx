import { useEffect, useState } from 'react';
import './App.css';

function App() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
    });

    const [editingTaskId, setEditingTaskId] = useState(null);

    useEffect(() => {
        async function loadTasks() {
            try {
                const response = await fetch(
                    '/api/tasks'
                );

                if (!response.ok) {
                    throw new Error('Unable to load tasks');
                }

                const data = await response.json();
                setTasks(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadTasks();
    }, []);


    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }));
    }

    function handleEdit(task) {
    setEditingTaskId(task.id);

    setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date
            ? task.due_date.substring(0, 10)
            : '',
    });

        setShowForm(true);
    }

    async function handleSubmit(event) {
    event.preventDefault();

    try {
        const url = editingTaskId
            ? `/api/tasks/${editingTaskId}`
            : '/api/tasks';

        const method = editingTaskId
            ? 'PUT'
            : 'POST';

        const response = await fetch(url, {
            method,

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify({
                title: formData.title,
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                dueDate: formData.dueDate || null,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to save task'
            );
        }

        if (editingTaskId) {
            setTasks((previousTasks) =>
                previousTasks.map((task) =>
                    task.id === editingTaskId
                        ? data
                        : task
                )
            );
        } else {
            setTasks((previousTasks) => [
                data,
                ...previousTasks,
            ]);
        }

        resetForm();
        setError(null);
    } catch (err) {
        setError(err.message);
    }
}

        // delete task function
        async function handleDelete(taskId) {
            const confirmed = window.confirm(
                'Are you sure you want to delete this task?'
            );

            if (!confirmed) {
                return;
            }

            try {
                const response = await fetch(
                    `/api/tasks/${taskId}`,
                    {
                        method: 'DELETE',
                    }
                );

                if (!response.ok) {
                    throw new Error('Unable to delete task');
                }

                setTasks((previousTasks) =>
                    previousTasks.filter(
                        (task) => task.id !== taskId
                    )
                );

                setError(null);
            } catch (err) {
                setError(err.message);
            }
        }
        // end of delete task function

        // function to reset the form data and close the form
        function resetForm() {
            setFormData({
                title: '',
                description: '',
                status: 'todo',
                priority: 'medium',
                dueDate: '',
            });

            setEditingTaskId(null);
            setShowForm(false);
        }
        //end of resetForm function

    if (loading) {
        return <p className="message">Loading tasks...</p>;
    }

    if (error) {
        return <p className="message error">{error}</p>;
    }

    return (
        <div className="app">
            <header className="header">
                <div>
                    <p className="eyebrow">
                        TASK MANAGEMENT PLATFORM
                    </p>

                    <h1>TaskFlow</h1>

                    <p className="subtitle">
                        Plan, track and complete your work.
                    </p>
                </div>

                <button className="add-button" onClick={() => {
                    resetForm();
                    setShowForm(true);
                }}>
                    + Add Task
                </button>
            </header>

            {showForm && (
                <div className="form-container">
                    <form className="task-form" onSubmit={handleSubmit}>
                        <div className="form-header">
                            <h2> {editingTaskId ? 'Edit Task' : 'Create Task'}</h2>
                            <button type="button" className="close-button" onClick={resetForm}>
                                ×
                            </button>
                        </div>

                        <label>
                            Title
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. Configure Jenkins"
                                required
                            />
                        </label>

                        <label>
                            Description

                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the task..."
                                rows="4"
                            />
                        </label>

                        <div className="form-row">
                            <label>
                                Status

                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="todo">
                                        Todo
                                    </option>

                                    <option value="in_progress">
                                        In Progress
                                    </option>

                                    <option value="done">
                                        Done
                                    </option>
                                </select>
                            </label>

                            <label>
                                Priority

                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">
                                        Medium
                                    </option>
                                    <option value="high">High</option>
                                </select>
                            </label>
                        </div>

                        <label>
                            Due date

                            <input
                                type="date"
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleChange}
                            />
                        </label>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="cancel-button"
                                onClick={resetForm}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="save-button"
                            >
                                 {editingTaskId ? 'Save Changes' : 'Create Task'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <main>
                <div className="section-heading">
                    <h2>My Tasks</h2>

                    <span className="task-count">
                        {tasks.length} tasks
                    </span>
                </div>

                {tasks.length === 0 ? (
                    <p className="message">
                        No tasks yet.
                    </p>
                ) : (
                    <div className="task-grid">
                        {tasks.map((task) => (
                            <article
                                className="task-card"
                                key={task.id}
                            >
                                <div className="task-top">
                                    <span
                                        className={
                                            `priority ${task.priority}`
                                        }
                                    >
                                        {task.priority}
                                    </span>

                                    <span className="status">
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </div>

                                <h3>{task.title}</h3>

                                <p>
                                    {task.description ||
                                        'No description provided.'}
                                </p>

                                {task.due_date && (
                                    <small>
                                        Due: {task.due_date}
                                    </small>
                                )}

                               
                                <div className="task-actions">
                                    <button
                                        className="edit-button"
                                        onClick={() => handleEdit(task)}
                                    >
                                        Edit
                                    </button>

                                      <button
                                        className="delete-button"
                                        onClick={() => handleDelete(task.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                               
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;