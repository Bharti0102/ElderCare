import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { getHealthStatus } from '../../services/api';
import { HealthData } from '../../types';

export const Shell: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await getHealthStatus();
      setHealth(data);
      setServerStatus('online');
    } catch (err) {
      console.warn('Backend health check error:', err);
      setServerStatus('offline');
      setHealth(null);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Poll health every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        serverStatus={serverStatus}
        databaseStatus={health?.database}
        onRefreshHealth={fetchHealth}
        isRefreshingHealth={isRefreshing}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet context={{ health, serverStatus, refetchHealth: fetchHealth }} />
      </main>
      <Footer />
    </div>
  );
};
