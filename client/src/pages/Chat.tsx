import React from 'react';
import { Sparkles, Send, Bot } from 'lucide-react';

export const Chat: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-800 text-xs font-semibold border border-brand-200 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Phase 2: AI Orchestrator & Companion
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Conversational AI Companion</h1>
        <p className="text-slate-600 mt-1">
          Empathetic daily conversation, gentle mental exercises, and intelligent coordination.
        </p>
      </div>

      <div className="elder-card h-[450px] flex flex-col justify-between p-6">
        <div className="space-y-4 overflow-y-auto">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-xs max-w-lg text-slate-800 text-base">
              Hello! I am your ElderCare AI Companion. In Phase 2, you will be able to converse freely
              with me about your day, request stories, or ask about reminders.
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Chat will be activated in Phase 2..."
              className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none text-base"
              disabled
            />
            <button className="elder-btn-primary opacity-60 cursor-not-allowed" disabled>
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
