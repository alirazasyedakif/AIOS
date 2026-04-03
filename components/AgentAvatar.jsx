import React, { useMemo, useState } from 'react';

const STATUS_COLORS = {
  running: '#22c55e',
  completed: '#94a3b8',
  failed: '#ef4444',
  idle: '#64748b',
};

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const sec = Math.floor(ms / 1000);
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${sec}s`;
}

function computeEta(run, elapsedMs) {
  if (run.status !== 'running') return null;
  const elapsedMins = Math.floor(elapsedMs / 60000);
  const etaMins = Math.max(1, 4 - elapsedMins);
  return `${etaMins}m`;
}

function buildChatMessage(run, roomName, elapsedMs) {
  if (run.status === 'running') {
    const eta = computeEta(run, elapsedMs);
    const topic = run.eventType || 'task execution';
    return `Working on ${topic}. ETA ~${eta}. Quick stretch after this.`;
  }
  if (run.status === 'failed') {
    const topic = run.eventType || 'workflow';
    return `Blocked on ${topic}. Escalating for review.`;
  }
  if (run.status === 'completed') {
    return `Finished my last run. Standing by in ${roomName}.`;
  }
  return `Taking a short break in ${roomName}. Ready when needed.`;
}

function getPattern(agentType) {
  const base = {
    scheduler: [
      '..xxxx..',
      '.x....x.',
      'x..xx..x',
      'x.x..x.x',
      'x.x..x.x',
      'x..xx..x',
      '.x....x.',
      '..x..x..',
    ],
    task: [
      '..xxxx..',
      '.x....x.',
      'x..xx..x',
      'x.x..x.x',
      'x..xx..x',
      'x.x..x.x',
      '.x....x.',
      '..x..x..',
    ],
    rule: [
      '..xxxx..',
      '.x....x.',
      'x.xxxx.x',
      'x.x..x.x',
      'x.x..x.x',
      'x.xxxx.x',
      '.x....x.',
      '..x..x..',
    ],
    idle: [
      '..xxxx..',
      '.x....x.',
      'x..xx..x',
      'x......x',
      'x..xx..x',
      'x......x',
      '.x....x.',
      '..x..x..',
    ],
  };

  if (agentType === 'automation_runner') return base.scheduler;
  if (agentType === 'task_service') return base.task;
  if (agentType === 'automation') return base.rule;
  return base.idle;
}

export default function AgentAvatar({ run, label, now, roomName, onClick, highlighted }) {
  const [hovered, setHovered] = useState(false);
  const startedAtMs = run.startedAt ? new Date(run.startedAt).getTime() : now;
  const finishedAtMs = run.finishedAt ? new Date(run.finishedAt).getTime() : null;
  const elapsedMs = (finishedAtMs || now) - startedAtMs;
  const statusColor = STATUS_COLORS[run.status] || STATUS_COLORS.idle;
  const chatMessage = useMemo(
    () => buildChatMessage(run, roomName, elapsedMs),
    [run, roomName, elapsedMs]
  );
  const pattern = getPattern(run.agentType);
  const statusText = run.status ? run.status.toUpperCase() : 'IDLE';
  const animated = run.status === 'running' || run.status === 'failed';

  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: 'relative',
        border: highlighted ? '2px solid #22c55e' : '1px solid #1f2937',
        background: '#0b1220',
        borderRadius: 10,
        width: 94,
        minHeight: 128,
        padding: 8,
        color: '#e2e8f0',
        cursor: 'pointer',
        boxShadow: highlighted
          ? '0 0 18px rgba(34,197,94,0.45)'
          : '0 8px 14px rgba(2,6,23,0.35)',
        transform: run.status === 'failed' ? 'scale(1.02)' : 'scale(1)',
      }}
      title={`${label}\n${statusText}\nTask: ${run.taskId || '—'}\nEvent: ${run.eventType || '—'}\nDuration: ${formatDuration(elapsedMs)}`}
    >
      <div
        style={{
          width: 64,
          height: 64,
          margin: '0 auto 8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 1,
          padding: 4,
          borderRadius: 6,
          border: `1px solid ${statusColor}44`,
          background: '#020617',
          imageRendering: 'pixelated',
          animation:
            animated && !hovered
              ? run.status === 'failed'
                ? 'bot-shake 0.35s linear infinite'
                : 'bot-bob 1.3s ease-in-out infinite'
              : 'none',
          animationPlayState: hovered ? 'paused' : 'running',
        }}
      >
        {pattern.join('').split('').map((cell, idx) => (
          <span
            key={`${run.id}-${idx}`}
            style={{
              width: 6,
              height: 6,
              background: cell === 'x' ? statusColor : 'transparent',
              borderRadius: 1,
            }}
          />
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: 10, color: '#93a3b8', marginTop: 2 }}>{statusText}</div>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '100%',
            transform: 'translateX(-50%)',
            width: 210,
            marginBottom: 10,
            background: '#111827',
            color: '#e5e7eb',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: 8,
            fontSize: 12,
            lineHeight: 1.35,
            textAlign: 'left',
            boxShadow: '0 8px 20px rgba(2,6,23,0.5)',
            zIndex: 20,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div>{chatMessage}</div>
          <div style={{ marginTop: 4, color: '#93c5fd' }}>Elapsed: {formatDuration(elapsedMs)}</div>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid #111827',
            }}
          />
        </div>
      )}

      <style>
        {`
          @keyframes bot-bob {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-2px); }
            100% { transform: translateY(0px); }
          }
          @keyframes bot-shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-1px); }
            50% { transform: translateX(1px); }
            75% { transform: translateX(-1px); }
            100% { transform: translateX(0); }
          }
        `}
      </style>
    </button>
  );
}
