import React from 'react';
import { Phone, Sparkles, UserPlus } from 'lucide-react';

export const Profile: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-200 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Phase 1: User & Emergency Contacts
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Senior Profile & Caregivers</h1>
        <p className="text-slate-600 mt-1">
          Registered emergency contacts that ElderCare AI dials when requested by voice or emergency triggers.
        </p>
      </div>

      <div className="elder-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-2xl">
              EC
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Elder User Profile</h2>
              <p className="text-slate-500 text-sm">Account state: Ready for Phase 1 Authentication</p>
            </div>
          </div>
          <button className="elder-btn-secondary opacity-60 cursor-not-allowed text-sm" disabled>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add Contact
          </button>
        </div>

        <div className="pt-6 border-t border-slate-100 space-y-4">
          <h3 className="font-bold text-base text-slate-800">Primary Emergency Contact Preview</h3>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Sarah (Daughter)</p>
                <p className="text-slate-500 text-xs font-mono">+1 (555) 019-2834 • Primary Contact</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-semibold">
              Pending Phase 1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
