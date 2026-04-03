const { prisma } = require('../../config/prisma');
const {
  groupFlows,
  summarizeFlow,
  computeInsightsExtended,
  identifyWorkflow,
  generateNarrative,
  generateRecommendations,
  addPerformanceFlag,
  computeSeverity,
  aggregateActions,
  computeSystemHealth,
} = require('../intelligence/intelligence.service');

async function getFlows(_req, res) {
  try {
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
    });

    const edges = runs
      .filter((r) => r.parentRunId)
      .map((r) => ({ from: r.parentRunId, to: r.id, taskId: r.taskId || null, eventType: r.eventType || null }));

    res.json({ nodes: runs, edges });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch flows' });
  }
}

async function getFlowSummaries(_req, res) {
  try {
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
    });
    const flows = groupFlows(runs);
    const summaries = flows.map((f) => {
      const base = summarizeFlow(f);
      const workflow = identifyWorkflow(base);
      return { ...base, ...workflow };
    });

    const avgDuration =
      summaries.map((s) => s.duration).filter(Boolean).reduce((a, b) => a + b, 0) /
      (summaries.map((s) => s.duration).filter(Boolean).length || 1);

    const insights = computeInsightsExtended(summaries);
    const final = summaries.map((s) => {
      const withPerf = addPerformanceFlag(s, avgDuration);
      const narrative = generateNarrative(withPerf);
      const recommendations = generateRecommendations(withPerf, insights);
      const severity = computeSeverity(withPerf, insights);
      return { ...withPerf, narrative, recommendations, severity };
    });

    res.json(final);
  } catch (err) {
    res.status(500).json({ message: 'Failed to summarize flows' });
  }
}

async function getInsights(_req, res) {
  try {
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
    });
    const flows = groupFlows(runs);
    const summaries = flows.map((f) => {
      const base = summarizeFlow(f);
      const workflow = identifyWorkflow(base);
      return { ...base, ...workflow };
    });
    const insights = computeInsightsExtended(summaries);

    const avgDuration =
      summaries.map((s) => s.duration).filter(Boolean).reduce((a, b) => a + b, 0) /
      (summaries.map((s) => s.duration).filter(Boolean).length || 1);

    const enrichedSummaries = summaries.map((s) => {
      const withPerf = addPerformanceFlag(s, avgDuration);
      const narrative = generateNarrative(withPerf);
      const recommendations = generateRecommendations(withPerf, insights);
      const severity = computeSeverity(withPerf, insights);
      return { ...withPerf, narrative, recommendations, severity };
    });

    res.json({ insights, summaries: enrichedSummaries });
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute insights' });
  }
}

async function getActions(_req, res) {
  try {
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
    });
    const flows = groupFlows(runs);
    const summaries = flows.map((f) => {
      const base = summarizeFlow(f);
      const workflow = identifyWorkflow(base);
      return { ...base, ...workflow };
    });
    const insights = computeInsightsExtended(summaries);
    const avgDuration =
      summaries.map((s) => s.duration).filter(Boolean).reduce((a, b) => a + b, 0) /
      (summaries.map((s) => s.duration).filter(Boolean).length || 1);
    const enrichedSummaries = summaries.map((s) => {
      const withPerf = addPerformanceFlag(s, avgDuration);
      const narrative = generateNarrative(withPerf);
      const recommendations = generateRecommendations(withPerf, insights);
      const severity = computeSeverity(withPerf, insights);
      return { ...withPerf, narrative, recommendations, severity };
    });

    const actions = aggregateActions(enrichedSummaries, insights);
    const system_health = computeSystemHealth(actions, insights);
    res.json({ system_health, actions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute actions' });
  }
}

module.exports = { getFlows, getFlowSummaries, getInsights, getActions };
