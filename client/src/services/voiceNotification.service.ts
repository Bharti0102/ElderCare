/**
 * Voice Notification & Speech Synthesis Service for ElderCare AI
 * Uses Web Audio API for gentle chimes and Web Speech API for voice reminders.
 */

export interface VoiceSettings {
  enabled: boolean;
  autoAnnounceDue: boolean;
  rate: number;
}

const SETTINGS_KEY = 'eldercare_voice_settings';

export const getVoiceSettings = (): VoiceSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {
    enabled: true,
    autoAnnounceDue: true,
    rate: 0.88, // slightly relaxed tempo for elder clarity
  };
};

export const saveVoiceSettings = (settings: VoiceSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

/**
 * Play a soothing, non-startling two-tone chime via Web Audio API.
 * Does not require external mp3 files or network access.
 */
export const playReminderChime = (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Note 2: 880 Hz (A5 - harmonious major fifth)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);

      setTimeout(() => resolve(), 700);
    } catch {
      resolve();
    }
  });
};

/**
 * Stop any ongoing speech synthesis.
 */
export const stopSpeaking = (): void => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Speak text with Web Speech API using elderly-optimized cadence.
 */
export const speakText = (
  text: string,
  options?: { rate?: number; onEnd?: () => void; onError?: () => void; playChimeFirst?: boolean }
): void => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (options?.onEnd) options.onEnd();
    return;
  }

  const settings = getVoiceSettings();
  if (!settings.enabled) {
    if (options?.onEnd) options.onEnd();
    return;
  }

  const executeSpeech = () => {
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? settings.rate;
    utterance.pitch = 1.0;

    // Pick natural English voice if present
    const voices = window.speechSynthesis.getVoices();
    const friendlyVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('David') ||
          v.name.includes('Zira'))
    );
    if (friendlyVoice) {
      utterance.voice = friendlyVoice;
    }

    if (options?.onEnd) {
      utterance.onend = options.onEnd;
    }
    if (options?.onError) {
      utterance.onerror = options.onError;
    } else if (options?.onEnd) {
      utterance.onerror = options.onEnd;
    }

    window.speechSynthesis.speak(utterance);
  };

  if (options?.playChimeFirst) {
    playReminderChime().then(executeSpeech);
  } else {
    executeSpeech();
  }
};

/**
 * Announce a single reminder clearly.
 */
export const announceReminder = (
  reminder: { title: string; category?: string; description?: string; scheduledAt?: string },
  onEnd?: () => void
): void => {
  let speech = `Hello! Reminder: ${reminder.title}.`;
  if (reminder.description) {
    speech += ` Instructions: ${reminder.description}.`;
  }
  if (reminder.scheduledAt) {
    try {
      const timeStr = new Date(reminder.scheduledAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      speech += ` Scheduled for ${timeStr}.`;
    } catch {
      // ignore
    }
  }

  speakText(speech, { playChimeFirst: true, onEnd });
};

/**
 * Announce all currently due reminders.
 */
export const announceDueReminders = (
  reminders: Array<{ title: string; category?: string }>,
  onEnd?: () => void
): void => {
  if (reminders.length === 0) return;

  const count = reminders.length;
  const titles = reminders.map((r) => r.title).join(', and ');
  const speech = `Attention! You have ${count} ${
    count === 1 ? 'reminder' : 'reminders'
  } due right now: ${titles}. Please take your medicine or complete your routine, and press Done!`;

  speakText(speech, { playChimeFirst: true, onEnd });
};
