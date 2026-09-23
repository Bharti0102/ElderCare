import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { ReminderScheduler } from './services/reminder/reminder.scheduler';

const startServer = async (): Promise<void> => {
  // Connect to MongoDB
  await connectDatabase();

  // Start background reminder scheduler
  ReminderScheduler.start(30000);

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`===============================================`);
    console.log(`ElderCare AI Server running in ${env.NODE_ENV} mode`);
    console.log(`Listening on: http://localhost:${env.PORT}`);
    console.log(`Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`===============================================`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    ReminderScheduler.stop();
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDatabase();
      console.log('Database connection closed.');
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('Forcefully terminating server.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
