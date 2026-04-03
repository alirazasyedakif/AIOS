const express = require('express');
const { getExecutions, getActiveExecutions } = require('./system.controller');
const { getFlows, getFlowSummaries, getInsights, getActions } = require('./system.flows.controller');

const router = express.Router();

router.get('/executions', getExecutions);
router.get('/executions/active', getActiveExecutions);
router.get('/flows', getFlows);
router.get('/flows/summary', getFlowSummaries);
router.get('/insights', getInsights);
router.get('/actions', getActions);

module.exports = router;
