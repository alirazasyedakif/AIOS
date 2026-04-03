const { prisma } = require('../../config/prisma');
const { ActivityAction } = require('@prisma/client');
const { isUuid } = require('../../utils/validation');

async function logActivity({ taskId, action, metadata = {} }) {
  if (!isUuid(taskId)) {
    throw new Error('Invalid taskId for activity log');
  }

  if (!Object.values(ActivityAction).includes(action)) {
    throw new Error('Invalid activity action');
  }

  await prisma.activityLog.create({
    data: {
      taskId,
      action,
      metadata,
    },
  });
}

module.exports = { logActivity };
