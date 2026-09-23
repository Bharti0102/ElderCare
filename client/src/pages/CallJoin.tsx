import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  AlertCircle,
  Heart,
  CheckCircle2,
  ShieldCheck,
  User,
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
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

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
      } catch {
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

  // Attach local video stream when element mounts
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      WebRTCService.attachVideo(localVideoRef.current, localStreamRef.current);
    }
  }, [hasJoined, isCameraActive]);

  // Attach remote video stream when element mounts or stream updates
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      WebRTCService.attachVideo(remoteVideoRef.current, remoteStreamRef.current);
    }
  }, [hasJoined, hasRemoteVideo]);

  const handleJoinCall = async (withVideo: boolean = true) => {
    if (!callId) return;
    try {
      setIsConnecting(true);
      setError(null);

      const localStream = await WebRTCService.joinCall({
        callId,
        userId: 'guest-caregiver',
        video: withVideo,
        onLocalStream: (stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            WebRTCService.attachVideo(localVideoRef.current, stream);
          }
          setIsCameraActive(stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled);
        },
        onRemoteStream: (stream) => {
          remoteStreamRef.current = stream;
          const hasVideoTrack = stream.getVideoTracks().length > 0;
          setHasRemoteVideo(hasVideoTrack);
          if (remoteVideoRef.current) {
            WebRTCService.attachVideo(remoteVideoRef.current, stream);
          }
        },
        onAudioLevel: (level) => setAudioLevel(level),
        onCallEnded: () => {
          setIsCallEnded(true);
          setHasJoined(false);
        },
      });

      localStreamRef.current = localStream;
      setIsCameraActive(localStream.getVideoTracks().length > 0 && localStream.getVideoTracks()[0].enabled);
      setHasJoined(true);
    } catch (err: any) {
      console.error('Failed to join call:', err);
      setError(err.message || 'Failed to access camera/microphone or join call.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToggleMute = () => {
    const muted = WebRTCService.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleCamera = async () => {
    const active = await WebRTCService.toggleCamera();
    setIsCameraActive(active);
    if (localVideoRef.current && localStreamRef.current) {
      WebRTCService.attachVideo(localVideoRef.current, localStreamRef.current);
    }
  };

  const handleHangup = async () => {
    WebRTCService.endCall();
    setIsCallEnded(true);
    setHasJoined(false);

    if (callId) {
      try {
        const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
        await fetch(`${serverUrl}/api/calls/public/${callId}/hangup`, {
          method: 'POST',
        });
      } catch (err) {
        console.warn('Notice recording public call hangup:', err);
      }
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-3 sm:p-6">
      {/* Brand Header */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 mb-2">
          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
          <span>ElderCare AI • Caregiver Live Line</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Video & Audio Call Room
        </h1>
      </div>

      {/* Main Call Container */}
      <div className="w-full max-w-2xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-300">Connecting to secure call room...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">Call Unavailable</h2>
            <p className="text-sm text-slate-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : isCallEnded ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
              <PhoneOff className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Call Concluded</h2>
            <p className="text-sm text-slate-300">
              The conversation with <span className="font-bold text-white">{callInfo?.callerName || 'your loved one'}</span> has ended.
            </p>
            {callDuration > 0 && (
              <p className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/60 py-1.5 px-3 rounded-full inline-block border border-indigo-800/40">
                Call Duration: {formatDuration(callDuration)}
              </p>
            )}
            <div className="pt-3">
              <button
                onClick={() => window.close()}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg transition-colors"
              >
                Close Tab
              </button>
            </div>
          </div>
        ) : !hasJoined ? (
          /* Pre-Join Screen */
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <PhoneCall className="w-12 h-12 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400"></span>
              </span>
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                Incoming Connection
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
                {callInfo?.callerName || 'Elderly Parent'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Calling for: <span className="font-semibold text-white">{callInfo?.contactName}</span> ({callInfo?.relationship})
              </p>
            </div>

            <div className="p-4 bg-slate-800/70 rounded-2xl border border-slate-700/60 text-xs text-slate-300 text-left flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-white">Private Encrypted Call</p>
                <p className="text-slate-400">
                  Connect instantly in full HD audio and video. No account or app download required. Works on all mobile devices.
                </p>
              </div>
            </div>

            {/* Join Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleJoinCall(true)}
                disabled={isConnecting}
                className="py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl shadow-emerald-950/60 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting Video...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    <span>Join with Video</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleJoinCall(false)}
                disabled={isConnecting}
                className="py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-base border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <PhoneCall className="w-5 h-5 text-sky-400" />
                <span>Voice Only</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active In-Call Video Stage */
          <div className="flex flex-col h-[75vh] max-h-[640px] min-h-[460px] relative bg-black">
            {/* Top Bar Floating Status */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-xs font-bold text-white shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{hasRemoteVideo ? 'HD Video Call' : 'Audio Call'}</span>
              </div>

              <div className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 font-mono text-xs font-black text-white shadow-lg">
                {formatDuration(callDuration)}
              </div>
            </div>

            {/* Remote Video Stream (Center Stage) */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 to-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  hasRemoteVideo ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                }`}
              />

              {/* Fallback Display when remote video is not streaming or off */}
              {!hasRemoteVideo && (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl border-4 border-white/20">
                    {callInfo?.callerName?.charAt(0) || 'P'}
                    <span className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-30" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      {callInfo?.callerName || 'Elderly Parent'}
                    </h3>
                    <p className="text-xs text-indigo-300 mt-1">Audio Live • Connected Directly</p>
                  </div>
                  <VoiceWaveform state={audioLevel > 10 ? 'listening' : 'speaking'} />
                </div>
              )}

              {/* Floating Local Selfie PiP */}
              <div className="absolute bottom-20 right-4 z-20 w-28 sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900 flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: 'scaleX(-1)' }}
                  className={`w-full h-full object-cover ${
                    isCameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                  }`}
                />
                {!isCameraActive && (
                  <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                    <User className="w-6 h-6 mb-1 text-slate-500" />
                    <span className="text-[10px] font-bold">Camera Off</span>
                  </div>
                )}
                <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[9px] font-bold text-white tracking-wider">
                  You
                </span>
              </div>
            </div>

            {/* Bottom In-Call Controls Dock */}
            <div className="p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-center gap-4 z-20">
              {/* Mic Toggle */}
              <button
                onClick={handleToggleMute}
                className={`p-3.5 rounded-full transition-all shadow-md active:scale-95 ${
                  isMuted
                    ? 'bg-rose-600 text-white shadow-rose-900/40'
                    : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Camera Toggle */}
              <button
                onClick={handleToggleCamera}
                className={`p-3.5 rounded-full transition-all shadow-md active:scale-95 ${
                  !isCameraActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-900/40'
                    : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                }`}
                title={isCameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {isCameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {/* End Call Button */}
              <button
                onClick={handleHangup}
                className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm shadow-xl shadow-rose-900/50 active:scale-95 transition-all flex items-center gap-2"
                title="End Call"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reassurance Footer */}
      <div className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span>Private Encrypted Call • No App Download Required</span>
      </div>
    </div>
  );
};
