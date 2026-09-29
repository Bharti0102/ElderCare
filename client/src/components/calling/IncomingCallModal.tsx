import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface IncomingCallData {
  callId: string;
  callerName: string;
  contactName: string;
  relationship?: string;
  callType?: 'VOICE' | 'VIDEO';
  startedAt?: string;
}

export const IncomingCallModal: React.FC = () => {
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Play synthetic telephone ring tone using Web Audio API
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playBurst = () => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        // US standard ringtone frequencies: 440Hz & 480Hz
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.8);
        osc2.stop(ctx.currentTime + 1.8);
      };

      playBurst();
      ringIntervalRef.current = setInterval(playBurst, 3500);

      // Trigger hardware vibration if available
      if ('vibrate' in navigator) {
        navigator.vibrate([400, 200, 400, 200, 800]);
      }
    } catch (e) {
      console.warn('[IncomingCallModal] Audio ringtone notice:', e);
    }
  };

  const stopRingtone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  useEffect(() => {
    // Connect to Socket.IO signaling server
    const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    // Check if this browser has a registered contactId or userId in localStorage
    const savedContactId = localStorage.getItem('eldercare_paired_contact_id');
    const savedUserId = localStorage.getItem('eldercare_user_id');
    if (savedContactId || savedUserId) {
      socket.emit('caregiver:register', {
        contactId: savedContactId,
        userId: savedUserId,
      });
    }

    // Listen for incoming call event
    socket.on('call:incoming', (call: IncomingCallData) => {
      console.log('📞 [IncomingCallModal] Received incoming call alert:', call);
      setIncomingCall(call);
      startRingtone();
    });

    socket.on('call:declined', () => {
      setIncomingCall(null);
      stopRingtone();
    });

    return () => {
      stopRingtone();
      socket.disconnect();
    };
  }, []);

  // Auto-dismiss if not answered in 45 seconds
  useEffect(() => {
    if (!incomingCall) return;
    const timeout = setTimeout(() => {
      handleDecline();
    }, 45000);
    return () => clearTimeout(timeout);
  }, [incomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;
    stopRingtone();
    const targetCallId = incomingCall.callId;
    setIncomingCall(null);
    navigate(`/call/join/${targetCallId}`);
  };

  const handleDecline = () => {
    if (!incomingCall) return;
    if (socketRef.current) {
      socketRef.current.emit('call:decline', { callId: incomingCall.callId });
    }
    stopRingtone();
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900 border border-slate-700/60 p-6 text-center text-white shadow-2xl">
        {/* Pulsing Aura Rings */}
        <div className="relative mx-auto my-6 flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-emerald-500/30 animate-pulse" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-500/50">
            <User className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Caller Info */}
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {incomingCall.callType === 'VIDEO' ? (
              <>
                <Video className="w-3.5 h-3.5" /> Incoming Video Call
              </>
            ) : (
              <>
                <Phone className="w-3.5 h-3.5" /> Incoming Voice Call
              </>
            )}
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white pt-2">{incomingCall.callerName}</h2>
          <p className="text-sm text-slate-400">
            {incomingCall.relationship ? `Relationship: ${incomingCall.relationship}` : 'ElderCare AI Live Direct Call'}
          </p>
        </div>

        {/* Action Buttons: WhatsApp Style Green Accept & Red Decline */}
        <div className="mt-8 flex items-center justify-around gap-4 pt-4 border-t border-slate-800">
          {/* Decline Button */}
          <button
            onClick={handleDecline}
            className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
            aria-label="Decline Call"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/40 group-hover:bg-rose-500 transition-colors">
              <PhoneOff className="h-7 w-7" />
            </div>
            <span className="text-xs font-semibold text-rose-400">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
            aria-label="Accept Call"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 animate-bounce group-hover:bg-emerald-400 transition-colors">
              <Phone className="h-7 w-7" />
            </div>
            <span className="text-xs font-semibold text-emerald-400">Accept Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
