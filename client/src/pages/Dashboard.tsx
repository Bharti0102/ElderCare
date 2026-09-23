import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Activity,
  Database,
  Server,
  Layers,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Cpu,
  PhoneCall,
  BellRing,
  FileSpreadsheet,
  Mic,
  MessageCircleHeart,
  Users,
} from 'lucide-react';
import { HealthData } from '../types';

interface ContextType {
  health: HealthData | null;
  serverStatus: 'online' | 'offline' | 'checking';
  refetchHealth: () => void;
}

export const Dashboard: React.FC = () => {
  const { health, serverStatus } = useOutletContext<ContextType>();

  const isDbConnected = health?.database?.status === 'connected';

  const phases = [
    {
      phase: 'Phase 0',
      title: 'Foundation',
      status: 'Ready & Verified',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description: 'Clean Architecture, Express API, MongoDB connection, Vite React client, Health telemetry.',
      icon: Layers,
      active: true,
      link: '/',
    },
    {
      phase: 'Phase 1',
      title: 'Auth & Emergency Contacts',
      status: 'Ready & Verified',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description: 'Caregiver management, primary contact assignment, user authentication and security.',
      icon: Users,
      active: true,
      link: '/profile',
    },
    {
      phase: 'Phase 2',
      title: 'AI Orchestrator & Companion',
      status: 'Ready & Verified',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description: 'Central intent orchestrator, LLM provider abstraction, empathetic companion chat.',
      icon: MessageCircleHeart,
      active: true,
      link: '/chat',
    },
    {
      phase: 'Phase 3',
      title: 'Reminder Agent',
      status: 'Ready & Verified',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description: 'Natural language medication reminders, recurring cron scheduling, notification alerts.',
      icon: BellRing,
      active: true,
      link: '/reminders',
    },
    {
      phase: 'Phase 4',
      title: 'Prescription Intelligence',
      status: 'Next In Queue',
      statusColor: 'bg-sky-100 text-sky-800 border-sky-300',
      description: 'OCR & vision extraction, doctor & dosage validation, prescription-to-reminder bridging.',
      icon: FileSpreadsheet,
      link: '/prescription',
    },
    {
      phase: 'Phase 5',
      title: 'Caregiver Calling',
      status: 'Upcoming',
      statusColor: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Controlled voice telephony, emergency daughter/son calling, call status tracking.',
      icon: PhoneCall,
      link: '/calls',
    },
    {
      phase: 'Phase 6',
      title: 'Hospital & Appointment',
      status: 'Upcoming',
      statusColor: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Hospital reception dialing, autonomous AI inquiry, appointment availability checking.',
      icon: Cpu,
      link: '/calls',
    },
    {
      phase: 'Phase 7 & 8',
      title: 'Voice Pipeline & Polish',
      status: 'Upcoming',
      statusColor: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'STT & TTS voice loops, accessibility hardening, full system integration testing.',
      icon: Mic,
      link: '/',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 text-white p-8 sm:p-12 shadow-xl shadow-brand-900/10">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-sky-200 text-sm font-semibold tracking-wide border border-white/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Phase 0: Foundation Online
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            ElderCare AI Assistant
          </h1>
          <p className="text-lg sm:text-xl text-sky-100 leading-relaxed font-normal">
            Welcome to the foundational core of ElderCare AI. The full-stack skeleton, MongoDB integration,
            strict Clean Architecture, and telemetry endpoints are operational.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <Layers className="w-96 h-96" />
        </div>
      </section>

      {/* System Telemetry & Connection Status Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-600" />
            Live Infrastructure Telemetry
          </h2>
          <span className="text-sm text-slate-500">Auto-refreshing every 30s</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Server Node Card */}
          <div className="elder-card p-6 border-l-4 border-l-brand-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Express API Server
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                  {serverStatus === 'online' ? (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                  )}
                  {serverStatus === 'online' ? 'Connected' : 'Offline'}
                </h3>
              </div>
              <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
                <Server className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Port:</span>
                <span className="font-mono font-semibold text-slate-900">5000</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {health?.environment || 'development'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {health ? `${health.uptime}s` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Database Node Card */}
          <div className="elder-card p-6 border-l-4 border-l-emerald-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  MongoDB Instance
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                  {isDbConnected ? (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  )}
                  {isDbConnected ? 'Active & Ready' : health?.database?.status?.toUpperCase() || 'Disconnected'}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Database className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {health?.database?.name || 'eldercare_ai'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Host:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {health?.database?.host || '127.0.0.1:27017'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>State:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {health?.database?.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Architecture Card */}
          <div className="elder-card p-6 border-l-4 border-l-care-indigo">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  System Architecture
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  Clean Flow
                </h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1.5 font-mono">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                Route → Controller → Service → DB
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                LLM → Orchestrator → Tool → Service
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase Roadmap Overview */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Phase-by-Phase Roadmap
          </h2>
          <p className="text-slate-600 text-base mt-1">
            ElderCare AI is constructed deliberately phase by phase to guarantee reliability, safety, and testing at every stage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {phases.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className={`elder-card p-6 flex flex-col justify-between ${
                  p.active ? 'ring-2 ring-brand-500 shadow-md bg-white' : 'bg-slate-50/50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-400">{p.phase}</span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${p.statusColor}`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-lg text-slate-900">{p.title}</h4>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">{p.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    to={p.link}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                  >
                    <span>View Section</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
