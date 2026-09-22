import { getDatabaseStatus, DatabaseStatus } from '../config/database';
import { env } from '../config/env';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  database: DatabaseStatus;
  version: string;
}

export class HealthService {
  public static getHealth(): HealthCheckResult {
    const dbStatus = getDatabaseStatus();
    const isDegraded = dbStatus.status !== 'connected';

    return {
      status: isDegraded ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: env.NODE_ENV,
      database: dbStatus,
      version: '0.1.0',
    };
  }
}
