import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'financial_intelligence',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  },
  
  research: {
    scheduleMinutes: parseInt(process.env.RESEARCH_SCHEDULE_MINUTES, 10) || 60,
    scheduleEnabled: process.env.RESEARCH_SCHEDULE_ENABLED !== 'false',
    timeoutMs: parseInt(process.env.RESEARCH_TIMEOUT_MS, 10) || 10000,
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3
  },
  
  security: {
    writeApiKey: process.env.WRITE_API_KEY || 'dev-secret-tracker-2026'
  }
};
