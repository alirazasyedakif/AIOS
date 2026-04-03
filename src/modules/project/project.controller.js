const { createProject, listProjects, getProjectById } = require('./project.service');

async function handleCreateProject(req, res) {
  try {
    const result = await createProject(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create project' });
  }
}

async function handleListProjects(_req, res) {
  try {
    const projects = await listProjects();
    res.json(projects);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to fetch projects' });
  }
}

async function handleGetProject(req, res) {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to fetch project' });
  }
}

module.exports = {
  handleCreateProject,
  handleListProjects,
  handleGetProject,
};
