export const archiveTaskById = (tasks, archivedTasks, id, archivedAt = new Date().toISOString()) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeArchived = Array.isArray(archivedTasks) ? archivedTasks : [];
  const task = safeTasks.find((item) => item.id === id);

  if (!task) return { tasks: safeTasks, archivedTasks: safeArchived };

  return {
    tasks: safeTasks.filter((item) => item.id !== id),
    archivedTasks: [...safeArchived, { ...task, completed: true, archivedAt }],
  };
};

export const restoreTaskById = (tasks, archivedTasks, id) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeArchived = Array.isArray(archivedTasks) ? archivedTasks : [];
  const task = safeArchived.find((item) => item.id === id);

  if (!task) return { tasks: safeTasks, archivedTasks: safeArchived };

  const { archivedAt: _archivedAt, ...restoredTask } = task;
  return {
    tasks: [...safeTasks, { ...restoredTask, completed: false }],
    archivedTasks: safeArchived.filter((item) => item.id !== id),
  };
};
