const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the project root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  nodeEnv: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl: process.env.DATABASE_URL,
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is not set. Please define it in .env');
}

module.exports = config;
