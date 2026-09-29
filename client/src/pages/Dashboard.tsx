import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  PhoneCall,
  BellRing,
  MessageCircleHeart,
  Users,
  Building2,
  ArrowRight,
  Heart,
  Video,
  Clock,
  Sparkles,
  Lock,
  Smartphone,
} from 'lucide-react';

export const Dashboard: React.FC = () => {

  const careModules = [
    {
      title: 'Family Video & Audio Calls',
      badge: 'Instant 1-Tap Connect',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'One-tap video and audio calls with your family and caregivers. Family members can join right from their phone without downloading any app.',
      icon: Video,
      color: 'from-emerald-500 to-teal-600',
      link: '/calls',
      actionText: 'Start Call',
    },
    {
      title: 'Daily Medication Reminders',
      badge: 'Voice Alerts & Alarms',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Never miss a pill or routine. Set gentle voice reminders and daily schedules tailored for senior wellness and safety.',
      icon: BellRing,
      color: 'from-indigo-500 to-purple-600',
      link: '/reminders',
      actionText: 'View Schedule',
    },
    {
      title: 'Conversational AI Companion',
      badge: 'Hindi, English & Regional',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      description: 'A warm, friendly companion ready to talk in Hindi, Hinglish, or English, share stories, answer questions, and keep you company anytime.',
      icon: MessageCircleHeart,
      color: 'from-rose-500 to-pink-600',
      link: '/chat',
      actionText: 'Talk with AI',
    },
    {
      title: 'Family & Caregiver Directory',
      badge: 'Multiple Contacts & Categories',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Organize your family loved ones, doctors, home nurses, and emergency SOS contacts into a categorized phonebook for quick reach.',
      icon: Users,
      color: 'from-slate-700 to-slate-900',
      link: '/profile',
      actionText: 'Manage Directory',
    },
    {
      title: 'Doctor Appointments',
      badge: 'Direct Phone & Truecaller',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      description: 'Connect directly with your clinic receptionists and doctors, and keep track of your consultation visits.',
      icon: Building2,
      color: 'from-amber-500 to-orange-600',
      link: '/appointments',
      actionText: 'Book Appointment',
    },
  ];



  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 text-white p-8 sm:p-12 shadow-xl shadow-brand-900/15">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-sky-100 text-xs font-bold tracking-wide border border-white/20">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Senior Wellness & Family Connection Active</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Welcome to ElderCare
          </h1>

          <p className="text-base sm:text-lg text-sky-100 leading-relaxed font-normal max-w-2xl">
            Your personal companion for daily medication reminders, family video calls, and voice assistance in your own natural language.
          </p>

          {/* Quick-Launch Action Buttons */}
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/calls"
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/30 transition-all active:scale-95"
            >
              <PhoneCall className="w-4 h-4 fill-slate-950" />
              <span>Call Family</span>
            </Link>

            <Link
              to="/reminders"
              className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm flex items-center gap-2 border border-white/25 backdrop-blur-md transition-all active:scale-95"
            >
              <Clock className="w-4 h-4 text-amber-200" />
              <span>Daily Reminders</span>
            </Link>

            <Link
              to="/chat"
              className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm flex items-center gap-2 border border-white/25 backdrop-blur-md transition-all active:scale-95"
            >
              <MessageCircleHeart className="w-4 h-4 text-rose-200" />
              <span>Talk with AI</span>
            </Link>
          </div>
        </div>

        {/* Ambient Decorative Heart Backdrop */}
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <Heart className="w-96 h-96 fill-white" />
        </div>
      </section>

      {/* Emergency Assistance Quick Call Strip */}
      <section className="p-4 sm:p-5 bg-gradient-to-r from-rose-50 via-white to-amber-50 rounded-2xl border border-rose-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Need Immediate Assistance?</h3>
            <p className="text-xs text-slate-600">
              Reach your primary caregiver instantly or dial the National Emergency Medical Line (108).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <a
            href="tel:108"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Dial 108 (Ambulance)</span>
          </a>
          <Link
            to="/calls"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Call Caregiver →</span>
          </Link>
        </div>
      </section>

      {/* Care Modules Grid */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-600" />
            Personal Care Center
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Access your health tools, medication intelligence, and family connectivity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {careModules.map((module, idx) => {
            const Icon = module.icon;
            return (
              <div
                key={idx}
                className="elder-card p-6 flex flex-col justify-between bg-white border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-brand-200 transition-all duration-200 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${module.color} flex items-center justify-center text-white shadow-md shadow-slate-900/10 group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${module.badgeColor}`}
                    >
                      {module.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-xl text-slate-900 group-hover:text-brand-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-2">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={module.link}
                    className="inline-flex items-center gap-2 text-sm font-extrabold text-brand-600 hover:text-brand-800 transition-colors"
                  >
                    <span>{module.actionText}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Privacy, Security & Family Protection Banner */}
      <section className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Private & Secure Health Companion</h3>
              <p className="text-xs text-slate-400">Encrypted health data, verified caregiver contacts, and emergency assistance</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>HIPAA Compliant Protection</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <Lock className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block font-medium">Health Data Privacy</span>
              <span className="font-bold text-white text-sm">256-Bit Encrypted</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <PhoneCall className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block font-medium">Emergency Assistance</span>
              <span className="font-bold text-white text-sm">Direct SOS & 108 Dispatch</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block font-medium">Caregiver Alerts</span>
              <span className="font-bold text-white text-sm">Instant Family SMS</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
