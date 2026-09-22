import React from 'react';
import { DatabaseStatus } from '../../types';
import { Database, Server, RefreshCw } from 'lucide-react';

interface StatusBadgeProps {
  serverStatus: 'online' | 'offline' | 'checking';
  databaseStatus?: DatabaseStatus;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  serverStatus,
  databaseStatus,
  onRefresh,
  isRefreshing,
}) => {
  const isDbConnected = databaseStatus?.status === 'connected';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Backend API Pill */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border ${
          serverStatus === 'online'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : serverStatus === 'checking'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}
      >
        <Server className="w-3.5 h-3.5" />
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              serverStatus === 'online'
                ? 'bg-emerald-500 animate-pulse'
                : serverStatus === 'checking'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
          Server: {serverStatus === 'online' ? 'Online' : serverStatus === 'checking' ? 'Checking...' : 'Offline'}
        </span>
      </div>

      {/* Database Pill */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border ${
          isDbConnected
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}
      >
        <Database className="w-3.5 h-3.5" />
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isDbConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          DB: {databaseStatus?.status ? databaseStatus.status.toUpperCase() : 'UNKNOWN'}
        </span>
      </div>

      {/* Manual Health Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh health status"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
          aria-label="Refresh Status"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-600' : ''}`} />
        </button>
      )}
    </div>
  );
};
