const { evaluateTriggers, EVENTS } = require('./automation.triggers');
const { prisma } = require('../../config/prisma');
const { logActivity } = require('../activity/activity.service');
const { startRun, completeRun, failRun } = require('../execution/execution.service');
const { TaskStatus, TaskPriority, ActivityAction } = require('@prisma/client');

async function createEventRecord(eventType, payload) {
  const evt = await prisma.event.create({
    data: {
      type: eventType,
      taskId: payload?.task?.id || null,
      payload: payload || {},
    },
  });
  return evt;
}

async function executeAction(action, context) {
  switch (action.type) {
    case 'create_task':
      await startRun({
        agent_type: 'task_service',
        task_id: null,
        event_type: 'create_task',
        parent_run_id: context.parentRunId,
        origin_event_id: context.originEventId,
        metadata: { from: 'automation_action' },
      });
      await prisma.task.create({
        data: {
          title: context.title,
          description: context.description || '',
          priority: context.priority || TaskPriority.medium,
          status: TaskStatus.pending,
          dueDate: context.dueDate || null,
          createdById: context.createdById,
          assignedToId: context.assignedToId || null,
          relatedEntityType: context.relatedEntityType || null,
          relatedEntityId: context.relatedEntityId || null,
        },
      });
      break;
    case 'update_task':
      if (!context.taskId) return;
      await startRun({
        agent_type: 'task_service',
        task_id: context.taskId,
        event_type: 'update_task',
        parent_run_id: context.parentRunId,
        origin_event_id: context.originEventId,
        metadata: { from: 'automation_action' },
      });
      await prisma.task.update({
        where: { id: context.taskId },
        data: context.data || {},
      });
      break;
    case 'notify_user':
    default:
      // Placeholder notification; replace with real notifier later
      // eslint-disable-next-line no-console
      console.log('[automation] notify_user', action.data || context);
      break;
  }
}

async function runAutomation(eventType, payload = {}, options = {}) {
  let runId;
  let eventRecord;
  try {
    eventRecord = await createEventRecord(eventType, payload);
    const run = await startRun({
      agent_type: 'automation',
      task_id: payload.task?.id || null,
      event_type: eventType,
      parent_run_id: options.parentRunId || null,
      origin_event_id: eventRecord.id,
      metadata: { payloadSummary: payload?.task?.id ? { taskId: payload.task.id } : {} },
    });
    runId = run.id;

    const actions = evaluateTriggers(eventType, payload);
    for (const action of actions) {
      await executeAction(action, {
        ...payload,
        ...(action.data || {}),
        parentRunId: runId,
        originEventId: eventRecord.id,
      });
    }
    await completeRun(runId);
  } catch (err) {
    if (runId) await failRun(runId, err);
    // eslint-disable-next-line no-console
    console.error('[automation] failed', err);
  }
}

async function markTaskOverdue(task) {
  if (task.status === TaskStatus.completed || task.status === TaskStatus.overdue) return null;
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status: TaskStatus.overdue },
  });
  await logActivity({
    taskId: task.id,
    action: ActivityAction.status_changed,
    metadata: { previous_status: task.status, new_status: TaskStatus.overdue, source: 'runner' },
  });
  await runAutomation(EVENTS.TASK_OVERDUE, { task: updated }, { parentRunId: null });
  return updated;
}

module.exports = { runAutomation, markTaskOverdue, EVENTS };
