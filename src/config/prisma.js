// Ensure environment variables are loaded before Prisma initializes
const config = require('./env');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Prisma 7 uses driver adapters for direct DB access
const pool = new Pool({ connectionString: config.databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function connectDB() {
  try {
    await prisma.$connect();
    // Connection successful
  } catch (err) {
    console.error('Failed to connect to the database', err);
    throw err;
  }
}

module.exports = { prisma, connectDB };
