const { prisma } = require('../../config/prisma');
const { AgentRunStatus } = require('@prisma/client');

async function startRun({
  agent_type,
  task_id = null,
  event_type = null,
  parent_run_id = null,
  origin_event_id = null,
  metadata = {},
}) {
  const run = await prisma.agentRun.create({
    data: {
      agentType: agent_type,
      taskId: task_id,
      eventType: event_type,
      status: AgentRunStatus.running,
      metadata,
      parentRunId: parent_run_id,
      originEventId: origin_event_id,
    },
  });
  return run;
}

async function completeRun(runId) {
  if (!runId) return null;
  return prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: AgentRunStatus.completed,
      finishedAt: new Date(),
    },
  });
}

async function failRun(runId, error) {
  if (!runId) return null;
  return prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: AgentRunStatus.failed,
      finishedAt: new Date(),
      metadata: {
        error: typeof error === 'string' ? error : error?.message || 'unknown error',
      },
    },
  });
}

async function listRuns(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.agent_type) where.agentType = filters.agent_type;
  if (filters.event_type) where.eventType = filters.event_type;

  const [runs, activeCount, total] = await Promise.all([
    prisma.agentRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
    }),
    prisma.agentRun.count({ where: { status: AgentRunStatus.running } }),
    prisma.agentRun.count({ where }),
  ]);

  return { runs, activeCount, total };
}

async function listActiveRuns() {
  const where = { status: AgentRunStatus.running };
  const [runs, total] = await Promise.all([
    prisma.agentRun.findMany({ where, orderBy: { startedAt: 'desc' } }),
    prisma.agentRun.count({ where }),
  ]);
  return { runs, activeCount: total, total };
}

module.exports = {
  startRun,
  completeRun,
  failRun,
  listRuns,
  listActiveRuns,
};
