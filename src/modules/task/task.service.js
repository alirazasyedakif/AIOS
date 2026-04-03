const { prisma } = require('../../config/prisma');
const { logActivity } = require('../activity/activity.service');
const { TaskStatus, TaskPriority, ActivityAction } = require('@prisma/client');
const { runAutomation, EVENTS } = require('../automation/automation.service');
const { startRun, completeRun, failRun } = require('../execution/execution.service');
const { isUuid } = require('../../utils/validation');

function assertValidEnum(value, enumObj, field) {
  if (value && !Object.values(enumObj).includes(value)) {
    const allowed = Object.values(enumObj).join(', ');
    const err = new Error(`${field} must be one of: ${allowed}`);
    err.status = 400;
    throw err;
  }
}

function buildFilters(query) {
  const where = {};
  const and = [];

  if (query.status) {
    where.status = query.status;
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (query.assigned_to) {
    and.push({ assignedToId: query.assigned_to });
  }

  const now = new Date();
  if (query.overdue === 'true') {
    and.push({ dueDate: { lt: now } });
    and.push({ status: { notIn: [TaskStatus.completed] } });
  } else if (query.due_soon === 'true') {
    const inSeven = new Date(now);
    inSeven.setDate(now.getDate() + 7);
    and.push({ dueDate: { gte: now, lte: inSeven } });
    and.push({ status: { notIn: [TaskStatus.completed] } });
  }

  if (and.length) {
    where.AND = and;
  }

  return where;
}

async function createTask(payload) {
  let runId;
  assertValidEnum(payload.priority, TaskPriority, 'priority');

  try {
    const run = await startRun({
      agent_type: 'task_service',
      event_type: 'create_task',
      parent_run_id: payload.parent_run_id || null,
      origin_event_id: payload.origin_event_id || null,
      metadata: { created_by: payload.created_by },
    });
    runId = run.id;

    const task = await prisma.task.create({
      data: {
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        status: TaskStatus.pending,
        dueDate: payload.due_date ? new Date(payload.due_date) : null,
        assignedToId: payload.assigned_to ?? null,
        createdById: payload.created_by,
        relatedEntityType: payload.related_entity_type ?? null,
        relatedEntityId: payload.related_entity_id ?? null,
      },
    });

    await prisma.agentRun.update({ where: { id: runId }, data: { taskId: task.id } });

    await logActivity({
      taskId: task.id,
      action: ActivityAction.created,
      metadata: { created_by: task.createdById },
    });

    await runAutomation(EVENTS.TASK_CREATED, { task });

    await completeRun(runId);
    return task;
  } catch (err) {
    if (runId) await failRun(runId, err);
    throw err;
  }
}

async function getTasks(filters) {
  const where = buildFilters(filters);

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return tasks;
}

async function getTaskById(id) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      activityLogs: true,
    },
  });

  return task;
}

async function updateTask(id, updates) {
  let runId;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  if (updates.status) assertValidEnum(updates.status, TaskStatus, 'status');
  if (updates.priority) assertValidEnum(updates.priority, TaskPriority, 'priority');

  const data = {};
  const changedFields = [];

  ['title', 'description'].forEach((field) => {
    if (updates[field] !== undefined) {
      data[field] = updates[field];
      changedFields.push(field);
    }
  });

  if (updates.status) {
    data.status = updates.status;
  }
  if (updates.priority) {
    data.priority = updates.priority;
  }
  if (updates.due_date !== undefined) {
    data.dueDate = updates.due_date ? new Date(updates.due_date) : null;
    changedFields.push('due_date');
  }
  if (updates.assigned_to !== undefined) {
    data.assignedToId = updates.assigned_to;
  }

  try {
    const run = await startRun({
      agent_type: 'task_service',
      task_id: id,
      event_type: 'update_task',
      parent_run_id: updates.parent_run_id || null,
      origin_event_id: updates.origin_event_id || null,
    });
    runId = run.id;

    const updated = await prisma.task.update({
      where: { id },
      data,
    });

    let action = ActivityAction.updated;
    if (updates.status && updates.status !== existing.status) {
      action = ActivityAction.status_changed;
    } else if (updates.assigned_to !== undefined && updates.assigned_to !== existing.assignedToId) {
      action = ActivityAction.reassigned;
    }

    if (action) {
      await logActivity({
        taskId: id,
        action,
        metadata: {
          changed_fields: changedFields,
          previous_status: existing.status,
          new_status: updates.status,
          previous_assigned_to: existing.assignedToId,
          new_assigned_to: updates.assigned_to,
        },
      });
    }

    await runAutomation(EVENTS.TASK_UPDATED, { task: updated, previous: existing });

    await completeRun(runId);
    return updated;
  } catch (err) {
    if (runId) await failRun(runId, err);
    throw err;
  }
}

async function deleteTask(id) {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }
  await prisma.task.delete({ where: { id } });
  // Activity logs cascade via schema
}

function validateCreateBody(body) {
  const required = ['title', 'description', 'priority', 'due_date', 'created_by'];
  const missing = required.filter((f) => !body[f]);
  if (missing.length) {
    const err = new Error(`Missing required fields: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
  assertValidEnum(body.priority, TaskPriority, 'priority');
  if (body.status) assertValidEnum(body.status, TaskStatus, 'status');
  if (!isUuid(body.created_by)) {
    const err = new Error('created_by must be a valid UUID');
    err.status = 400;
    throw err;
  }
  if (body.assigned_to && !isUuid(body.assigned_to)) {
    const err = new Error('assigned_to must be a valid UUID');
    err.status = 400;
    throw err;
  }
}

function validateId(id) {
  if (!isUuid(id)) {
    const err = new Error('Invalid id format');
    err.status = 400;
    throw err;
  }
}

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  validateCreateBody,
  validateId,
  assertValidEnum,
};
