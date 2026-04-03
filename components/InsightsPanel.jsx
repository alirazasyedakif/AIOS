import React from 'react';

function formatPct(val) {
  if (val == null) return '-';
  return `${Math.round(val * 100)}%`;
}

function formatDuration(ms) {
  if (!ms) return '-';
  const sec = Math.floor(ms / 1000);
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${sec}s`;
}

export default function InsightsPanel({ insights }) {
  return (
    <div style={{ padding: 12, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>System Insights</div>
      {!insights ? (
        <div style={{ color: '#94a3b8' }}>Loading…</div>
      ) : (
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <div>Total flows: {insights.total_flows}</div>
          <div>Success rate: {formatPct(insights.success_rate)}</div>
          <div>Failure rate: {formatPct(insights.failure_rate)}</div>
          <div>Avg duration: {formatDuration(insights.avg_duration)}</div>
          <div>Bottleneck agent: {insights.bottleneck_agent || '—'}</div>
          <div>Most active agent: {insights.most_active_agent || '—'}</div>
          <div>Recurring failures: {insights.recurring_failure_agent || '—'}</div>
          <div>Slowest flow: {insights.slowest_flow_type || '—'}</div>
          <div>Problem workflow: {insights.most_problematic_workflow || '—'}</div>
        </div>
      )}
    </div>
  );
}
