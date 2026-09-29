import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  Trash2,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Languages,
  Check,
  ChevronDown,
  Copy,
  CheckCheck,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  sendAgentMessage,
  getChatHistory,
  clearChatHistory,
  getChatSessions,
  createChatSession,
  deleteChatSession,
  ChatHistoryMessage,
  ChatSession,
} from '../services/agent.service';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { VoiceWaveform } from '../components/voice/VoiceWaveform';
import { speakText, stopSpeaking } from '../services/voiceNotification.service';

const INITIAL_SUGGESTIONS = [
  'Tell me a gentle and peaceful story',
  'Tell me a story in English',
  'एक सुंदर और सुकून देने वाली कहानी सुनाइए',
  'नमस्ते, आज मुझे अकेलापन लग रहा है',
  'Remind me to take my medicine at 8 PM',
  'Call my daughter',
];

type SupportedLang = 'auto' | 'en' | 'hi' | 'hinglish';

export const Chat: React.FC = () => {
  const { user } = useAuth();

  // Sessions and Active Chat state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('ElderCare Companion');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Messages and Input
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Language & Voice Settings
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLang>('auto');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [autoVoiceReply, setAutoVoiceReply] = useState<boolean>(true);
  const [playingMsgIndex, setPlayingMsgIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Map language to speech recognition locale
  const getRecognitionLocale = (lang: SupportedLang): 'hi-IN' | 'en-IN' | 'en-US' => {
    if (lang === 'hi') return 'hi-IN';
    if (lang === 'en') return 'en-US';
    return 'hi-IN'; // auto default for Indian elderly context
  };

  const {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    handleInterrupt,
  } = useVoiceAssistant({
    autoSpeak: autoVoiceReply,
    lang: getRecognitionLocale(selectedLanguage),
    continuousMode: false,
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
      refreshSessions();
    },
    onError: (err) => {
      setError(err);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load chat sessions on mount
  const refreshSessions = async () => {
    try {
      const sessionList = await getChatSessions();
      setSessions(sessionList);
      return sessionList;
    } catch {
      return [];
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (!user) return;
    refreshSessions().then((sessionList) => {
      if (sessionList && sessionList.length > 0) {
        loadSession(sessionList[0].id);
      } else {
        loadSession(); // load default
      }
    });
  }, [user]);

  // Load specific conversation session
  const loadSession = async (sessionId?: string) => {
    try {
      setFetchingHistory(true);
      setError(null);
      const data = await getChatHistory(sessionId);
      setActiveSessionId(data.sessionId || null);
      setActiveTitle(data.title || 'ElderCare Companion');
      setMessages(data.messages || []);
    } catch {
      setError('Unable to load conversation. Please check your network.');
    } finally {
      setFetchingHistory(false);
    }
  };

  // Create brand new chat session
  const handleNewChat = async () => {
    try {
      setLoading(true);
      const newSessionId = await createChatSession('New Conversation');
      await refreshSessions();
      if (newSessionId) {
        await loadSession(newSessionId);
      } else {
        setMessages([]);
        setActiveSessionId(null);
        setActiveTitle('New Conversation');
      }
      setInputText('');
      if (textareaRef.current) textareaRef.current.focus();
    } catch {
      setError('Failed to start new chat.');
    } finally {
      setLoading(false);
    }
  };

  // Delete a session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sessionId);
      const remaining = await refreshSessions();
      if (activeSessionId === sessionId) {
        if (remaining && remaining.length > 0) {
          loadSession(remaining[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch {
      setError('Failed to delete chat session.');
    }
  };

  // Clear current chat
  const handleClearCurrentChat = async () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      try {
        await clearChatHistory(activeSessionId || undefined);
        setMessages([]);
        await refreshSessions();
      } catch {
        setError('Failed to clear conversation.');
      }
    }
  };

  // Dedicated Speech Stop: Immediately cancels audio and returns to idle
  const handleStopSpeaking = () => {
    stopSpeaking();
    handleInterrupt();
    setPlayingMsgIndex(null);
  };

  // Dedicated Mic Handler: If companion is talking/reading aloud, immediately cancel speech and start listening
  const handleMicToggle = () => {
    handleStopSpeaking();
    setLoading(false);

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || loading) return;

    // If companion was speaking, stop it
    stopSpeaking();
    setPlayingMsgIndex(null);

    setInputText('');
    setError(null);

    const userMessage: ChatHistoryMessage = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await sendAgentMessage(messageContent, {
        sessionId: activeSessionId || undefined,
        language: selectedLanguage !== 'auto' ? selectedLanguage : undefined,
      });

      const assistantMessage: ChatHistoryMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        intent: response.intent,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }

      // Auto speak response if enabled
      if (autoVoiceReply) {
        const isHindiText = /[\u0900-\u097F]/.test(response.reply);
        const voiceLang = isHindiText ? 'hi-IN' : 'en-US';
        const msgIdx = messages.length + 1;
        setPlayingMsgIndex(msgIdx);
        speakText(response.reply, {
          lang: voiceLang,
          onEnd: () => setPlayingMsgIndex(null),
          onError: () => setPlayingMsgIndex(null),
        });
      }

      await refreshSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to get response.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key submit in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Read message aloud
  const handlePlayMessageAudio = (text: string, index: number) => {
    if (playingMsgIndex === index) {
      stopSpeaking();
      setPlayingMsgIndex(null);
    } else {
      const isHindiText = /[\u0900-\u097F]/.test(text);
      const voiceLang = isHindiText ? 'hi-IN' : 'en-US';
      speakText(text, {
        lang: voiceLang,
        onEnd: () => setPlayingMsgIndex(null),
        onError: () => setPlayingMsgIndex(null),
      });
      setPlayingMsgIndex(index);
    }
  };

  // Copy message text
  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getLanguageLabel = (lang: SupportedLang) => {
    switch (lang) {
      case 'en':
        return 'English';
      case 'hi':
        return 'हिंदी (Hindi)';
      case 'hinglish':
        return 'Hinglish';
      default:
        return 'Auto Detect 🌐';
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR: ChatGPT-Style Conversation History       */}
      {/* ========================================================= */}
      <aside
        className={`${
          isSidebarOpen ? 'w-72 sm:w-80' : 'w-0'
        } transition-all duration-300 ease-in-out bg-slate-950/90 border-r border-slate-800/80 flex flex-col overflow-hidden relative z-20 shrink-0`}
      >
        {/* Sidebar Header: New Chat Button */}
        <div className="p-4 border-b border-slate-800/60 flex items-center justify-between gap-2">
          <button
            onClick={handleNewChat}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            title="Start a new conversation"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Chat</span>
          </button>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors lg:hidden"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
            Recent Conversations
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 px-4">
              No previous chats yet. Start a new conversation!
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className={`group relative flex items-center justify-between p-3 rounded-2xl cursor-pointer text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-white shadow-xs border border-slate-700/80'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-6">
                    <MessageSquare
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div className="truncate font-semibold">{s.title || 'New Conversation'}</div>
                  </div>

                  {/* Delete button on hover */}
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition-all absolute right-2"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: User Status */}
        <div className="p-3.5 border-t border-slate-800/60 flex items-center gap-3 bg-slate-950/60">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-200 truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-500 truncate">Senior Member</div>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. CENTER / MAIN CHAT AREA                                */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Open previous chats"
              >
                <PanelLeft className="w-5 h-5 text-emerald-400" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate max-w-[200px] sm:max-w-md">
                  {activeTitle}
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Compassionate Voice & Companion AI
              </p>
            </div>
          </div>

          {/* Right Header Controls: Dynamic Language Tag & Voice Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Tag Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-white font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors shadow-xs"
                title="Choose conversation language"
              >
                <Languages className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Lang:</span>
                <span className="text-emerald-300 font-bold">{getLanguageLabel(selectedLanguage)}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-800 border border-slate-700 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Select Language
                  </div>
                  {(['auto', 'en', 'hi', 'hinglish'] as SupportedLang[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full text-left py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        selectedLanguage === lang
                          ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{getLanguageLabel(lang)}</span>
                      {selectedLanguage === lang && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Read Aloud Toggle */}
            <button
              onClick={() => {
                setAutoVoiceReply(!autoVoiceReply);
                if (autoVoiceReply) stopSpeaking();
              }}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                autoVoiceReply
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={autoVoiceReply ? 'Voice Read-Aloud is ON' : 'Voice Read-Aloud is OFF'}
            >
              {autoVoiceReply ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={handleClearCurrentChat}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 text-slate-400 hover:text-rose-300 transition-colors"
                title="Clear current messages"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ========================================================= */}
        {/* Chat Message Stream                                       */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {fetchingHistory ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm">Loading conversation history...</p>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State / Welcome Screen */
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center space-y-6 p-4">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/20 animate-pulse">
                <HeartHandshake className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Welcome to ElderCare AI Companion
                </h2>
                <p className="text-slate-400 text-sm sm:text-base max-w-lg leading-relaxed">
                  I am here to chat, tell soothing stories, help with medication reminders, or just keep you company. Ask me anything in English or Hindi!
                </p>
              </div>

              {/* Quick Prompt Suggestion Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
                {INITIAL_SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white text-xs sm:text-sm text-left font-medium transition-all shadow-sm active:scale-98 flex items-center gap-2 group"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 group-hover:rotate-12 transition-transform" />
                    <span className="truncate">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Message History */
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 sm:gap-4 ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    } animate-in fade-in duration-200`}
                  >
                    {/* Avatar */}
                    <div
                      className={`h-9 w-9 sm:h-10 sm:w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                        isUser
                          ? 'bg-slate-700 text-white'
                          : 'bg-emerald-600 text-white shadow-emerald-600/30'
                      }`}
                    >
                      {isUser ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>

                    {/* Bubble Content */}
                    <div
                      className={`relative max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 text-sm sm:text-base leading-relaxed ${
                        isUser
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 rounded-tr-sm'
                          : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 shadow-lg rounded-tl-sm'
                      }`}
                    >
                      {/* Message Text with Clean Paragraph Formatting */}
                      <div className="whitespace-pre-wrap space-y-2 font-normal">
                        {msg.content}
                      </div>

                      {/* Footer Actions for Assistant Messages */}
                      {!isUser && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            {/* Read Aloud / Stop Button */}
                            <button
                              onClick={() => handlePlayMessageAudio(msg.content, index)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
                                playingMsgIndex === index
                                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 font-bold animate-pulse'
                                  : 'hover:bg-slate-700/80 text-slate-400 hover:text-slate-200'
                              }`}
                              title={playingMsgIndex === index ? 'Stop speaking immediately' : 'Read aloud'}
                            >
                              {playingMsgIndex === index ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>

                            {/* Copy Text Button */}
                            <button
                              onClick={() => handleCopyText(msg.content, index)}
                              className="p-1 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors"
                              title="Copy message"
                            >
                              {copiedIndex === index ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex items-start gap-3 sm:gap-4 animate-in fade-in">
                  <div className="h-9 w-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="bg-slate-800/90 border border-slate-700/60 rounded-3xl p-4 sm:p-5 text-sm text-slate-300 flex items-center gap-3">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Thinking sweetly...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mb-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold underline text-rose-400 ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Suggestion Chips above Input (if any) */}
        {messages.length > 0 && suggestions.length > 0 && !loading && (
          <div className="px-4 py-1.5 overflow-x-auto flex items-center gap-2 max-w-3xl mx-auto w-full no-scrollbar">
            {suggestions.slice(0, 3).map((sugg, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(sugg)}
                className="shrink-0 text-xs font-medium py-1.5 px-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              >
                + {sugg}
              </button>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* Floating Input Capsule (ChatGPT Style)                   */}
        {/* ========================================================= */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800/80">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Live Mic Listening Waveform Banner */}
            {isListening && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                  <VoiceWaveform state="listening" label="Listening..." />
                  <span className="text-xs font-semibold text-emerald-300">
                    Listening to you... Speak in Hindi or English
                  </span>
                </div>
                <button
                  onClick={stopListening}
                  className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
                >
                  Stop
                </button>
              </div>
            )}

            {/* Companion Speaking Indicator Banner */}
            {(isSpeaking || playingMsgIndex !== null) && !isListening && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span className="font-semibold">Companion is speaking...</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStopSpeaking}
                    className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    title="Stop speaking immediately"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                  <button
                    onClick={handleMicToggle}
                    className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Stop voice and start talking"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Interrupt & Speak</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input Capsule */}
            <div className="relative flex items-center bg-slate-950 border border-slate-700/80 rounded-3xl p-1.5 shadow-inner focus-within:border-emerald-500 transition-colors">
              {/* Voice Microphone Toggle Button */}
              <button
                onClick={handleMicToggle}
                className={`p-3 rounded-full transition-all shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : isSpeaking || playingMsgIndex !== null
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-bounce shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
                title={
                  isListening
                    ? 'Click to stop listening'
                    : isSpeaking || playingMsgIndex !== null
                    ? 'Companion is speaking: Click to pause and speak'
                    : 'Click to speak using microphone'
                }
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className={`w-5 h-5 ${isSpeaking || playingMsgIndex !== null ? 'text-slate-950 font-bold' : 'text-emerald-400'}`} />
                )}
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  // When the user begins typing, immediately silence companion speech
                  if (playingMsgIndex !== null || isSpeaking) {
                    handleStopSpeaking();
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedLanguage === 'hi'
                    ? 'यहाँ अपनी बात लिखें या बोलें... (Enter दबाएं)'
                    : selectedLanguage === 'en'
                    ? 'Type or speak to your companion... (Press Enter)'
                    : 'Type in English, Hindi, or Hinglish... (Press Enter)'
                }
                rows={1}
                className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none resize-none max-h-32"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || loading}
                className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 transition-all shrink-0 active:scale-95 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Safety & Help Note */}
            <p className="text-center text-[11px] text-slate-500">
              ElderCare AI provides companionship & daily support. For medical emergencies, call your doctor or dial 112.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
