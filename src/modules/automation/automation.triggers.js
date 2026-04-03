const EVENTS = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_OVERDUE: 'TASK_OVERDUE',
  LEASE_EXPIRING: 'LEASE_EXPIRING',
};

// Return a list of actions with context that should run for a given event
function evaluateTriggers(eventType, payload) {
  const actions = [];

  switch (eventType) {
    case EVENTS.TASK_CREATED:
      actions.push({ type: 'notify_user', data: { reason: 'Task created', task: payload.task } });
      break;
    case EVENTS.TASK_UPDATED:
      actions.push({ type: 'notify_user', data: { reason: 'Task updated', task: payload.task } });
      break;
    case EVENTS.TASK_OVERDUE:
      actions.push({ type: 'notify_user', data: { reason: 'Task overdue', task: payload.task } });
      break;
    case EVENTS.LEASE_EXPIRING:
      actions.push({ type: 'notify_user', data: { reason: 'Lease expiring', lease: payload.lease } });
      break;
    default:
      break;
  }

  return actions;
}

module.exports = { EVENTS, evaluateTriggers };
