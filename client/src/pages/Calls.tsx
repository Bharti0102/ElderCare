import React from 'react';
import { UserCheck, Sparkles, Building2 } from 'lucide-react';

export const Calls: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Phase 5 & 6: Calling & Hospital Assistance
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Emergency & Hospital Calls</h1>
        <p className="text-slate-600 mt-1">
          Controlled telephony workflows ensuring elderly users are connected safely without hallucinations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Caregiver Call Preview */}
        <div className="elder-card p-6 border-l-4 border-l-rose-500">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Phase 5 Feature</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Primary Caregiver Direct Dial</h3>
              <p className="text-slate-600 text-sm mt-1">
                "Call my daughter" connects directly through verified emergency contacts and telephony providers.
              </p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>Provider: Twilio / Mock Telephony</span>
            <span className="text-amber-600 font-semibold">Planned for Phase 5</span>
          </div>
        </div>

        {/* Hospital Appointment Calling Preview */}
        <div className="elder-card p-6 border-l-4 border-l-brand-600">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Phase 6 Feature</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Hospital Reception & Booking</h3>
              <p className="text-slate-600 text-sm mt-1">
                AI assistant inquires about appointment slots and informs the user for final confirmation.
              </p>
            </div>
            <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>Integration: Hospital Dialing</span>
            <span className="text-amber-600 font-semibold">Planned for Phase 6</span>
          </div>
        </div>
      </div>
    </div>
  );
};
