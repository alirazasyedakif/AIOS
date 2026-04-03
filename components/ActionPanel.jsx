import React from 'react';

const colors = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#34d399',
};

export default function ActionPanel({ systemHealth, actions }) {
  const healthColor = systemHealth === 'critical' ? colors.high : systemHealth === 'degraded' ? colors.medium : colors.low;
  return (
    <div style={{ padding: 12, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 800 }}>Action Center</span>
        <span style={{ color: healthColor, fontWeight: 700, textTransform: 'uppercase' }}>{systemHealth || 'healthy'}</span>
      </div>
      {(!actions || actions.length === 0) ? (
        <div style={{ color: '#94a3b8' }}>No urgent actions.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actions.map((a, idx) => (
            <div
              key={idx}
              style={{
                border: `1px solid ${colors[a.priority] || '#1f2937'}`,
                borderRadius: 8,
                padding: 10,
                background: '#0b1729',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ color: colors[a.priority] || '#e2e8f0', fontWeight: 700, marginBottom: 4 }}>
                {a.priority.toUpperCase()} — {a.issue}
              </div>
              <div style={{ fontSize: 14, color: '#e2e8f0' }}>{a.recommendation}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{a.affected_flows} flows affected</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
