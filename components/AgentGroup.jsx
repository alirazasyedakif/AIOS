import React from 'react';
import AgentCard from './AgentCard';

export default function AgentGroup({ label, runs, now, agentLabels, onSelect }) {
  if (!runs || runs.length === 0) return null;
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>{label}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {runs.map((run) => (
          <AgentCard
            key={run.id}
            run={run}
            now={now}
            label={agentLabels[run.agentType] || run.agentType}
            onClick={() => onSelect?.(run)}
          />
        ))}
      </div>
    </section>
  );
}
