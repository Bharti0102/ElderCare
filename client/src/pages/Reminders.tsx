import React from 'react';
import { Clock, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

export const Reminders: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 3: Reminder Agent
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Medication & Daily Reminders</h1>
          <p className="text-slate-600 mt-1">
            Natural language reminders schedule seamlessly with recurring intervals.
          </p>
        </div>

        <button
          className="elder-btn-primary opacity-60 cursor-not-allowed"
          disabled
        >
          <Plus className="w-5 h-5 mr-1" />
          <span>New Reminder</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="elder-card p-6 border-l-4 border-l-brand-600">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Preview</span>
              <h3 className="text-xl font-bold text-slate-900">Blood Pressure Medicine</h3>
              <p className="text-slate-600 text-sm">Take 1 tablet of Amlodipine 5mg after dinner.</p>
            </div>
            <span className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>Scheduled: 8:00 PM (Daily)</span>
            <span className="text-amber-600 font-medium">Pending Phase 3</span>
          </div>
        </div>

        <div className="elder-card p-6 border-l-4 border-l-emerald-600">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Preview</span>
              <h3 className="text-xl font-bold text-slate-900">Hydration Check</h3>
              <p className="text-slate-600 text-sm">Drink a full glass of warm water.</p>
            </div>
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>Scheduled: Every 2 Hours</span>
            <span className="text-amber-600 font-medium">Pending Phase 3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
