import React, { useMemo } from 'react';
import AgentAvatar from './AgentAvatar';

// Scaled-down avatars for dense floorplan view
const AVATAR_SCALE = 0.78;

// Single-floor layout: bounds are percentages of the canvas
const ROOMS = [
  {
    id: 'desk_bay',
    name: 'Desk Bay',
    subtitle: 'Core execution desks',
    decor: 'Monitors | Desks | Workstations',
    type: 'work',
    accent: '#38bdf8',
    bounds: { left: 1.5, top: 6, width: 48, height: 40 },
    seats: [
      { id: 'd1', x: 12, y: 26 },
      { id: 'd2', x: 28, y: 26 },
      { id: 'd3', x: 44, y: 26 },
      { id: 'd4', x: 60, y: 26 },
      { id: 'd5', x: 76, y: 26 },
      { id: 'd6', x: 12, y: 62 },
      { id: 'd7', x: 28, y: 62 },
      { id: 'd8', x: 44, y: 62 },
      { id: 'd9', x: 60, y: 62 },
      { id: 'd10', x: 76, y: 62 },
    ],
  },
  {
    id: 'cabins',
    name: 'Cabins',
    subtitle: 'Focused deep work',
    decor: 'Sound-treated | Heads-down',
    type: 'work',
    accent: '#2563eb',
    bounds: { left: 52, top: 6, width: 23, height: 24 },
    seats: [
      { id: 'c1', x: 28, y: 28 },
      { id: 'c2', x: 72, y: 28 },
      { id: 'c3', x: 28, y: 72 },
      { id: 'c4', x: 72, y: 72 },
    ],
  },
  {
    id: 'meeting_room',
    name: 'Meeting Room',
    subtitle: 'Coordination and handoffs',
    decor: 'Table | Screen | Whiteboard',
    type: 'work',
    accent: '#0ea5e9',
    bounds: { left: 76, top: 6, width: 22, height: 24 },
    seats: [
      { id: 'm1', x: 50, y: 18 },
      { id: 'm2', x: 22, y: 42 },
      { id: 'm3', x: 78, y: 42 },
      { id: 'm4', x: 30, y: 74 },
      { id: 'm5', x: 70, y: 74 },
      { id: 'm6', x: 50, y: 54 },
    ],
  },
  {
    id: 'break_area',
    name: 'Break Area',
    subtitle: 'PlayStation + lounge',
    decor: 'PS5 | Bean bags',
    type: 'idle',
    accent: '#22c55e',
    bounds: { left: 1.5, top: 50, width: 30, height: 32 },
    seats: [
      { id: 'b1', x: 26, y: 46 },
      { id: 'b2', x: 58, y: 62 },
      { id: 'b3', x: 76, y: 36 },
    ],
  },
  {
    id: 'green_room',
    name: 'Green Room',
    subtitle: 'Plants and cool-down',
    decor: 'Plants | Low-noise zone',
    type: 'idle',
    accent: '#10b981',
    bounds: { left: 34, top: 50, width: 18, height: 32 },
    seats: [
      { id: 'g1', x: 32, y: 28 },
      { id: 'g2', x: 66, y: 52 },
      { id: 'g3', x: 46, y: 74 },
    ],
  },
  {
    id: 'pantry',
    name: 'Pantry',
    subtitle: 'Coffee and snacks',
    decor: 'Coffee | Fridge',
    type: 'idle',
    accent: '#f59e0b',
    bounds: { left: 54, top: 35, width: 20, height: 24 },
    seats: [
      { id: 'p1', x: 24, y: 64 },
      { id: 'p2', x: 56, y: 42 },
      { id: 'p3', x: 82, y: 62 },
    ],
  },
  {
    id: 'water_cooler',
    name: 'Water Cooler',
    subtitle: 'Quick reset zone',
    decor: 'Cooler | Quick chats',
    type: 'idle',
    accent: '#38bdf8',
    bounds: { left: 76, top: 35, width: 22, height: 22 },
    seats: [
      { id: 'w1', x: 34, y: 52 },
      { id: 'w2', x: 70, y: 68 },
    ],
  },
  {
    id: 'washrooms',
    name: 'Washrooms',
    subtitle: 'Away briefly',
    decor: 'Occupied | Available',
    type: 'idle',
    accent: '#94a3b8',
    bounds: { left: 76, top: 59, width: 22, height: 23 },
    seats: [
      { id: 'wsh1', x: 32, y: 56 },
      { id: 'wsh2', x: 70, y: 56 },
    ],
  },
];

function buildSyntheticIdleAgents(count) {
  return Array.from({ length: count }).map((_, idx) => ({
    id: `synthetic-idle-${idx}`,
    agentType: idx % 3 === 0 ? 'task_service' : idx % 3 === 1 ? 'automation' : 'automation_runner',
    status: 'idle',
    taskId: null,
    eventType: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    synthetic: true,
  }));
}

function pickSeatLists() {
  const seats = [];
  ROOMS.forEach((room) => {
    room.seats.forEach((seat) => {
      seats.push({ ...seat, roomId: room.id, seatType: room.type, room });
    });
  });
  return seats;
}

function assignRunsToSeats(activeRuns) {
  const seats = pickSeatLists();
  const workSeats = seats.filter((s) => s.seatType === 'work');
  const idleSeats = seats.filter((s) => s.seatType === 'idle');

  const assignments = {};
  const active = activeRuns || [];

  // Place active runs into work seats first, then spill into idle seats if needed
  active.forEach((run, idx) => {
    const seat = workSeats[idx] || idleSeats[idx - workSeats.length];
    if (seat) {
      assignments[`${seat.roomId}-${seat.id}`] = run;
    }
  });

  const filledSeats = new Set(Object.keys(assignments));
  const remainingSeats = seats.filter((s) => !filledSeats.has(`${s.roomId}-${s.id}`));
  const syntheticTarget = Math.min(
    remainingSeats.length,
    Math.max(12, Math.round(seats.length * 0.7) - active.length)
  );
  const syntheticIdle = buildSyntheticIdleAgents(syntheticTarget);

  remainingSeats.slice(0, syntheticTarget).forEach((seat, idx) => {
    const run = syntheticIdle[idx];
    if (run) {
      assignments[`${seat.roomId}-${seat.id}`] = run;
    }
  });

  // Group by room for render
  const perRoom = {};
  seats.forEach((seat) => {
    const key = `${seat.roomId}-${seat.id}`;
    if (!assignments[key]) return;
    if (!perRoom[seat.roomId]) perRoom[seat.roomId] = [];
    perRoom[seat.roomId].push({ run: assignments[key], seat });
  });

  return perRoom;
}

function Room({ room, occupants, now, agentLabels, selectedRunId, selectedTaskId, onSelect }) {
  const count = occupants.length;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${room.bounds.left}%`,
        top: `${room.bounds.top}%`,
        width: `${room.bounds.width}%`,
        height: `${room.bounds.height}%`,
        border: `1px solid ${room.accent}44`,
        borderRadius: 14,
        background:
          'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.05), transparent 26%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.04), transparent 30%), linear-gradient(135deg, #0d1424 0%, #0a0f1c 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02), 0 10px 24px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '10px 12px 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{room.name}</div>
          <div style={{ fontSize: 11, color: '#8ea0be', marginTop: 2 }}>{room.subtitle}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{room.decor}</div>
        </div>
        <div style={{ fontSize: 11, color: room.accent, fontWeight: 700 }}>{count} agents</div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 12,
          borderRadius: 10,
          background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03), transparent 55%)',
        }}
      >
        {occupants.map(({ run, seat }) => {
          const label = agentLabels[run.agentType] || run.agentType;
          return (
            <div
              key={`${seat.roomId}-${seat.id}`}
              style={{
                position: 'absolute',
                left: `${seat.x}%`,
                top: `${seat.y}%`,
                transform: `translate(-50%, -50%) scale(${AVATAR_SCALE})`,
                transformOrigin: 'top left',
              }}
            >
              <AgentAvatar
                run={run}
                now={now}
                label={label}
                roomName={room.name}
                highlighted={
                  run.id === selectedRunId || (selectedTaskId && run.taskId && run.taskId === selectedTaskId)
                }
                onClick={() => {
                  if (run.synthetic) {
                    onSelect?.(null);
                  } else {
                    onSelect?.(run);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OfficeView({ activeRuns, now, agentLabels, onSelect, selectedRunId, selectedTaskId }) {
  const roomAssignments = useMemo(() => assignRunsToSeats(activeRuns), [activeRuns]);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 720,
        borderRadius: 18,
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, rgba(16,24,40,0.72), rgba(10,15,28,0.9)), radial-gradient(circle at 4% 10%, rgba(34,197,94,0.06), transparent 32%), radial-gradient(circle at 90% 8%, rgba(56,189,248,0.08), transparent 32%)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        padding: 12,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundSize: '26px 26px',
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px)',
          pointerEvents: 'none',
        }}
      />

      {ROOMS.map((room) => (
        <Room
          key={room.id}
          room={room}
          occupants={roomAssignments[room.id] || []}
          now={now}
          agentLabels={agentLabels}
          selectedRunId={selectedRunId}
          selectedTaskId={selectedTaskId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
