const { prisma } = require('../../config/prisma');
const { markTaskOverdue, EVENTS } = require('./automation.service');
const { startRun, completeRun, failRun } = require('../execution/execution.service');

let intervalHandle = null;
let running = false;

async function checkOverdueTasks() {
  if (running) return;
  running = true;
  let runId = null;
  try {
    const run = await startRun({
      agent_type: 'automation_runner',
      event_type: EVENTS.TASK_OVERDUE,
    });
    runId = run.id;

    const now = new Date();
    const candidates = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['completed', 'overdue'] },
      },
    });

    for (const task of candidates) {
      await markTaskOverdue(task);
    }
    await completeRun(runId);
  } catch (err) {
    if (runId) {
      await failRun(runId, err);
    }
    // eslint-disable-next-line no-console
    console.error('[automation-runner] failed to check overdue tasks', err);
  } finally {
    running = false;
  }
}

function startAutomationRunner() {
  if (intervalHandle) return;
  // fire once on start
  checkOverdueTasks();
  intervalHandle = setInterval(checkOverdueTasks, 60 * 1000);
}

module.exports = { startAutomationRunner, EVENTS };
