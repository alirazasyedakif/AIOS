import React, { useState } from 'react';
import { createProject } from '../services/api';

export default function CreateProject({ onCreated, onGotoExecution, defaultCreator, lastResult }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [createdBy, setCreatedBy] = useState(defaultCreator || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdSummary, setCreatedSummary] = useState(lastResult || null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name || !description || !createdBy) {
      setError('Please fill name, description, and creator ID (UUID).');
      return;
    }
    setLoading(true);
    try {
      const result = await createProject({ name, description, status, created_by: createdBy });
      setLoading(false);
      setCreatedSummary(result);
      if (onCreated) onCreated(result);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to create project');
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', color: '#e2e8f0' }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Create Project</h2>
      <p style={{ color: '#94a3b8', marginBottom: 16 }}>
        Enter a high-level request. We will auto-generate starter tasks and push them into the execution engine.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Project Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #1f2937', background: '#0f172a', color: '#e2e8f0' }}
            placeholder="AI Task Manager"
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #1f2937', background: '#0f172a', color: '#e2e8f0' }}
            placeholder="Build a task manager with automation and UI"
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Creator ID (UUID)</span>
          <input
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #1f2937', background: '#0f172a', color: '#e2e8f0' }}
            placeholder="user UUID"
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #1f2937', background: '#0f172a', color: '#e2e8f0' }}
          >
            <option value="active">active</option>
            <option value="on_hold">on_hold</option>
            <option value="archived">archived</option>
          </select>
        </label>
        {error && <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #16a34a',
            background: loading ? '#16a34a55' : '#16a34a',
            color: '#0b1120',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Creating…' : 'Create Project'}
        </button>
      </form>

      {createdSummary && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 12,
            border: '1px solid #16a34a55',
            background: '#0d1a2e',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{createdSummary.project.name}</div>
              <div style={{ color: '#93a3b8', fontSize: 13 }}>
                Status: {createdSummary.project.status} • Tasks created: {createdSummary.tasks.length}
              </div>
            </div>
            <button
              type="button"
              onClick={onGotoExecution}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #22c55e',
                background: '#16a34a33',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              View in Execution
            </button>
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {createdSummary.tasks.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #1f2937',
                  background: '#0f172a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <span style={{ color: '#e2e8f0' }}>{t.title}</span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
