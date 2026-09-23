import React, { useState } from 'react';
import {
  Mic,
  Square,
  Volume2,
  X,
  Sparkles,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { VoiceWaveform } from './VoiceWaveform';

const VOICE_CHIPS = [
  'Call my daughter',
  'Remind me to take my medicine at 8 PM',
  'Tell me a gentle story',
  'Book an appointment with my doctor',
];

export const FloatingVoiceAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    state,
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    lastResult,
    errorMessage,
    isSupported,
    startListening,
    stopListening,
    handleInterrupt,
  } = useVoiceAssistant({
    autoSpeak: true,
  });

  return (
    <>
      {/* Floating Microphone Trigger Orb (Bottom-Right) */}
      {!isOpen && (
        <aside
          aria-label="Floating voice assistant launcher"
          className="fixed bottom-6 right-6 z-50 animate-in fade-in zoom-in duration-200"
        >
          <button
            onClick={() => {
              setIsOpen(true);
              startListening();
            }}
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-brand-600 via-brand-700 to-indigo-700 text-white shadow-2xl hover:shadow-brand-500/40 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-brand-300"
            title="Open Voice Assistant"
          >
            {/* Ambient Pulse Ripple */}
            <span className="absolute -inset-1 rounded-full bg-brand-400/30 animate-ping pointer-events-none" />

            <Mic className="w-8 h-8 text-white relative z-10 transition-transform group-hover:scale-110" />

            <span className="absolute -top-10 right-0 bg-slate-900/90 text-white text-xs font-extrabold px-3 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
              Voice Assistant (Phase 7)
            </span>
          </button>
        </aside>
      )}

      {/* Expanded Voice Assistant Dialog */}
      {isOpen && (
        <section
          aria-label="ElderCare AI Voice Assistant Modal"
          className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] rounded-3xl bg-white/95 backdrop-blur-xl border-2 border-brand-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-50 via-indigo-50 to-sky-50 border-b border-brand-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brand-600 text-white rounded-xl shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  Voice Assistant
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                </h3>
                <p className="text-xs text-slate-500">Hands-free voice control</p>
              </div>
            </div>

            <button
              onClick={() => {
                handleInterrupt();
                setIsOpen(false);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
              title="Close Voice Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Central Microphone Body */}
          <div className="p-6 flex flex-col items-center justify-center space-y-4 text-center">
            {/* Big Circular Mic Button */}
            <div className="relative">
              {isListening && (
                <div className="absolute -inset-3 rounded-full bg-rose-400/30 animate-ping pointer-events-none" />
              )}
              {isSpeaking && (
                <div className="absolute -inset-3 rounded-full bg-emerald-400/30 animate-pulse pointer-events-none" />
              )}

              <button
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else if (isSpeaking) {
                    handleInterrupt();
                  } else {
                    startListening();
                  }
                }}
                disabled={!isSupported}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-90 ${
                  isListening
                    ? 'bg-rose-600 text-white shadow-rose-600/40 scale-105'
                    : isSpeaking
                    ? 'bg-emerald-600 text-white shadow-emerald-600/40'
                    : isProcessing
                    ? 'bg-amber-500 text-white shadow-amber-500/40 animate-pulse'
                    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30'
                } disabled:opacity-50`}
                title={
                  isListening
                    ? 'Tap to submit speech'
                    : isSpeaking
                    ? 'Tap to stop speaking'
                    : 'Tap to speak'
                }
              >
                {isSpeaking ? (
                  <Square className="w-10 h-10 fill-white" />
                ) : isListening ? (
                  <Mic className="w-10 h-10 animate-bounce" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>
            </div>

            {/* Waveform indicator */}
            <VoiceWaveform state={state} />

            {/* Instruction / Transcript Box */}
            <div className="w-full min-h-[4rem] p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col justify-center">
              {isListening ? (
                <div className="space-y-1">
                  <span className="font-extrabold text-rose-600 uppercase text-[10px] tracking-wider block">
                    Listening to you...
                  </span>
                  <p className="text-slate-800 font-semibold italic text-sm">
                    {transcript ? `"${transcript}"` : 'Speak your command clearly...'}
                  </p>
                </div>
              ) : isProcessing ? (
                <p className="text-amber-700 font-bold animate-pulse">
                  Understanding command and coordinating tools...
                </p>
              ) : isSpeaking && lastResult ? (
                <div className="space-y-1 text-left">
                  <span className="font-extrabold text-emerald-700 uppercase text-[10px] tracking-wider flex items-center gap-1">
                    <Volume2 className="w-3 h-3" />
                    Assistant Spoken Reply
                  </span>
                  <p className="text-slate-800 text-xs line-clamp-3">
                    {lastResult.spokenText || lastResult.reply}
                  </p>
                </div>
              ) : lastResult ? (
                <div className="space-y-1 text-left">
                  <span className="font-extrabold text-slate-500 uppercase text-[10px] tracking-wider">
                    Last Result
                  </span>
                  <p className="text-slate-800 text-xs line-clamp-2">
                    {lastResult.reply}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500">
                  Tap the microphone and say:
                  <strong className="block text-slate-700 mt-0.5">
                    "Call my daughter" or "Remind me at 8 PM"
                  </strong>
                </p>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs flex items-center gap-1.5 text-left w-full">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick Action Suggestion Chips */}
            <div className="w-full pt-1 space-y-1.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block text-left">
                Suggested Commands:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VOICE_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      startListening();
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 border border-slate-200 transition-colors text-left"
                  >
                    "{chip}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              {isSupported ? '🎙️ Web Speech STT Active' : '⚠️ Speech Not Supported'}
            </span>
            {isSpeaking && (
              <button
                onClick={handleInterrupt}
                className="text-rose-600 hover:underline font-bold text-[11px] flex items-center gap-1"
              >
                <Square className="w-3 h-3 fill-rose-600" />
                <span>Stop Speaking</span>
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
};
