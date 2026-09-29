import React from 'react';
import { ShieldCheck, HeartHandshake } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-slate-800">ElderCare AI</span>
            <span className="text-slate-300">|</span>
            <span>Secure & Private Healthcare Companion</span>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span>Built with care for senior independence</span>
            <HeartHandshake className="w-4 h-4 text-rose-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
};
