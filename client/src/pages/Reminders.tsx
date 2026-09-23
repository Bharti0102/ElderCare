import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Clock,
  Plus,
  Pill,
  Calendar,
  Droplets,
  Sparkles,
  CheckCircle2,
  Trash2,
  AlertCircle,
  RotateCw,
  X,
  MessageSquare,
  Check,
  Volume2,
  VolumeX,
  Radio,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getReminders,
  getDueReminders,
  createReminder,
  deleteReminder,
  completeReminder,
  snoozeReminder,
} from '../services/reminder.service';
import {
  getVoiceSettings,
  saveVoiceSettings,
  speakText,
  stopSpeaking,
  announceReminder,
  announceDueReminders,
  VoiceSettings,
} from '../services/voiceNotification.service';
import { Reminder, ReminderCategory, ReminderRepeat, CreateReminderDTO } from '../types';

export const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'SNOOZED'>('ALL');

  // Voice State
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(getVoiceSettings);
  const [speakingReminderId, setSpeakingReminderId] = useState<string | null>(null);
  const [isAnnouncingDue, setIsAnnouncingDue] = useState(false);
  const lastAnnouncedIdsRef = useRef<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReminderCategory>('MEDICATION');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d.toISOString().slice(0, 16); // format: YYYY-MM-DDTHH:mm
  });
  const [repeat, setRepeat] = useState<ReminderRepeat>('none');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allList, dueList] = await Promise.all([
        getReminders(activeTab === 'ALL' ? undefined : activeTab),
        getDueReminders(),
      ]);
      setReminders(allList);
      setDueReminders(dueList);

      // Check for newly due reminders to announce via voice
      if (voiceSettings.enabled && voiceSettings.autoAnnounceDue && dueList.length > 0) {
        const currentDueIds = dueList.map((r) => r._id).sort().join(',');
        if (currentDueIds !== lastAnnouncedIdsRef.current) {
          lastAnnouncedIdsRef.current = currentDueIds;
          setIsAnnouncingDue(true);
          announceDueReminders(dueList, () => setIsAnnouncingDue(false));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-poll due reminders every 30 seconds
    const interval = setInterval(async () => {
      try {
        const dueList = await getDueReminders();
        setDueReminders(dueList);
        if (voiceSettings.enabled && voiceSettings.autoAnnounceDue && dueList.length > 0) {
          const currentDueIds = dueList.map((r) => r._id).sort().join(',');
          if (currentDueIds !== lastAnnouncedIdsRef.current) {
            lastAnnouncedIdsRef.current = currentDueIds;
            setIsAnnouncingDue(true);
            announceDueReminders(dueList, () => setIsAnnouncingDue(false));
          }
        }
      } catch {
        // silent fail on poll
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      stopSpeaking();
    };
  }, [activeTab, voiceSettings.enabled, voiceSettings.autoAnnounceDue]);

  const handleToggleVoice = () => {
    const updated = { ...voiceSettings, enabled: !voiceSettings.enabled };
    setVoiceSettings(updated);
    saveVoiceSettings(updated);
    if (!updated.enabled) {
      stopSpeaking();
    } else {
      speakText('Voice alerts are now active.', { playChimeFirst: true });
    }
  };

  const handleTestVoice = () => {
    speakText('Voice reminders are active and ready. Your care coordinator is listening!', {
      playChimeFirst: true,
    });
  };

  const handleSpeakReminder = (reminder: Reminder) => {
    if (speakingReminderId === reminder._id) {
      stopSpeaking();
      setSpeakingReminderId(null);
      return;
    }
    setSpeakingReminderId(reminder._id);
    announceReminder(reminder, () => {
      setSpeakingReminderId(null);
    });
  };

  const handleAnnounceDueNow = () => {
    if (dueReminders.length === 0) return;
    setIsAnnouncingDue(true);
    announceDueReminders(dueReminders, () => {
      setIsAnnouncingDue(false);
    });
  };

  const handleOpenModal = () => {
    setTitle('');
    setDescription('');
    setCategory('MEDICATION');
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    setScheduledDate(d.toISOString().slice(0, 16));
    setRepeat('none');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setModalError('Please enter a title for the reminder');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      const dto: CreateReminderDTO = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        scheduledAt: new Date(scheduledDate).toISOString(),
        repeat,
      };

      const created = await createReminder(dto);
      setIsModalOpen(false);

      if (voiceSettings.enabled) {
        speakText(`Your reminder for ${created.title} has been scheduled successfully!`);
      }

      await fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string, reminderTitle?: string) => {
    try {
      const res = await completeReminder(id);
      if (voiceSettings.enabled) {
        if (res.recurringNextDate) {
          speakText(`Great job! ${reminderTitle || 'Reminder'} completed. Next occurrence scheduled.`);
        } else {
          speakText(`Well done! ${reminderTitle || 'Reminder'} marked as completed.`);
        }
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete reminder');
    }
  };

  const handleSnooze = async (id: string, minutes = 10, reminderTitle?: string) => {
    try {
      await snoozeReminder(id, minutes);
      if (voiceSettings.enabled) {
        speakText(`${reminderTitle || 'Reminder'} snoozed for ${minutes} minutes.`);
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to snooze reminder');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this reminder?')) return;
    try {
      await deleteReminder(id);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete reminder');
    }
  };

  const getCategoryIcon = (cat: ReminderCategory) => {
    switch (cat) {
      case 'MEDICATION':
        return <Pill className="w-5 h-5 text-rose-600" />;
      case 'HYDRATION':
        return <Droplets className="w-5 h-5 text-sky-600" />;
      case 'APPOINTMENT':
        return <Calendar className="w-5 h-5 text-amber-600" />;
      case 'GENERAL':
      default:
        return <Bell className="w-5 h-5 text-brand-600" />;
    }
  };

  const getCategoryBadge = (cat: ReminderCategory) => {
    switch (cat) {
      case 'MEDICATION':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HYDRATION':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'APPOINTMENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'GENERAL':
      default:
        return 'bg-brand-50 text-brand-700 border-brand-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'SNOOZED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      case 'PENDING':
      default:
        return 'bg-sky-100 text-sky-800 border-sky-300';
    }
  };

  const formatScheduledTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Daily Medication Schedule & Alerts
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Medication & Daily Reminders</h1>
          <p className="text-slate-600 mt-1">
            Manage your health routine with timed medication alerts, voice notifications, and recurring schedules.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <Link
            to="/chat"
            className="elder-btn-secondary text-sm flex items-center gap-1.5"
            title="Create reminder via AI Voice & Chat"
          >
            <MessageSquare className="w-4 h-4 text-brand-600" />
            <span>Schedule via AI</span>
          </Link>
          <button
            onClick={handleOpenModal}
            className="elder-btn-primary flex items-center gap-1.5 shadow-md shadow-brand-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>New Reminder</span>
          </button>
        </div>
      </div>

      {/* Voice Notification Controls & Accessibility Bar */}
      <div className="elder-card p-4 bg-gradient-to-r from-brand-50 via-sky-50 to-indigo-50 border border-brand-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl transition-colors ${
              voiceSettings.enabled ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}
          >
            {voiceSettings.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>ElderCare Voice Alerts</span>
              {voiceSettings.enabled && (
                <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                  <Radio className="w-3 h-3 animate-pulse" /> Active
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-600">
              {voiceSettings.enabled
                ? 'Reads reminders aloud with gentle chimes and audible spoken guidance.'
                : 'Spoken voice announcements are currently muted.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {voiceSettings.enabled && (
            <button
              onClick={handleTestVoice}
              className="text-xs font-bold text-brand-700 hover:text-brand-900 bg-white hover:bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              Test Voice
            </button>
          )}
          <button
            onClick={handleToggleVoice}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
              voiceSettings.enabled
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            {voiceSettings.enabled ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Mute Voice</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Enable Voice Alerts</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Due Reminders High Priority Alert Banner with Voice Announcer */}
      {dueReminders.length > 0 && (
        <div className="elder-card p-6 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-brand-500/10 border-2 border-amber-400 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm animate-bounce">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span>Action Needed:</span>
                    <span className="text-amber-800">
                      {dueReminders.length} Reminder{dueReminders.length > 1 ? 's' : ''} Due Now!
                    </span>
                  </h2>
                  <p className="text-sm text-slate-700">
                    Please take your prescribed medicines or confirm your completed tasks below.
                  </p>
                </div>

                <button
                  onClick={handleAnnounceDueNow}
                  className={`elder-btn-secondary text-xs font-bold flex items-center gap-2 self-start sm:self-center border-amber-300 bg-white hover:bg-amber-50 text-amber-900 transition-all ${
                    isAnnouncingDue ? 'ring-2 ring-amber-500 animate-pulse' : ''
                  }`}
                  title="Listen to due reminders read aloud"
                >
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>{isAnnouncingDue ? 'Speaking...' : '🔊 Read Due Aloud'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {dueReminders.map((due) => (
                  <div
                    key={due._id}
                    className="p-4 bg-white rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-slate-50 rounded-xl">
                        {getCategoryIcon(due.category)}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-slate-900 truncate">{due.title}</h4>
                        <p className="text-xs text-slate-500">
                          Due: {formatScheduledTime(due.scheduledAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSpeakReminder(due)}
                        className={`p-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                          speakingReminderId === due._id
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-brand-50 hover:text-brand-700'
                        }`}
                        title="Read reminder aloud"
                      >
                        <Volume2 className={`w-4 h-4 ${speakingReminderId === due._id ? 'animate-pulse' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleComplete(due._id, due.title)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>
                      <button
                        onClick={() => handleSnooze(due._id, 10, due.title)}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1 transition-transform active:scale-95"
                        title="Snooze 10 minutes"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>10m</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI natural language tip */}
      <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-sky-900">
          <span className="font-bold">Pro-tip for seniors: </span>
          You can simply say or type to the AI Companion in Chat:
          <span className="italic font-medium text-sky-950 ml-1">
            "Remind me to take my blood pressure medicine at 8 PM every day"
          </span>
          — and it will automatically schedule and speak it for you!
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          {(['ALL', 'PENDING', 'COMPLETED', 'SNOOZED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <button
          onClick={fetchData}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          title="Refresh reminders"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Reminders List */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && reminders.length === 0 ? (
        <div className="text-center py-16">
          <RotateCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Loading your reminders...</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="elder-card p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Bell className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">No Reminders Found</h3>
            <p className="text-slate-600 max-w-md mx-auto text-sm">
              {activeTab === 'ALL'
                ? "You haven't scheduled any reminders yet. Click below or talk to the AI to create your first medication or task alert."
                : `No reminders matching status "${activeTab}".`}
            </p>
          </div>
          {activeTab === 'ALL' && (
            <button onClick={handleOpenModal} className="elder-btn-primary mx-auto inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span>Add Your First Reminder</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reminders.map((reminder) => {
            const isCompleted = reminder.status === 'COMPLETED';
            const isSnoozed = reminder.status === 'SNOOZED';
            const isSpeaking = speakingReminderId === reminder._id;

            return (
              <div
                key={reminder._id}
                className={`elder-card p-6 flex flex-col justify-between border-l-4 transition-all hover:shadow-md ${
                  reminder.category === 'MEDICATION'
                    ? 'border-l-rose-500'
                    : reminder.category === 'HYDRATION'
                    ? 'border-l-sky-500'
                    : reminder.category === 'APPOINTMENT'
                    ? 'border-l-amber-500'
                    : 'border-l-brand-500'
                } ${isCompleted ? 'opacity-70 bg-slate-50/70' : 'bg-white'} ${
                  isSpeaking ? 'ring-2 ring-brand-500 shadow-lg' : ''
                }`}
              >
                <div className="space-y-3">
                  {/* Category and Status Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getCategoryBadge(
                        reminder.category
                      )}`}
                    >
                      {reminder.category}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(
                        reminder.status
                      )}`}
                    >
                      {reminder.status}
                    </span>
                  </div>

                  {/* Title and Icon */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3
                        className={`text-xl font-bold text-slate-900 ${
                          isCompleted ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {reminder.title}
                      </h3>
                      {reminder.description && (
                        <p className="text-slate-600 text-sm mt-1">{reminder.description}</p>
                      )}
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-2xl flex-shrink-0">
                      {getCategoryIcon(reminder.category)}
                    </div>
                  </div>

                  {/* Scheduling and Recurrence Info */}
                  <div className="space-y-1.5 pt-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        <strong className="text-slate-800">Time:</strong> {formatScheduledTime(reminder.scheduledAt)}
                      </span>
                    </div>

                    {reminder.repeat !== 'none' && (
                      <div className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 text-brand-500" />
                        <span className="text-brand-700 font-semibold capitalize">
                          Repeats: {reminder.repeat}
                        </span>
                      </div>
                    )}

                    {isSnoozed && reminder.snoozedUntil && (
                      <div className="text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                        Snoozed until: {formatScheduledTime(reminder.snoozedUntil)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Speak / Read Aloud Button */}
                    <button
                      onClick={() => handleSpeakReminder(reminder)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                        isSpeaking
                          ? 'bg-brand-600 text-white border-brand-600 ring-2 ring-brand-300'
                          : 'bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border-slate-200'
                      }`}
                      title={isSpeaking ? 'Stop speaking' : 'Read reminder aloud'}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse text-white' : 'text-brand-600'}`} />
                      <span>{isSpeaking ? 'Speaking...' : 'Read Aloud'}</span>
                    </button>

                    {!isCompleted ? (
                      <>
                        <button
                          onClick={() => handleComplete(reminder._id, reminder.title)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Done</span>
                        </button>
                        <button
                          onClick={() => handleSnooze(reminder._id, 10, reminder.title)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 transition-colors"
                          title="Snooze 10 minutes"
                        >
                          <span>Snooze</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(reminder._id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="elder-card p-6 sm:p-8 max-w-lg w-full bg-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Add New Reminder</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateReminder} className="space-y-5 mt-5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Reminder Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Blood Pressure Medication (Amlodipine)"
                  className="elder-input text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Instructions / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Take 1 tablet with full glass of water after breakfast"
                  className="elder-input text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ReminderCategory)}
                    className="elder-input text-base"
                  >
                    <option value="MEDICATION">💊 Medication</option>
                    <option value="HYDRATION">💧 Hydration</option>
                    <option value="APPOINTMENT">📅 Appointment</option>
                    <option value="GENERAL">🔔 General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Repeat Schedule
                  </label>
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}
                    className="elder-input text-base"
                  >
                    <option value="none">One-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="elder-input text-base"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="elder-btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="elder-btn-primary shadow-md shadow-brand-500/20"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
