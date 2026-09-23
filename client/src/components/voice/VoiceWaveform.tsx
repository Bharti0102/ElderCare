import React from 'react';

interface VoiceWaveformProps {
  state: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  label?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ state, label }) => {
  if (state === 'idle') return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/95 border border-brand-200 shadow-md backdrop-blur-sm animate-in fade-in">
      {/* Dynamic Animated Waveform Bars */}
      <div className="flex items-center gap-1 h-5">
        {[0, 1, 2, 3, 4].map((i) => {
          let heightClass = 'h-1';
          let animClass = '';
          let bgClass = 'bg-brand-500';

          if (state === 'listening') {
            bgClass = 'bg-rose-500';
            animClass = 'animate-pulse';
            heightClass = i % 2 === 0 ? 'h-4' : 'h-2.5';
          } else if (state === 'speaking') {
            bgClass = 'bg-emerald-500';
            animClass = 'animate-bounce';
            heightClass = i === 2 ? 'h-5' : i % 2 === 1 ? 'h-3.5' : 'h-2';
          } else if (state === 'processing') {
            bgClass = 'bg-amber-500';
            animClass = 'animate-spin';
            heightClass = 'h-2 w-2 rounded-full';
          }

          return (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${heightClass} ${bgClass} ${animClass}`}
              style={{ animationDelay: `${i * 120}ms` }}
            />
          );
        })}
      </div>

      {/* State Label */}
      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
        {label ||
          (state === 'listening'
            ? 'Listening to you...'
            : state === 'speaking'
            ? 'ElderCare AI Speaking...'
            : state === 'processing'
            ? 'Understanding command...'
            : 'Error occurred')}
      </span>
    </div>
  );
};
