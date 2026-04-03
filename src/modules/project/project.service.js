const { prisma } = require('../../config/prisma');
const { TaskPriority, TaskStatus, ActivityAction } = require('@prisma/client');
const { runAutomation, EVENTS } = require('../automation/automation.service');
const { logActivity } = require('../activity/activity.service');
const { startRun, completeRun, failRun } = require('../execution/execution.service');
const { isUuid } = require('../../utils/validation');

function ensureValidId(id, label = 'id') {
  if (!isUuid(id)) {
    const err = new Error(`${label} must be a valid UUID`);
    err.status = 400;
    throw err;
  }
}

async function ensureUserExists(userId) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;
  // Create a lightweight placeholder user so FK constraints pass.
  const email = `${userId}@auto.local`;
  return prisma.user.create({
    data: {
      id: userId,
      name: `Auto User ${userId.slice(0, 6)}`,
      email,
      role: 'operator',
    },
  });
}

async function createProject(body) {
  if (!body.name || !body.description || !body.created_by) {
    const err = new Error('name, description, created_by are required');
    err.status = 400;
    throw err;
  }
  // Only require UUID format; do not require existing user record
  ensureValidId(body.created_by, 'created_by');
  await ensureUserExists(body.created_by);

  let runId;
  try {
    const run = await startRun({ agent_type: 'task_service', event_type: 'create_project', metadata: { created_by: body.created_by } });
    runId = run.id;

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        status: body.status || 'active',
      },
    });

    // Generate tasks
    const tasks = await generateTasksFromProject({ ...project, created_by: body.created_by });

    await completeRun(runId);
    return { project, tasks };
  } catch (err) {
    if (runId) await failRun(runId, err);
    throw err;
  }
}

async function listProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { tasks: true },
  });
}

async function getProjectById(id) {
  ensureValidId(id);
  const project = await prisma.project.findUnique({
    where: { id },
    include: { tasks: true },
  });
  return project;
}

function pickTasksFromDescription(description) {
  const lower = description.toLowerCase();
  if (lower.includes('task manager')) {
    return [
      'Design database schema',
      'Define API endpoints',
      'Create UI layout',
      'Implement task CRUD',
      'Add automation rules',
    ];
  }
  return [
    'Research requirements',
    'Define structure',
    'Build MVP',
    'Write docs',
    'Prepare launch checklist',
  ];
}

async function generateTasksFromProject(project) {
  const titles = pickTasksFromDescription(project.description).slice(0, 10);
  const tasks = [];

  for (const title of titles) {
    const task = await prisma.task.create({
      data: {
        title,
        description: `${title} for project ${project.name}`,
        status: TaskStatus.pending,
        priority: TaskPriority.medium,
        createdById: project.created_by,
        projectId: project.id,
      },
    });

    await logActivity({ taskId: task.id, action: ActivityAction.created, metadata: { project_id: project.id } });
    await runAutomation(EVENTS.TASK_CREATED, { task });
    tasks.push(task);
  }

  return tasks;
}

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  generateTasksFromProject,
};
