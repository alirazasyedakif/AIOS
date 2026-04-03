const { TaskStatus, TaskPriority } = require('@prisma/client');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  validateCreateBody,
  validateId,
  assertValidEnum,
} = require('./task.service');

async function handleCreateTask(req, res) {
  try {
    validateCreateBody(req.body);
    const task = await createTask(req.body);
    res.status(201).json(task);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create task' });
  }
}

async function handleGetTasks(req, res) {
  try {
    if (req.query.status) assertValidEnum(req.query.status, TaskStatus, 'status');
    if (req.query.priority) assertValidEnum(req.query.priority, TaskPriority, 'priority');
    const tasks = await getTasks(req.query);
    res.json(tasks);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to fetch tasks' });
  }
}

async function handleGetTaskById(req, res) {
  try {
    validateId(req.params.id);
    const task = await getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to fetch task' });
  }
}

async function handleUpdateTask(req, res) {
  try {
    validateId(req.params.id);
    if (req.body.status) assertValidEnum(req.body.status, TaskStatus, 'status');
    if (req.body.priority) assertValidEnum(req.body.priority, TaskPriority, 'priority');
    const updated = await updateTask(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to update task' });
  }
}

async function handleDeleteTask(req, res) {
  try {
    validateId(req.params.id);
    await deleteTask(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to delete task' });
  }
}

module.exports = {
  handleCreateTask,
  handleGetTasks,
  handleGetTaskById,
  handleUpdateTask,
  handleDeleteTask,
};
