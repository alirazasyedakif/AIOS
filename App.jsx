import React, { useEffect, useState, useRef } from 'react';
import AgentGroup from './components/AgentGroup';
import OfficeView from './components/OfficeView';
import FlowSummaryPanel from './components/FlowSummaryPanel';
import InsightsPanel from './components/InsightsPanel';
import ActionPanel from './components/ActionPanel';
import CreateProject from './pages/CreateProject';
import {
  fetchActiveExecutions,
  fetchExecutions,
  fetchFlowSummaries,
  fetchInsights,
  fetchActions,
} from './services/api';

const POLL_MS = 4000;
const TICK_MS = 1000;

const AGENT_LABELS = {
  automation_runner: 'Scheduler',
  task_service: 'Task Executor',
  automation: 'Rule Engine',
};

function groupByAgentType(runs) {
  return runs.reduce((acc, run) => {
    if (!acc[run.agentType]) acc[run.agentType] = [];
    acc[run.agentType].push(run);
    return acc;
  }, {});
}

export default function App() {
  const [activeRuns, setActiveRuns] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [meta, setMeta] = useState({ total: 0, active_count: 0 });
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState('office'); // 'list' | 'office' | 'create'
  const [selectedRun, setSelectedRun] = useState(null);
  const [flowSummaries, setFlowSummaries] = useState([]);
  const [insights, setInsights] = useState(null);
  const [actions, setActions] = useState({ system_health: 'healthy', actions: [] });
  const [showPanels, setShowPanels] = useState(false);
  const [lastProjectResult, setLastProjectResult] = useState(null);
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const load = async () => {
    try {
      const [activeRes, allRes] = await Promise.all([fetchActiveExecutions(), fetchExecutions()]);
      const activeData = activeRes.data || [];
      const allData = allRes.data || [];
      setActiveRuns(activeData);
      setRecentRuns(allData.slice(0, 24));
      setMeta({
        total: allRes.meta?.total ?? allData.length,
        active_count: activeRes.meta?.active_count ?? activeData.length,
      });
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load');
    }
  };

  const loadSummaries = async () => {
    try {
      const [summaryRes, insightRes, actionRes] = await Promise.all([
        fetchFlowSummaries(),
        fetchInsights(),
        fetchActions(),
      ]);
      const normalizedInsights = insightRes?.insights || insightRes || null;
      const normalizedSummaries =
        Array.isArray(summaryRes) && summaryRes.length > 0 ? summaryRes : insightRes?.summaries || [];
      setFlowSummaries(normalizedSummaries);
      setInsights(normalizedInsights);
      setActions(actionRes || { system_health: 'healthy', actions: [] });
    } catch (_err) {
      // keep UI alive even if side panels fail
    }
  };

  useEffect(() => {
    load();
    loadSummaries();
    pollRef.current = setInterval(load, POLL_MS);
    const summaryInterval = setInterval(loadSummaries, POLL_MS);
    tickRef.current = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(summaryInterval);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const displayRuns = activeRuns.length > 0 ? activeRuns : recentRuns;
  const grouped = groupByAgentType(displayRuns);
  const failedCount = displayRuns.filter((r) => r.status === 'failed').length;
  const showingRecent = activeRuns.length === 0 && recentRuns.length > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 20% 0%, rgba(30,64,175,0.18) 0%, rgba(11,18,32,1) 42%), radial-gradient(circle at 90% 20%, rgba(14,116,144,0.16) 0%, rgba(11,18,32,0.95) 38%), #0b1220',
        color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '24px',
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Agent Execution View</h1>
        <div style={{ marginTop: 8, display: 'flex', gap: 14, fontSize: 14, alignItems: 'center' }}>
          <span>Total: {meta.total}</span>
          <span>Active: {meta.active_count}</span>
          <span style={{ color: '#f87171' }}>Failed: {failedCount}</span>
          <span>Auto-refresh: {POLL_MS / 1000}s</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: view === 'list' ? '1px solid #22c55e' : '1px solid #1f2937',
                background: view === 'list' ? '#16a34a33' : '#111827',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              List View
            </button>
            <button
              onClick={() => setView('office')}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: view === 'office' ? '1px solid #22c55e' : '1px solid #1f2937',
                background: view === 'office' ? '#16a34a33' : '#111827',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              Office View
            </button>
            <button
              onClick={() => setShowPanels((v) => !v)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: showPanels ? '1px solid #22c55e' : '1px solid #1f2937',
                background: showPanels ? '#16a34a33' : '#111827',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              {showPanels ? 'Hide Panels' : 'Show Panels'}
            </button>
            <button
              onClick={() => setView('create')}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: view === 'create' ? '1px solid #22c55e' : '1px solid #1f2937',
                background: view === 'create' ? '#16a34a33' : '#111827',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              Create Project
            </button>
          </div>
        </div>
        {showingRecent && (
          <div style={{ marginTop: 6, color: '#93c5fd', fontSize: 13 }}>
            No active executions right now. Showing recent runs.
          </div>
        )}
        {error && <div style={{ color: '#f87171', marginTop: 8 }}>{error}</div>}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: showPanels ? '2.6fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        <div>
          {view === 'create' ? (
            <CreateProject
              defaultCreator={activeRuns[0]?.createdById || ''}
              onCreated={(result) => {
                setLastProjectResult(result);
                load();
              }}
              onGotoExecution={() => setView('office')}
              lastResult={lastProjectResult}
            />
          ) : view === 'list' ? (
            displayRuns.length === 0 ? (
              <div style={{ marginTop: 40, fontSize: 16, color: '#94a3b8' }}>
                No executions yet. Office View still shows standby bots.
              </div>
            ) : (
              Object.keys(grouped).map((agentType) => (
                <AgentGroup
                  key={agentType}
                  label={AGENT_LABELS[agentType] || agentType}
                  runs={grouped[agentType]}
                  now={now}
                  agentLabels={AGENT_LABELS}
                  onSelect={(run) => setSelectedRun(run)}
                />
              ))
            )
          ) : (
            <OfficeView
              activeRuns={activeRuns}
              now={now}
              agentLabels={AGENT_LABELS}
              selectedRunId={selectedRun?.id || null}
              selectedTaskId={selectedRun?.taskId || null}
              onSelect={(run) => setSelectedRun(run)}
            />
          )}
        </div>
        {showPanels && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InsightsPanel insights={insights} />
            <FlowSummaryPanel
              summary={
                selectedRun
                  ? flowSummaries.find((f) => f.runs?.some((r) => r.id === selectedRun.id)) || null
                  : null
              }
            />
            <ActionPanel systemHealth={actions.system_health} actions={actions.actions} />
          </div>
        )}
      </div>
    </div>
  );
}
