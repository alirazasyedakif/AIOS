const { AgentRunStatus } = require('@prisma/client');
const { listRuns, listActiveRuns } = require('../execution/execution.service');

async function getExecutions(req, res) {
  try {
    const filters = {
      status: req.query.status,
      agent_type: req.query.agent_type,
      event_type: req.query.event_type,
    };
    if (filters.status && !Object.values(AgentRunStatus).includes(filters.status)) {
      return res.status(400).json({ message: 'Invalid status filter' });
    }
    const { runs, activeCount, total } = await listRuns(filters);
    res.json({ data: runs, meta: { total, active_count: activeCount } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch executions' });
  }
}

async function getActiveExecutions(_req, res) {
  try {
    const { runs, activeCount, total } = await listActiveRuns();
    res.json({ data: runs, meta: { total, active_count: activeCount } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch active executions' });
  }
}

module.exports = { getExecutions, getActiveExecutions };
