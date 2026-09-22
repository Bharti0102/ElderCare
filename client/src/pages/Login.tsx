import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-12">
      <div className="elder-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-brand-50 text-brand-600 rounded-2xl mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>
          <p className="text-sm text-slate-500">Access your ElderCare AI care coordinator</p>
        </div>

        <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-sky-600" />
          <span>Authentication workflows will be activated in <strong>Phase 1</strong>.</span>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                placeholder="elder@example.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none text-base"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none text-base"
                disabled
              />
            </div>
          </div>

          <button
            type="button"
            className="w-full elder-btn-primary opacity-80 cursor-not-allowed"
            disabled
          >
            <span>Sign In (Phase 1)</span>
          </button>
        </form>

        <div className="text-center text-sm text-slate-500">
          <span>Don't have an account? </span>
          <Link to="/signup" className="text-brand-600 font-semibold hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};
