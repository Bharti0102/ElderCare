import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ShieldCheck } from 'lucide-react';

export const Signup: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-12">
      <div className="elder-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-brand-50 text-brand-600 rounded-2xl mb-2">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
          <p className="text-sm text-slate-500">Register a new elder user profile</p>
        </div>

        <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-sky-600" />
          <span>User registration will be activated in <strong>Phase 1</strong>.</span>
        </div>

        <button
          type="button"
          className="w-full elder-btn-primary opacity-80 cursor-not-allowed"
          disabled
        >
          <span>Register Account (Phase 1)</span>
        </button>

        <div className="text-center text-sm text-slate-500">
          <span>Already registered? </span>
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
