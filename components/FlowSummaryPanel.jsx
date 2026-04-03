import React from 'react';

function formatDuration(ms) {
  if (ms == null) return '-';
  const sec = Math.floor(ms / 1000);
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${sec}s`;
}

export default function FlowSummaryPanel({ summary }) {
  if (!summary) {
    return (
      <div style={{ padding: 12, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, color: '#94a3b8' }}>
        Select an agent to see flow details
      </div>
    );
  }

  const outcomeColor =
    summary.outcome === 'failed' ? '#f87171' : summary.outcome === 'incomplete' ? '#fbbf24' : '#34d399';
  const performanceColor = summary.performance === 'below_average' ? '#fbbf24' : '#34d399';
  const severityColor =
    summary.severity === 'high' ? '#f87171' : summary.severity === 'medium' ? '#fbbf24' : '#34d399';

  return (
    <div style={{ padding: 12, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 800 }}>{summary.workflow_name || 'Flow Summary'}</div>
        <div style={{ color: severityColor, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
          {summary.severity || 'low'}
        </div>
      </div>
      <div style={{ marginBottom: 8, color: outcomeColor, fontWeight: 700 }}>{summary.narrative}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        <div>Outcome: <span style={{ color: outcomeColor }}>{summary.outcome}</span></div>
        <div>Performance: <span style={{ color: performanceColor }}>{summary.performance || 'unknown'}</span></div>
        <div>Steps: {summary.total_steps}</div>
        <div>Duration: {formatDuration(summary.duration)}</div>
        <div>Agents: {summary.involved_agents.join(', ')}</div>
        {summary.failure_point && (
          <div style={{ marginTop: 6 }}>
            Failure at {summary.failure_point.agent_type} / {summary.failure_point.event_type || 'n/a'}
          </div>
        )}
        {summary.recommendations?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Recommendations</div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {summary.recommendations.map((r, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
