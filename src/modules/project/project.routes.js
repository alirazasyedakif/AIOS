const express = require('express');
const {
  handleCreateProject,
  handleListProjects,
  handleGetProject,
} = require('./project.controller');

const router = express.Router();

router.post('/', handleCreateProject);
router.get('/', handleListProjects);
router.get('/:id', handleGetProject);

module.exports = router;
