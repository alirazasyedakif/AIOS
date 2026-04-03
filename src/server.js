const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const { connectDB } = require('./config/prisma');
const taskRoutes = require('./modules/task/task.routes');
const projectRoutes = require('./modules/project/project.routes');
const { startAutomationRunner } = require('./modules/automation/automation.runner');
const systemRoutes = require('./modules/system/system.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

app.use('/tasks', taskRoutes);
app.use('/projects', projectRoutes);
app.use('/system', systemRoutes);

async function start() {
  try {
    await connectDB();
    startAutomationRunner();
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (err) {
    console.error('Startup failed', err);
    process.exit(1);
  }
}

start();

module.exports = app;
