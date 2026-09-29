import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Bot,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mic,
  Send,
  Radio,
  Volume2,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import {
  speakText,
  stopSpeaking,
  startTelephoneRinging,
  playReminderChime,
} from '../services/voiceNotification.service';
import { SpeechRecognitionService } from '../services/speechRecognition.service';

interface IncomingHospitalCall {
  callId: string;
  hospitalName: string;
  doctorName?: string;
  department?: string;
  receptionPhone: string;
  preferredDate?: string;
  preferredTime?: string;
  patientNotes?: string;
}

export const HospitalReceptionDesk: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingHospitalCall | null>(null);
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [aiSpeechText, setAiSpeechText] = useState<string>('');
  const [receptionSpeech, setReceptionSpeech] = useState<string>('');
  const [callStatusText, setCallStatusText] = useState<string>('Ready & waiting for incoming appointment calls...');
  const [callOutcome, setCallOutcome] = useState<'idle' | 'booked' | 'unavailable' | 'ended'>('idle');
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);

  const ringRef = useRef<{ stop: () => void } | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    const s = io(serverUrl, { transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('connect', () => {
      console.log('🏥 Connected to Hospital Reception Desk signaling server');
      s.emit('hospital:reception:register', {});
    });

    s.on('hospital:call:incoming', (data: IncomingHospitalCall) => {
      console.log('📞 Incoming AI Agent booking call:', data);
      setIncomingCall(data);
      setCallOutcome('idle');
      setCallStatusText(`Incoming Call from ElderCare AI Agent for Dr. ${data.doctorName || 'Doctor'}`);
      try {
        ringRef.current = startTelephoneRinging();
      } catch (e) {
        console.warn('Ring audio notice:', e);
      }
    });

    s.on('hospital:call:ended', () => {
      handleEndCall();
    });

    return () => {
      if (ringRef.current) ringRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeaking();
      SpeechRecognitionService.stopListening();
      s.disconnect();
    };
  }, []);

  // Answer Incoming Call
  const handleAnswerCall = () => {
    if (ringRef.current) {
      ringRef.current.stop();
      ringRef.current = null;
    }

    if (!incomingCall || !socket) return;
    socket.emit('hospital:call:answer', { callId: incomingCall.callId });

    setCallActive(true);
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    const query = `Hello, this is ElderCare AI calling on behalf of patient. I would like to inquire about an outpatient appointment with Dr. ${
      incomingCall.doctorName || 'the doctor'
    } on ${incomingCall.preferredDate || 'tomorrow'} around ${
      incomingCall.preferredTime || '10:30 AM'
    }. Do you have an open consultation slot available?`;

    setAiSpeechText(query);
    setCallStatusText('AI Agent speaking inquiry on line...');
    speakText(query);

    // After AI speaks, activate mic for receptionist
    setTimeout(() => {
      setCallStatusText('Your turn to respond as Hospital Receptionist:');
      setIsListeningMic(true);
      if (SpeechRecognitionService.isSupported()) {
        SpeechRecognitionService.startListening({
          lang: 'en-IN',
          onResult: (text, isFinal) => {
            setReceptionSpeech(text);
            if (isFinal && text.trim().length > 2) {
              submitReceptionResponse(text);
            }
          },
        });
      }
    }, 5500);
  };

  // Submit Receptionist (Receiver) Response
  const submitReceptionResponse = (text: string) => {
    if (!incomingCall || !socket) return;
    setIsListeningMic(false);
    SpeechRecognitionService.stopListening();

    const lower = text.toLowerCase();
    const isUnavailable =
      lower.includes('no') ||
      lower.includes('unavailable') ||
      lower.includes('not available') ||
      lower.includes('no slot') ||
      lower.includes('full') ||
      lower.includes('leave') ||
      lower.includes('closed') ||
      lower.includes('cancel');

    const isAvailable = !isUnavailable;

    // Emit response back to caller
    socket.emit('hospital:reception:speak', {
      callId: incomingCall.callId,
      text,
      isAvailable,
    });

    if (isAvailable) {
      setCallOutcome('booked');
      setCallStatusText(`Slot Confirmed! Booking finalized with Dr. ${incomingCall.doctorName || 'Doctor'}`);
      playReminderChime();
      const reply = `Thank you so much! I have confirmed and booked the appointment for Dr. ${
        incomingCall.doctorName || 'the doctor'
      }. Have a great day.`;
      setAiSpeechText(reply);
      speakText(reply);
    } else {
      setCallOutcome('unavailable');
      setCallStatusText(`Doctor Unavailable. No appointment booked.`);
      const reply = `Understood. Since Dr. ${
        incomingCall.doctorName || 'the doctor'
      } is unavailable, I will not book an appointment. Thank you for your time.`;
      setAiSpeechText(reply);
      speakText(reply);
    }
  };

  // End Call
  const handleEndCall = () => {
    if (ringRef.current) {
      ringRef.current.stop();
      ringRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopSpeaking();
    SpeechRecognitionService.stopListening();
    setIsListeningMic(false);
    setCallActive(false);
    setCallOutcome('ended');
    setCallStatusText('Call completed and closed.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">Hospital Reception Desk</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  Receiver Terminal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Live Clinic Receptionist Endpoint</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Online</span>
          </div>
        </div>

        {/* Status Display */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center">
          <p className="text-sm font-semibold text-slate-200">{callStatusText}</p>
          {callActive && (
            <p className="text-xs font-mono text-emerald-400 mt-1">
              Call Duration: {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
            </p>
          )}
        </div>

        {/* Incoming Call Screen */}
        {incomingCall && !callActive && callOutcome === 'idle' && (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 border-2 border-indigo-500/50 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-bounce">
              <Phone className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                Incoming AI Agent Call
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{incomingCall.hospitalName}</h2>
              <p className="text-sm text-slate-300 mt-1">
                Requesting appointment with Dr. <strong>{incomingCall.doctorName || 'Doctor'}</strong>
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {incomingCall.preferredDate || 'Tomorrow'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {incomingCall.preferredTime || '10:30 AM'}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAnswerCall}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-98"
              >
                <Phone className="w-5 h-5" />
                <span>Answer Call (Receiver)</span>
              </button>
              <button
                onClick={handleEndCall}
                className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* In-Call Active Dialogue */}
        {callActive && incomingCall && (
          <div className="space-y-4">
            {/* AI Inquiry Bubble */}
            <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-800 text-indigo-100 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>ElderCare AI Agent (Caller):</span>
              </div>
              <p className="text-xs leading-relaxed font-sans">{aiSpeechText}</p>
            </div>

            {/* Receptionist Response Panel */}
            <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Your Spoken Answer as Receptionist (Receiver):</span>
                </span>
                {isListeningMic && (
                  <span className="text-sky-300 flex items-center gap-1 font-mono text-[11px]">
                    <Mic className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                    Mic Listening...
                  </span>
                )}
              </div>

              {/* Quick Response Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    submitReceptionResponse(
                      `Yes, consultation slot with Dr. ${incomingCall.doctorName || 'Doctor'} on ${
                        incomingCall.preferredDate || 'tomorrow'
                      } at ${incomingCall.preferredTime || '10:30 AM'} is open and confirmed.`
                    )
                  }
                  className="p-3 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600 text-emerald-200 text-xs font-bold text-left transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>&quot;Yes, {incomingCall.preferredTime || '10:30 AM'} slot is available&quot;</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    submitReceptionResponse(
                      `Yes, Dr. ${incomingCall.doctorName || 'Doctor'} has an open consultation slot at 11:30 AM.`
                    )
                  }
                  className="p-3 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600 text-emerald-200 text-xs font-bold text-left transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>&quot;Yes, slot available at 11:30 AM&quot;</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    submitReceptionResponse(
                      `Sorry, Dr. ${incomingCall.doctorName || 'Doctor'} is on leave on ${
                        incomingCall.preferredDate || 'tomorrow'
                      }. No slots available.`
                    )
                  }
                  className="p-3 rounded-xl bg-rose-900/60 hover:bg-rose-800 border border-rose-600 text-rose-200 text-xs font-bold text-left transition-all flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>&quot;No, doctor is on leave / unavailable&quot;</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    submitReceptionResponse(
                      `All consultation slots for Dr. ${incomingCall.doctorName || 'Doctor'} are fully booked.`
                    )
                  }
                  className="p-3 rounded-xl bg-rose-900/60 hover:bg-rose-800 border border-rose-600 text-rose-200 text-xs font-bold text-left transition-all flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>&quot;No slots available / Fully booked&quot;</span>
                </button>
              </div>

              {/* Text Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={receptionSpeech}
                  onChange={(e) => setReceptionSpeech(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && receptionSpeech.trim()) {
                      submitReceptionResponse(receptionSpeech);
                    }
                  }}
                  placeholder="Or speak into mic / type receptionist answer..."
                  className="flex-1 py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (receptionSpeech.trim()) {
                      submitReceptionResponse(receptionSpeech);
                    }
                  }}
                  disabled={!receptionSpeech.trim()}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleEndCall}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Hang Up</span>
              </button>
            </div>
          </div>
        )}

        {/* Call Outcome Display */}
        {callOutcome === 'booked' && (
          <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-600 text-emerald-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Appointment Booked Successfully!</span>
            </div>
            <p>
              Your confirmation as Hospital Receptionist was received by the AI Agent. The appointment has been added to the
              patient&apos;s schedule.
            </p>
          </div>
        )}

        {callOutcome === 'unavailable' && (
          <div className="p-4 rounded-2xl bg-rose-950 border border-rose-600 text-rose-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Doctor Unavailable — No Appointment Booked</span>
            </div>
            <p>
              You informed the AI Agent that the doctor is unavailable. As requested, zero dummy slots were booked.
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            Audio Synthesis & NLP Active
          </span>
          <span>ElderCare AI Hospital Gateway</span>
        </div>
      </div>
    </div>
  );
};

export default HospitalReceptionDesk;
