const express = require('express');
const {
  handleCreateTask,
  handleGetTasks,
  handleGetTaskById,
  handleUpdateTask,
  handleDeleteTask,
} = require('./task.controller');

const router = express.Router();

router.post('/', handleCreateTask);
router.get('/', handleGetTasks);
router.get('/:id', handleGetTaskById);
router.patch('/:id', handleUpdateTask);
router.delete('/:id', handleDeleteTask);

module.exports = router;
