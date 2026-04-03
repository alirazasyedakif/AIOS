const { AgentRunStatus } = require('@prisma/client');

function findRootParent(run, runMap) {
  let current = run;
  while (current?.parentRunId && runMap[current.parentRunId]) {
    current = runMap[current.parentRunId];
  }
  return current ? current.id : run.id;
}

function groupFlows(runs) {
  const runMap = runs.reduce((acc, r) => {
    acc[r.id] = r;
    return acc;
  }, {});

  const flows = {};

  for (const run of runs) {
    let key = null;
    if (run.originEventId) {
      key = `event:${run.originEventId}`;
    } else if (run.parentRunId) {
      key = `root:${findRootParent(run, runMap)}`;
    } else if (run.taskId) {
      key = `task:${run.taskId}`;
    } else {
      key = `run:${run.id}`;
    }
    if (!flows[key]) flows[key] = { flow_id: key, runs: [] };
    flows[key].runs.push(run);
  }

  return Object.values(flows);
}

function summarizeFlow(flow) {
  const runs = flow.runs;
  const total_steps = runs.length;
  const start_time = runs.reduce(
    (min, r) => (min ? Math.min(min, new Date(r.startedAt).getTime()) : new Date(r.startedAt).getTime()),
    null
  );
  const end_time = runs.reduce((max, r) => {
    const t = r.finishedAt ? new Date(r.finishedAt).getTime() : new Date(r.startedAt).getTime();
    return max ? Math.max(max, t) : t;
  }, null);
  const duration = start_time && end_time ? end_time - start_time : null;
  const involved_agents = Array.from(new Set(runs.map((r) => r.agentType)));

  let outcome = 'success';
  if (runs.some((r) => r.status === AgentRunStatus.failed)) outcome = 'failed';
  else if (runs.some((r) => r.status === AgentRunStatus.running)) outcome = 'incomplete';

  let failure_point = null;
  if (outcome === 'failed') {
    const failedRun = runs
      .filter((r) => r.status === AgentRunStatus.failed)
      .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))[0];
    failure_point = {
      run_id: failedRun.id,
      agent_type: failedRun.agentType,
      event_type: failedRun.eventType,
    };
  }

  return {
    flow_id: flow.flow_id,
    total_steps,
    start_time: start_time ? new Date(start_time).toISOString() : null,
    end_time: end_time ? new Date(end_time).toISOString() : null,
    duration,
    outcome,
    failure_point,
    involved_agents,
    runs,
  };
}

function computeInsights(flowSummaries) {
  const total_flows = flowSummaries.length;
  if (total_flows === 0) {
    return {
      total_flows: 0,
      success_rate: 0,
      failure_rate: 0,
      avg_duration: 0,
      bottleneck_agent: null,
      most_active_agent: null,
    };
  }
  const successes = flowSummaries.filter((f) => f.outcome === 'success').length;
  const failures = flowSummaries.filter((f) => f.outcome === 'failed').length;
  const durations = flowSummaries.map((f) => f.duration).filter(Boolean);
  const avg_duration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const failureAgentCount = {};
  flowSummaries
    .filter((f) => f.failure_point)
    .forEach((f) => {
      const ag = f.failure_point.agent_type;
      failureAgentCount[ag] = (failureAgentCount[ag] || 0) + 1;
    });
  const bottleneck_agent =
    Object.keys(failureAgentCount).sort((a, b) => failureAgentCount[b] - failureAgentCount[a])[0] || null;

  const agentActivity = {};
  flowSummaries.forEach((f) => {
    f.involved_agents.forEach((ag) => {
      agentActivity[ag] = (agentActivity[ag] || 0) + 1;
    });
  });
  const most_active_agent =
    Object.keys(agentActivity).sort((a, b) => agentActivity[b] - agentActivity[a])[0] || null;

  return {
    total_flows,
    success_rate: successes / total_flows,
    failure_rate: failures / total_flows,
    avg_duration,
    bottleneck_agent,
    most_active_agent,
  };
}

function identifyWorkflow(summary) {
  const agents = summary.involved_agents || [];
  const hasAutomation = agents.includes('automation');
  const hasRunner = agents.includes('automation_runner');
  const hasTask = agents.includes('task_service');
  const flowIdLower = summary.flow_id.toLowerCase();

  if (summary.runs.some((r) => r.eventType === 'TASK_OVERDUE')) {
    return { workflow_name: 'Overdue Resolution Flow', workflow_type: 'overdue' };
  }
  if (summary.runs.some((r) => r.eventType === 'TASK_CREATED')) {
    return { workflow_name: 'Task Processing Flow', workflow_type: 'task_processing' };
  }
  if (flowIdLower.includes('lease')) {
    return { workflow_name: 'Lease Management Flow', workflow_type: 'lease' };
  }
  if (hasAutomation && hasRunner) {
    return { workflow_name: 'Rule Engine Flow', workflow_type: 'rule_engine' };
  }
  if (hasTask) {
    return { workflow_name: 'Task Execution Flow', workflow_type: 'task_execution' };
  }
  return { workflow_name: 'Generic Flow', workflow_type: 'generic' };
}

function formatDuration(ms) {
  if (!ms && ms !== 0) return '-';
  const sec = Math.floor(ms / 1000);
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${sec}s`;
}

function generateNarrative(summary) {
  const { workflow_name } = identifyWorkflow(summary);
  const dur = formatDuration(summary.duration);
  if (summary.outcome === AgentRunStatus.failed) {
    const fail = summary.failure_point;
    const reason = fail ? `${fail.agent_type}${fail.event_type ? ` (${fail.event_type})` : ''}` : 'unknown cause';
    return `${workflow_name} failed after ${summary.total_steps} steps in ${dur} due to ${reason}.`;
  }
  if (summary.outcome === 'incomplete' || summary.outcome === AgentRunStatus.running) {
    return `${workflow_name} is still running (${summary.total_steps} steps so far, ${dur}).`;
  }
  return `${workflow_name} completed successfully in ${dur} across ${summary.total_steps} steps.`;
}

function generateRecommendations(summary, insights) {
  const recs = [];
  if (summary.outcome === AgentRunStatus.failed) {
    if (summary.failure_point?.agent_type) {
      recs.push(`Review ${summary.failure_point.agent_type} logic or configuration.`);
    } else {
      recs.push('Investigate the failed run for root cause.');
    }
  }
  if (summary.outcome === 'incomplete' || summary.outcome === AgentRunStatus.running) {
    recs.push('Flow still running — monitor or intervene if it exceeds expected duration.');
  }
  if (insights?.avg_duration && summary.duration && summary.duration > insights.avg_duration * 1.2) {
    recs.push('Flow is slower than typical — check for bottlenecks or contention.');
  }
  if (insights?.bottleneck_agent && summary.involved_agents?.includes(insights.bottleneck_agent)) {
    recs.push(`Frequent issues in ${insights.bottleneck_agent} — consider debugging or scaling it.`);
  }
  if (recs.length === 0) recs.push('No action needed.');
  return recs;
}

function addPerformanceFlag(summary, avgDuration) {
  if (!summary.duration || !avgDuration) return { ...summary, performance: 'unknown' };
  const performance = summary.duration <= avgDuration ? 'above_average' : 'below_average';
  return { ...summary, performance };
}

function computeInsightsExtended(flowSummaries) {
  const base = computeInsights(flowSummaries);
  const failureCounts = {};
  flowSummaries.forEach((f) => {
    if (f.failure_point?.agent_type) {
      failureCounts[f.failure_point.agent_type] = (failureCounts[f.failure_point.agent_type] || 0) + 1;
    }
  });
  const recurring_failure_agent =
    Object.keys(failureCounts).sort((a, b) => failureCounts[b] - failureCounts[a])[0] || null;

  const slowest = [...flowSummaries]
    .filter((f) => f.duration)
    .sort((a, b) => b.duration - a.duration)[0];

  return {
    ...base,
    recurring_failure_agent,
    slowest_flow_type: slowest ? identifyWorkflow(slowest).workflow_name : null,
    most_problematic_workflow: recurring_failure_agent ? 'Flows failing in ' + recurring_failure_agent : null,
  };
}

function computeSeverity(summary, insights) {
  const recurringAgent = insights?.recurring_failure_agent;
  if (summary.outcome === AgentRunStatus.failed) return 'high';
  if (recurringAgent && summary.involved_agents?.includes(recurringAgent)) return 'high';
  if (summary.performance === 'below_average') return 'medium';
  if (summary.outcome === 'incomplete' || summary.outcome === AgentRunStatus.running) return 'medium';
  return 'low';
}

function aggregateActions(flowSummaries, insights) {
  const buckets = [];

  // Recurring failures
  if (insights?.recurring_failure_agent) {
    const affected = flowSummaries.filter(
      (f) => f.failure_point?.agent_type === insights.recurring_failure_agent
    ).length;
    buckets.push({
      priority: 'high',
      issue: `Recurring ${insights.recurring_failure_agent} failures`,
      recommendation: 'Review automation logic and rule configuration',
      affected_flows: affected,
    });
  }

  // Slow flows
  const slowFlows = flowSummaries.filter((f) => f.performance === 'below_average');
  if (slowFlows.length) {
    const byType = {};
    slowFlows.forEach((f) => {
      const type = f.workflow_type || 'flow';
      byType[type] = (byType[type] || 0) + 1;
    });
    Object.keys(byType).forEach((type) => {
      buckets.push({
        priority: 'medium',
        issue: `Slow ${type}`,
        recommendation: 'Investigate execution delays and potential bottlenecks',
        affected_flows: byType[type],
      });
    });
  }

  // Generic failures not captured above
  const failedFlows = flowSummaries.filter((f) => f.outcome === AgentRunStatus.failed);
  if (failedFlows.length) {
    const count = failedFlows.length;
    buckets.push({
      priority: 'high',
      issue: 'Recent flow failures',
      recommendation: 'Inspect failed runs and remediate root causes',
      affected_flows: count,
    });
  }

  // De-duplicate by issue text
  const dedup = {};
  buckets.forEach((b) => {
    const key = `${b.priority}:${b.issue}`;
    if (!dedup[key]) dedup[key] = b;
    else dedup[key].affected_flows += b.affected_flows;
  });

  const actions = Object.values(dedup).sort((a, b) => {
    const pOrder = { high: 0, medium: 1, low: 2 };
    const pa = pOrder[a.priority] ?? 2;
    const pb = pOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return (b.affected_flows || 0) - (a.affected_flows || 0);
  });

  return actions;
}

function computeSystemHealth(actions, insights) {
  const hasHigh = actions.some((a) => a.priority === 'high');
  if (hasHigh && insights?.failure_rate > 0.1) return 'critical';
  const hasMedium = actions.some((a) => a.priority === 'medium');
  if (hasMedium) return 'degraded';
  return 'healthy';
}

module.exports = {
  groupFlows,
  summarizeFlow,
  computeInsights,
  identifyWorkflow,
  generateNarrative,
  generateRecommendations,
  addPerformanceFlag,
  computeInsightsExtended,
  computeSeverity,
  aggregateActions,
  computeSystemHealth,
};
