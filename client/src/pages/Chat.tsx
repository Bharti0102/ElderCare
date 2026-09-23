import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  Trash2,
  Loader2,
  Heart,
  ShieldAlert,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  sendAgentMessage,
  getChatHistory,
  clearChatHistory,
  ChatHistoryMessage,
} from '../services/agent.service';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { VoiceWaveform } from '../components/voice/VoiceWaveform';
import { speakText } from '../services/voiceNotification.service';

const INITIAL_SUGGESTIONS = [
  'Tell me a gentle story',
  'I am feeling a little lonely today',
  'How are you today?',
  'Remind me to take my medicine at 8 PM',
  'Call my daughter',
];

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [error, setError] = useState<string | null>(null);
  const [autoVoiceReply, setAutoVoiceReply] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    state: voiceState,
    isListening,
    isSpeaking,
    transcript: voiceTranscript,
    startListening,
    stopListening,
    handleInterrupt,
  } = useVoiceAssistant({
    autoSpeak: autoVoiceReply,
    onSuccess: (result) => {
      const userMsg: ChatHistoryMessage = {
        role: 'user',
        content: result.transcript,
        timestamp: new Date().toISOString(),
      };
      const assistantMsg: ChatHistoryMessage = {
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
      }
    },
    onError: (err) => {
      setError(err);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (user) {
      setFetchingHistory(true);
      getChatHistory()
        .then((history) => {
          if (history.length > 0) {
            setMessages(history);
          } else {
            setMessages([
              {
                role: 'assistant',
                content: `Warm greetings, ${user.name.split(' ')[0]}! I am your ElderCare AI Companion. I am here to chat with you, share comforting stories, listen whenever you want to talk, or help coordinate with your caregivers. How are you feeling today?`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        })
        .catch((err) => {
          console.warn('Failed to load history:', err);
        })
        .finally(() => {
          setFetchingHistory(false);
          scrollToBottom();
        });
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading || !user) return;

    // Interrupt any ongoing voice playback
    handleInterrupt();

    const userMsg: ChatHistoryMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    setError(null);

    try {
      const response = await sendAgentMessage(userMsg.content);

      const assistantMsg: ChatHistoryMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }

      if (autoVoiceReply) {
        speakText(response.reply);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with AI agent.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all conversation history?')) return;
    try {
      await clearChatHistory();
      setMessages([
        {
          role: 'assistant',
          content: 'Conversation history cleared. I am here whenever you want to chat!',
          timestamp: new Date().toISOString(),
        },
      ]);
      setSuggestions(INITIAL_SUGGESTIONS);
    } catch (err: any) {
      setError(err.message || 'Failed to clear history');
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto">
          <Bot className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Please Sign In</h2>
          <p className="text-slate-600 mt-2">
            You must be logged in to chat with your personal AI companion.
          </p>
        </div>
        <Link to="/login" className="elder-btn-primary inline-flex">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Voice-Enabled AI Companion
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            Conversational AI Companion & Voice
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Empathetic daily conversation, storytelling, voice coordination, and hands-free microphone input.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Voice Readout Toggle */}
          <button
            onClick={() => setAutoVoiceReply(!autoVoiceReply)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
              autoVoiceReply
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
            title="Toggle Voice Readout"
          >
            {autoVoiceReply ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>Voice: On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>Voice: Muted</span>
              </>
            )}
          </button>

          <button
            onClick={handleClearHistory}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
            title="Clear Conversation History"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Chat Container */}
      <div className="elder-card h-[550px] flex flex-col justify-between overflow-hidden shadow-sm">
        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/40">
          {fetchingHistory ? (
            <div className="py-20 flex justify-center text-brand-600">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white shadow-xs ${
                      isUser
                        ? 'bg-gradient-to-tr from-brand-600 to-sky-500'
                        : 'bg-gradient-to-tr from-slate-700 to-slate-900'
                    }`}
                  >
                    {isUser ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>

                  <div
                    className={`max-w-[82%] sm:max-w-[75%] p-4 rounded-2xl text-base leading-relaxed ${
                      isUser
                        ? 'bg-brand-600 text-white rounded-tr-xs shadow-sm font-medium'
                        : 'bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <span
                      className={`block text-[11px] mt-1.5 ${
                        isUser ? 'text-sky-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white bg-slate-800 shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span className="text-sm font-medium">ElderCare AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Suggestions:
          </span>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(suggestion)}
              disabled={loading}
              className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 transition-colors border border-slate-200 hover:border-brand-200 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Live Voice Status Bar (Visible when voice assistant is active) */}
        {voiceState !== 'idle' && (
          <div className="px-6 py-2.5 bg-gradient-to-r from-brand-50 via-sky-50 to-brand-50 border-t border-brand-100 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-3">
              <VoiceWaveform state={voiceState} />
              <span className="text-brand-900">
                {voiceState === 'listening' && (voiceTranscript ? `"${voiceTranscript}"` : 'Listening... Speak your request')}
                {voiceState === 'processing' && 'Processing voice through ElderCare AI...'}
                {voiceState === 'speaking' && 'ElderCare Companion is speaking...'}
              </span>
            </div>
            {isSpeaking && (
              <button
                type="button"
                onClick={handleInterrupt}
                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center gap-1 text-[11px] transition-colors"
              >
                <Square className="w-3 h-3 fill-rose-700" />
                <span>Stop Voice</span>
              </button>
            )}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 sm:gap-3"
          >
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  handleInterrupt();
                } else if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={`p-3.5 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
                isListening
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md animate-pulse'
                  : isSpeaking
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border-brand-200 shadow-xs'
              }`}
              title={
                isSpeaking
                  ? 'Stop speech playback'
                  : isListening
                  ? 'Stop listening'
                  : 'Tap to speak hands-free'
              }
            >
              {isSpeaking ? (
                <Square className="w-5 h-5 fill-white" />
              ) : isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message or tap the mic to speak hands-free..."
              className="flex-1 px-4 py-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none text-base"
              disabled={loading || isListening}
            />

            <button
              type="submit"
              disabled={loading || !inputText.trim() || isListening}
              className="elder-btn-primary px-5 py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
