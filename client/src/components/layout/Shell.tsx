import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { getHealthStatus } from '../../services/api';
import { getDueReminders, completeReminder } from '../../services/reminder.service';
import {
  getVoiceSettings,
  announceDueReminders,
  speakText,
} from '../../services/voiceNotification.service';
import { HealthData, Reminder } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Volume2, ArrowRight, Check, X } from 'lucide-react';
import { FloatingVoiceAssistant } from '../voice/FloatingVoiceAssistant';

export const Shell: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Global Due Reminders
  const [globalDue, setGlobalDue] = useState<Reminder[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastAnnouncedDueRef = useRef<string>('');

  const fetchHealth = useCallback(async () => {
    try {
      const data = await getHealthStatus();
      setHealth(data);
      setServerStatus('online');
    } catch (err) {
      console.warn('Backend health check error:', err);
      setServerStatus('offline');
      setHealth(null);
    }
  }, []);

  const checkGlobalDueReminders = useCallback(async () => {
    if (!user) {
      setGlobalDue([]);
      return;
    }
    try {
      const due = await getDueReminders();
      setGlobalDue(due);

      // If user is NOT on the reminders page, announce newly due reminders
      if (due.length > 0 && location.pathname !== '/reminders') {
        const dueIds = due.map((r) => r._id).sort().join(',');
        if (dueIds !== lastAnnouncedDueRef.current) {
          lastAnnouncedDueRef.current = dueIds;
          setIsDismissed(false); // reopen banner if new due reminders arrive
          const voice = getVoiceSettings();
          if (voice.enabled && voice.autoAnnounceDue) {
            announceDueReminders(due);
          }
        }
      }
    } catch {
      // silent background check
    }
  }, [user, location.pathname]);

  useEffect(() => {
    fetchHealth();
    checkGlobalDueReminders();

    const healthInterval = setInterval(fetchHealth, 30000);
    const dueInterval = setInterval(checkGlobalDueReminders, 30000);

    return () => {
      clearInterval(healthInterval);
      clearInterval(dueInterval);
    };
  }, [fetchHealth, checkGlobalDueReminders]);

  const handleSpeakDue = () => {
    if (globalDue.length > 0) {
      announceDueReminders(globalDue);
    }
  };

  const handleQuickComplete = async (id: string, title: string) => {
    try {
      await completeReminder(id);
      const voice = getVoiceSettings();
      if (voice.enabled) {
        speakText(`Great job! ${title} marked as completed.`);
      }
      await checkGlobalDueReminders();
    } catch (e) {
      console.error('Failed to complete due reminder:', e);
    }
  };

  const showGlobalBanner = user && globalDue.length > 0 && location.pathname !== '/reminders' && !isDismissed;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      {/* Persistent Global Due Reminders Voice Bar (shown when outside /reminders) */}
      {showGlobalBanner && (
        <aside
          aria-label="Due Medication Reminder"
          className="bg-gradient-to-r from-amber-500 via-rose-500 to-brand-600 text-white shadow-md animate-in slide-in-from-top duration-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-1.5 bg-white/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-200 animate-pulse" />
              </span>
              <div className="text-sm">
                <strong className="font-extrabold text-white">
                  {globalDue.length} Reminder{globalDue.length > 1 ? 's' : ''} Due Now:
                </strong>{' '}
                <span className="text-amber-100 font-medium">
                  {globalDue.map((r) => r.title).slice(0, 2).join(', ')}
                  {globalDue.length > 2 ? ` (+${globalDue.length - 2} more)` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSpeakDue}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Listen to reminder"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear Voice</span>
              </button>

              {globalDue.length === 1 && (
                <button
                  onClick={() => handleQuickComplete(globalDue[0]._id, globalDue[0].title)}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>
              )}

              <Link
                to="/reminders"
                className="px-3 py-1 bg-white text-brand-900 hover:bg-amber-50 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-colors shadow-xs"
              >
                <span>View Reminders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 text-white/70 hover:text-white rounded-lg transition-colors ml-1"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet context={{ health, serverStatus, refetchHealth: fetchHealth }} />
      </main>
      <FloatingVoiceAssistant />
      <Footer />
    </div>
  );
};
