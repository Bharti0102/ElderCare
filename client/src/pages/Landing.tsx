import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Activity, PhoneCall, Sparkles } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto py-12 space-y-12 text-center">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold border border-brand-200">
          <Sparkles className="w-4 h-4 text-brand-500" />
          Compassionate Care for Seniors
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight">
          Empowering Seniors With <br />
          <span className="text-brand-600">Voice-First AI Care</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600">
          ElderCare AI coordinates emergency caregiver calls, explains handwritten prescriptions,
          manages daily medication reminders, and offers warm conversational companionship.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link to="/" className="elder-btn-primary">
          <span>Explore Foundation Dashboard</span>
          <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
        <Link to="/profile" className="elder-btn-secondary">
          <span>Manage Emergency Contacts</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 text-left">
        <div className="elder-card p-6">
          <PhoneCall className="w-8 h-8 text-rose-600 mb-3" />
          <h3 className="font-bold text-xl text-slate-900">One-Touch & Voice Calls</h3>
          <p className="text-slate-600 text-sm mt-2">
            Instant voice connection to designated family caregivers and doctors without dialing complexities.
          </p>
        </div>

        <div className="elder-card p-6">
          <Activity className="w-8 h-8 text-emerald-600 mb-3" />
          <h3 className="font-bold text-xl text-slate-900">Medication Reminders</h3>
          <p className="text-slate-600 text-sm mt-2">
            Conversational reminders that understand spoken language and repeat reliably on schedule.
          </p>
        </div>

        <div className="elder-card p-6">
          <ShieldCheck className="w-8 h-8 text-brand-600 mb-3" />
          <h3 className="font-bold text-xl text-slate-900">Safe Guardrails</h3>
          <p className="text-slate-600 text-sm mt-2">
            No hallucinations, no unauthorized actions, and strict medical guardrails protecting loved ones.
          </p>
        </div>
      </div>
    </div>
  );
};
