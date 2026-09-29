/**
 * Voice Notification & Speech Synthesis Service for ElderCare AI
 * Uses Web Audio API for gentle chimes and Web Speech API for voice reminders & companion speech.
 * Includes Chrome utterance deadlock protection, sentence chunking, and Hindi/Indian voice mapping.
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

      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
        resolve();
      }, 750);
    } catch {
      resolve();
    }
  });
};

/**
 * Realistic in-browser telephone ring generator via Web Audio API.
 */
export const startTelephoneRinging = (): { stop: () => void } => {
  let isRunning = true;
  let audioCtx: AudioContext | null = null;
  let intervalId: any = null;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      return { stop: () => {} };
    }
    audioCtx = new AudioCtx();

    const playOneRingBurst = () => {
      if (!isRunning || !audioCtx || audioCtx.state === 'closed') return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      // 440 Hz (Standard Dial/Ring Tone A4)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.setValueAtTime(0.12, now + 1.6);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 1.8);

      // 480 Hz (Standard Ring Tone Harmonic)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, now);
      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.setValueAtTime(0.12, now + 1.6);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now);
      osc2.stop(now + 1.8);
    };

    playOneRingBurst();
    intervalId = setInterval(playOneRingBurst, 4000);
  } catch (err) {
    console.warn('[TelephoneRinging] Web Audio error:', err);
  }

  return {
    stop: () => {
      isRunning = false;
      if (intervalId) clearInterval(intervalId);
      if (audioCtx && audioCtx.state !== 'closed') {
        try {
          audioCtx.close();
        } catch {
          // ignore
        }
      }
    },
  };
};

/**
 * Play a standard telephone call termination / hangup beep tone.
 */
export const playHangupTone = (): void => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.setValueAtTime(320, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    }, 400);
  } catch {
    // ignore
  }
};

// Cache loaded voices
let cachedVoices: SpeechSynthesisVoice[] = [];

const loadVoices = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      cachedVoices = voices;
    }
  }
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

let keepAliveIntervalId: any = null;
const startKeepAlive = () => {
  stopKeepAlive();
  // Chrome bug workaround: keep speech synthesis alive during long utterances
  keepAliveIntervalId = setInterval(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }
  }, 10000);
};

const stopKeepAlive = () => {
  if (keepAliveIntervalId) {
    clearInterval(keepAliveIntervalId);
    keepAliveIntervalId = null;
  }
};

let currentSpeechSessionId = 0;
let pendingSpeechTimeoutId: any = null;

/**
 * Stop any ongoing speech synthesis immediately.
 */
export const stopSpeaking = (): void => {
  currentSpeechSessionId++; // Invalidate current session token immediately
  if (pendingSpeechTimeoutId) {
    clearTimeout(pendingSpeechTimeoutId);
    pendingSpeechTimeoutId = null;
  }
  stopKeepAlive();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
};

export const isSpeakingAudio = (): boolean => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
};

/**
 * Splits text into elder-friendly natural speech chunks (by sentence boundaries).
 */
const splitIntoSpeechChunks = (text: string): string[] => {
  // Split on Devanagari danda '।', exclamation, question mark, period, or newlines
  const rawChunks = text.split(/([।!?.\n]+)/);
  const chunks: string[] = [];
  let current = '';

  for (let i = 0; i < rawChunks.length; i += 2) {
    const sentence = rawChunks[i] || '';
    const punctuation = rawChunks[i + 1] || '';
    const combined = (sentence + punctuation).trim();

    if (!combined) continue;

    if (current.length + combined.length < 160) {
      current = current ? `${current} ${combined}` : combined;
    } else {
      if (current) chunks.push(current);
      current = combined;
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
};

/**
 * Speak text with Web Speech API using elderly-optimized cadence and native voice selection.
 */
export const speakText = (
  text: string,
  options?: {
    lang?: string;
    rate?: number;
    onEnd?: () => void;
    onError?: () => void;
    playChimeFirst?: boolean;
  }
): void => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onEnd?.();
    return;
  }

  const settings = getVoiceSettings();
  if (!settings.enabled) {
    options?.onEnd?.();
    return;
  }

  const executeSpeech = () => {
    stopSpeaking();
    const sessionId = currentSpeechSessionId;

    // Clean markdown, bullet points, asterisks, brackets, and emojis for smooth pronunciation
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*#_`~>]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    // Workaround for Chrome cancel bug: delay speak slightly after cancel
    pendingSpeechTimeoutId = setTimeout(() => {
      pendingSpeechTimeoutId = null;
      if (sessionId !== currentSpeechSessionId) {
        return; // Interrupted or cancelled before starting!
      }

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
        const isHindiDevanagari = /[\u0900-\u097F]/.test(cleanText);
        const isHinglish = /\b(namaste|pranam|kaise|aap|kripya|dawakhana|dawai|kya|hai|hoon|ho|accha|shukriya|dhanyawad|theek|bataiye|beti|beta|madad|khyal)\b/i.test(
          cleanText
        );
        const targetLang = options?.lang || (isHindiDevanagari || isHinglish ? 'hi-IN' : 'en-IN');

        // Locate best matching Hindi/Indian or local voice
        let selectedVoice: SpeechSynthesisVoice | undefined;

        if (targetLang.startsWith('hi') || isHindiDevanagari || isHinglish) {
          // Priority 1: Direct Hindi voice
          selectedVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('hi') ||
              v.name.toLowerCase().includes('hindi') ||
              v.name.toLowerCase().includes('swara') ||
              v.name.toLowerCase().includes('madhur') ||
              v.name.toLowerCase().includes('kalpana') ||
              v.name.toLowerCase().includes('hemant')
          );

          // Priority 2: Indian English voice (reads Hindi phonetics naturally)
          if (!selectedVoice) {
            selectedVoice = voices.find(
              (v) =>
                v.lang.toLowerCase().startsWith('en-in') ||
                v.name.toLowerCase().includes('india') ||
                v.name.toLowerCase().includes('neerja') ||
                v.name.toLowerCase().includes('ravi') ||
                v.name.toLowerCase().includes('heera')
            );
          }
        } else {
          // English voice preference
          selectedVoice = voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Jenny') ||
                v.name.includes('Aria') ||
                v.name.includes('Samantha') ||
                v.name.includes('Zira') ||
                v.name.includes('English'))
          );
        }

        // Priority 3: Fallback to first natural/default voice
        if (!selectedVoice && voices.length > 0) {
          selectedVoice = voices.find((v) => v.default) || voices[0];
        }

        // Chunk long text into natural sentences
        const chunks = splitIntoSpeechChunks(cleanText);
        let currentChunkIndex = 0;

        startKeepAlive();

        const speakNextChunk = () => {
          if (sessionId !== currentSpeechSessionId) {
            stopKeepAlive();
            return; // Immediate session abort!
          }

          if (currentChunkIndex >= chunks.length) {
            stopKeepAlive();
            options?.onEnd?.();
            return;
          }

          const chunkText = chunks[currentChunkIndex];
          const utterance = new SpeechSynthesisUtterance(chunkText);
          utterance.rate = options?.rate ?? settings.rate;
          utterance.pitch = 1.0;
          utterance.lang = targetLang;

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }

          utterance.onend = () => {
            if (sessionId !== currentSpeechSessionId) {
              stopKeepAlive();
              return; // Stopped during utterance
            }
            currentChunkIndex++;
            speakNextChunk();
          };

          utterance.onerror = (e) => {
            // If interrupted, canceled, or session changed, CEASE IMMEDIATELY!
            if (
              sessionId !== currentSpeechSessionId ||
              e.error === 'interrupted' ||
              e.error === 'canceled'
            ) {
              stopKeepAlive();
              options?.onEnd?.();
              return;
            }
            console.warn('[SpeechSynthesis] Chunk utterance error:', e);
            currentChunkIndex++;
            if (currentChunkIndex >= chunks.length) {
              stopKeepAlive();
              options?.onError?.() || options?.onEnd?.();
            } else {
              speakNextChunk();
            }
          };

          window.speechSynthesis.speak(utterance);
        };

        speakNextChunk();
      } catch (err) {
        console.warn('[SpeechSynthesis] Failed to initiate speech:', err);
        stopKeepAlive();
        options?.onError?.() || options?.onEnd?.();
      }
    }, 40);
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
  let speech = `नमस्ते जी! आपके लिए एक रिमाइंडर है: ${reminder.title}.`;
  if (reminder.description) {
    speech += ` निर्देश: ${reminder.description}.`;
  }
  if (reminder.scheduledAt) {
    try {
      const timeStr = new Date(reminder.scheduledAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      speech += ` समय: ${timeStr}.`;
    } catch {
      // ignore
    }
  }

  speakText(speech, { playChimeFirst: true, lang: 'hi-IN', onEnd });
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
  const titles = reminders.map((r) => r.title).join(', और ');
  const speech = `ध्यान दीजिए! आपके पास ${count} जरूरी रिमाइंडर तैयार हैं: ${titles}. कृपया अपनी दवाई या कार्य पूरा करें और 'Done' बटन दबाएं!`;

  speakText(speech, { playChimeFirst: true, lang: 'hi-IN', onEnd });
};

