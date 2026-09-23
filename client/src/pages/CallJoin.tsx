import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  AlertCircle,
  Heart,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { WebRTCService } from '../services/webrtc.service';
import { VoiceWaveform } from '../components/voice/VoiceWaveform';

interface PublicCallInfo {
  _id: string;
  callerName: string;
  contactName: string;
  relationship: string;
  status: string;
  startedAt: string;
}

export const CallJoin: React.FC = () => {
  const { callId } = useParams<{ callId: string }>();

  const [callInfo, setCallInfo] = useState<PublicCallInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Call connection state
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  // Fetch call information on mount
  useEffect(() => {
    if (!callId) {
      setError('Invalid call link. No call ID provided.');
      setLoading(false);
      return;
    }

    const fetchCallInfo = async () => {
      try {
        setLoading(true);
        const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
        const res = await fetch(`${serverUrl}/api/calls/public/${callId}`);
        const data = await res.json();

        if (data.success && data.data?.call) {
          setCallInfo(data.data.call);
          if (data.data.call.status === 'COMPLETED') {
            setIsCallEnded(true);
          }
        } else {
          setError(data.error?.message || 'Call room not found or expired.');
        }
      } catch (err: any) {
        setError('Unable to connect to calling server. Please check your network.');
      } finally {
        setLoading(false);
      }
    };

    fetchCallInfo();
  }, [callId]);

  // Call duration counter
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (hasJoined && !isCallEnded) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [hasJoined, isCallEnded]);

  const handleJoinCall = async () => {
    if (!callId) return;
    try {
      setIsConnecting(true);
      setError(null);

      await WebRTCService.joinCall({
        callId,
        userId: 'guest-caregiver',
        onAudioLevel: (level) => setAudioLevel(level),
        onCallEnded: () => {
          setIsCallEnded(true);
          setHasJoined(false);
        },
      });

      setHasJoined(true);
    } catch (err: any) {
      console.error('Failed to join call:', err);
      setError(err.message || 'Failed to access microphone or join call.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToggleMute = () => {
    const muted = WebRTCService.toggleMute();
    setIsMuted(muted);
  };

  const handleHangup = () => {
    WebRTCService.endCall();
    setIsCallEnded(true);
    setHasJoined(false);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-slate-50 to-white flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-800 text-xs font-bold mb-3 shadow-xs">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>ElderCare AI • Caregiver Live Line</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Direct Audio Call Room
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Instant WebRTC voice connection with your loved one
        </p>
      </div>

      {/* Main Call Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Connecting to call room...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Call Unavailable</h2>
            <p className="text-sm text-slate-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : isCallEnded ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <PhoneOff className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Call Ended</h2>
            <p className="text-sm text-slate-600">
              The conversation with {callInfo?.callerName || 'your loved one'} has concluded.
            </p>
            {callDuration > 0 && (
              <p className="text-xs font-semibold text-slate-500">
                Duration: {formatDuration(callDuration)}
              </p>
            )}
            <div className="pt-2">
              <button
                onClick={() => window.close()}
                className="px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold shadow-md hover:bg-brand-700 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : !hasJoined ? (
          /* Pre-Join Screen */
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center">
              <PhoneCall className="w-12 h-12 text-emerald-600 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Incoming Connection
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-3">
                {callInfo?.callerName || 'Elderly Parent'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Calling for: <span className="font-semibold text-slate-800">{callInfo?.contactName}</span> ({callInfo?.relationship})
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>
                Encrypted in-browser WebRTC call. No phone number or app installation needed. Your microphone will be used for audio.
              </span>
            </div>

            <button
              onClick={handleJoinCall}
              disabled={isConnecting}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 text-white font-extrabold text-lg shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting Audio...</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6" />
                  <span>Tap to Join Audio Call</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Active In-Call Screen */
          <div className="text-center space-y-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Call
              </span>
              <span className="font-mono text-base font-extrabold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl">
                {formatDuration(callDuration)}
              </span>
            </div>

            <div className="py-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg font-black text-3xl">
                {callInfo?.callerName?.charAt(0) || 'P'}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-4">
                {callInfo?.callerName || 'Elderly Parent'}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Speaking via WebRTC In-Browser Audio
              </p>
            </div>

            {/* Live Audio Visualizer */}
            <div className="flex justify-center">
              <VoiceWaveform state={audioLevel > 10 ? 'listening' : 'speaking'} />
            </div>

            {/* In-Call Controls */}
            <div className="pt-2 flex items-center justify-center gap-4">
              <button
                onClick={handleToggleMute}
                className={`p-4 rounded-full transition-all shadow-md active:scale-95 ${
                  isMuted
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border-2 border-rose-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={handleHangup}
                className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
                title="Hang Up"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {isMuted ? 'Your microphone is muted' : 'Microphone is active • Speak naturally'}
            </p>
          </div>
        )}
      </div>

      {/* Footer reassurance */}
      <div className="mt-8 text-xs text-slate-500 flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>ElderCare AI Secure Healthcare VoIP Signaling</span>
      </div>
    </div>
  );
};
