import React, { useMemo, useState } from 'react';

const statusColors = {
  running: '#16a34a',
  completed: '#6b7280',
  failed: '#dc2626',
};

function formatDate(val) {
  if (!val) return '-';
  const d = new Date(val);
  return d.toLocaleString();
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '-';
  const sec = Math.floor(ms / 1000);
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${sec}s`;
}

export default function AgentCard({ run, now, label, onClick }) {
  const [expanded, setExpanded] = useState(false);
  const durationMs = useMemo(() => {
    const start = new Date(run.startedAt).getTime();
    const end = run.finishedAt ? new Date(run.finishedAt).getTime() : now;
    return end - start;
  }, [run.startedAt, run.finishedAt, now]);

  const color = statusColors[run.status] || '#6b7280';
  const failed = run.status === 'failed';

  return (
    <div
      onClick={() => {
        setExpanded((v) => !v);
        onClick?.();
      }}
      style={{
        border: `2px solid ${color}`,
        borderRadius: 10,
        padding: 12,
        background: '#0f172a',
        color: '#e2e8f0',
        minWidth: 240,
        boxShadow: failed ? '0 6px 18px rgba(220,38,38,0.35)' : '0 4px 12px rgba(0,0,0,0.25)',
        transform: failed ? 'scale(1.02)' : 'scale(1)',
        cursor: 'pointer',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>{label || run.agentType}</span>
        <span style={{ color, fontWeight: 800, textTransform: 'uppercase', fontSize: 12 }}>
          {failed ? 'FAILED' : run.status}
        </span>
      </div>
      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
        <div>Task: {run.taskId || '—'}</div>
        <div>Event: {run.eventType || '—'}</div>
        <div>Duration: {formatDuration(durationMs)}</div>
      </div>
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #1e293b', fontSize: 13, lineHeight: 1.4 }}>
          <div>Started: {formatDate(run.startedAt)}</div>
          <div>Finished: {run.finishedAt ? formatDate(run.finishedAt) : '—'}</div>
          <div style={{ marginTop: 6, color: '#cbd5e1' }}>Metadata:</div>
          <pre
            style={{
              background: '#111827',
              color: '#e2e8f0',
              padding: 8,
              borderRadius: 6,
              overflow: 'auto',
              maxHeight: 180,
              fontSize: 12,
            }}
          >
            {JSON.stringify(run.metadata || {}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
