import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  UserCheck,
  Clock,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  MessageSquare,
  Building2,
  Radio,
  Calendar,
  CheckCircle2,
  Bot,
  User,
  Check,
  X,
  FileText,
  Mic,
  MicOff,
  Copy,
  Share2,
  Smartphone,
  Send,
  Video,
  VideoOff,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { WebRTCService } from '../services/webrtc.service';
import {
  getTunnelStatus,
  sendTestSms,
  TunnelStatusResponse,
} from '../services/tunnel.service';

import {
  initiateCaregiverCall,
  getCalls,
  hangupCall,
} from '../services/calling.service';
import { getContacts } from '../services/contact.service';
import {
  initiateHumanHospitalCall,
  initiateAIHospitalCall,
  getAppointments,
  confirmAppointment,
  cancelAppointment,
  getHospitalTarget,
} from '../services/appointment.service';
import {
  playReminderChime,
  startTelephoneRinging,
  playHangupTone,
} from '../services/voiceNotification.service';
import { VoiceWaveform } from '../components/voice/VoiceWaveform';
import { Call, EmergencyContact, Appointment, HospitalCallResponse } from '../types';

export const Calls: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'hospital' ? 'hospital' : 'caregiver';

  const [activeTab, setActiveTab] = useState<'caregiver' | 'hospital'>(initialTab);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active in-call state (for caregiver or direct hospital call)
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isDialing, setIsDialing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Video element and stream refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Hospital form & AI calling state
  const [hospitalName, setHospitalName] = useState('Metropolitan Community Health Center');
  const [doctorName, setDoctorName] = useState('Dr. Sarah Mitchell, MD');
  const [department, setDepartment] = useState('Cardiology & Internal Medicine');
  const [receptionPhone, setReceptionPhone] = useState('+1-555-019-4820');
  const [preferredDate, setPreferredDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [preferredTime, setPreferredTime] = useState('10:30 AM');
  const [patientNotes, setPatientNotes] = useState('Follow-up review for blood pressure medication');

  // AI calling result / transcript state
  const [aiCallResult, setAiCallResult] = useState<HospitalCallResponse | null>(null);
  const [isAiCalling, setIsAiCalling] = useState(false);
  const [isConfirmingAppointment, setIsConfirmingAppointment] = useState(false);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatusResponse | null>(null);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [testSmsPhone, setTestSmsPhone] = useState('+918683072836');
  const [showTestSmsInput, setShowTestSmsInput] = useState(false);

  // Audio ringing controller ref
  const ringHandleRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (ringHandleRef.current) {
        ringHandleRef.current.stop();
        ringHandleRef.current = null;
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contactList, callList, apptList] = await Promise.all([
        getContacts(),
        getCalls(),
        getAppointments(),
      ]);
      setContacts(contactList);
      setCalls(callList);
      setAppointments(apptList);

      // Fetch Cloudflare tunnel & Fast2SMS info
      getTunnelStatus()
        .then(setTunnelStatus)
        .catch(() => {});

      // Check if there is an active ongoing call
      const ongoing = callList.find(
        (c) => c.status === 'CALLING' || c.status === 'CONNECTED'
      );
      if (ongoing && !activeCall) {
        setActiveCall(ongoing);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load calling data');
    } finally {
      setLoading(false);
    }
  };

  // Try auto-resolving target from prescription if available
  useEffect(() => {
    const rxId = searchParams.get('rxId');
    getHospitalTarget(rxId || undefined)
      .then((target) => {
        if (target) {
          if (target.hospital) setHospitalName(target.hospital);
          if (target.doctor) setDoctorName(target.doctor);
          if (target.receptionPhone) setReceptionPhone(target.receptionPhone);
        }
      })
      .catch(() => {
        // keep defaults
      });
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  // Timer for active call
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeCall && (activeCall.status === 'CALLING' || activeCall.status === 'CONNECTED')) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall]);

  // Attach local video stream when element mounts
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      WebRTCService.attachVideo(localVideoRef.current, localStreamRef.current);
    }
  }, [activeCall, isCameraActive]);

  // Attach remote video stream when element mounts or stream updates
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      WebRTCService.attachVideo(remoteVideoRef.current, remoteStreamRef.current);
    }
  }, [activeCall, hasRemoteVideo]);

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

  const getMobileJoinUrl = (callId: string) => {
    const base = tunnelStatus?.effectiveClientUrl || window.location.origin;
    return `${base.replace(/\/$/, '')}/call/join/${callId}`;
  };

  const handleCopyCallLink = (callId: string) => {
    const url = getMobileJoinUrl(callId);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  const handleShareWhatsApp = (call: Call) => {
    const url = getMobileJoinUrl(call._id);
    const cleanPhone = (call.phoneNumber || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Urgent Call: Your elder parent (${call.contactName}) is calling you on ElderCare AI. Tap here to join the audio/video call immediately: ${url}`
    );
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleSendTestSms = async () => {
    if (!testSmsPhone) {
      setError('Please enter a valid phone number for SMS test');
      return;
    }
    try {
      setIsSendingTestSms(true);
      setError(null);
      const res = await sendTestSms(testSmsPhone, 'Family Caregiver');
      setSuccessMsg(
        res.simulated
          ? `[Simulated] SMS logged to console for ${testSmsPhone}. Join link: ${res.joinUrl}`
          : `✅ Live Fast2SMS dispatched to ${testSmsPhone}! Check your phone.`
      );
      setShowTestSmsInput(false);
      setTimeout(() => setSuccessMsg(null), 8000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to send test SMS');
    } finally {
      setIsSendingTestSms(false);
    }
  };

  const handleStartCaregiverCall = async (contact: EmergencyContact, withVideo: boolean = true) => {
    try {
      setIsDialing(true);
      setIsVideoCall(withVideo);
      setError(null);

      // Start realistic phone ringing tone through browser speakers
      if (ringHandleRef.current) ringHandleRef.current.stop();
      ringHandleRef.current = startTelephoneRinging();

      const call = await initiateCaregiverCall({
        contactId: contact._id,
        relationship: contact.relationship,
        name: contact.name,
        callType: withVideo ? 'VIDEO' : 'VOICE',
      });

      // Display active calling banner in CALLING state while waiting for caregiver to tap SMS link
      const callingState: Call = {
        ...call,
        status: 'CALLING',
      };
      setActiveCall(callingState);
      setCallDuration(0);
      setIsMuted(false);
      setSuccessMsg(
        `📲 SMS dispatched to ${contact.name} (${contact.phone}) via Fast2SMS! Waiting for them to tap the link and join...`
      );

      // Initialize in-browser WebRTC audio & video stream
      const localStream = await WebRTCService.startCall({
        callId: call._id,
        userId: 'patient',
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
          const hasVideo = stream.getVideoTracks().length > 0;
          setHasRemoteVideo(hasVideo);
          if (remoteVideoRef.current) {
            WebRTCService.attachVideo(remoteVideoRef.current, stream);
          }
        },
        onCallConnected: () => {
          // Stop ringing immediately when caregiver joins
          if (ringHandleRef.current) {
            ringHandleRef.current.stop();
            ringHandleRef.current = null;
          }
          playReminderChime();
          setActiveCall((prev) => (prev ? { ...prev, status: 'CONNECTED' } : null));
          setSuccessMsg(`🎉 ${contact.name} joined the call! You can speak and see each other.`);
        },
        onCallEnded: () => {
          if (ringHandleRef.current) {
            ringHandleRef.current.stop();
            ringHandleRef.current = null;
          }
          playHangupTone();
          WebRTCService.endCall();
          setActiveCall(null);
          setHasRemoteVideo(false);
          localStreamRef.current = null;
          remoteStreamRef.current = null;
          setSuccessMsg(`Call ended by ${contact.name}.`);
          fetchData();
        },
      });

      localStreamRef.current = localStream;
      setIsCameraActive(localStream.getVideoTracks().length > 0 && localStream.getVideoTracks()[0].enabled);

      await fetchData();
    } catch (err: any) {
      if (ringHandleRef.current) {
        ringHandleRef.current.stop();
        ringHandleRef.current = null;
      }
      WebRTCService.endCall();
      const msg = err.response?.data?.error?.message || err.message || 'Failed to initiate call';
      setError(msg);
    } finally {
      setIsDialing(false);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      if (ringHandleRef.current) {
        ringHandleRef.current.stop();
        ringHandleRef.current = null;
      }
      playHangupTone();
      WebRTCService.endCall();
      await hangupCall(activeCall._id);
      setActiveCall(null);
      setIsMuted(false);
      setHasRemoteVideo(false);
      localStreamRef.current = null;
      remoteStreamRef.current = null;
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to end call');
    }
  };

  // Mode A: Direct User Call to Hospital via WebRTC
  const handleStartDirectHospitalCall = async () => {
    try {
      setIsDialing(true);
      setError(null);

      if (ringHandleRef.current) ringHandleRef.current.stop();
      ringHandleRef.current = startTelephoneRinging();

      const res = await initiateHumanHospitalCall({
        hospital: hospitalName,
        doctor: doctorName,
        department,
        receptionPhone,
        preferredDate,
        preferredTime,
        patientNotes,
      });

      if (ringHandleRef.current) {
        ringHandleRef.current.stop();
        ringHandleRef.current = null;
      }

      // Connect WebRTC audio
      await WebRTCService.startCall({
        callId: res.call._id,
        userId: 'patient',
        onCallEnded: () => {
          if (ringHandleRef.current) {
            ringHandleRef.current.stop();
            ringHandleRef.current = null;
          }
          playHangupTone();
          WebRTCService.endCall();
          setActiveCall(null);
          setSuccessMsg('Call ended by hospital reception.');
          fetchData();
        },
      });

      setActiveCall(res.call);
      setCallDuration(0);
      setIsMuted(false);
      setSuccessMsg(`WebRTC audio call connected to ${hospitalName} reception.`);
      await fetchData();
    } catch (err: any) {
      if (ringHandleRef.current) {
        ringHandleRef.current.stop();
        ringHandleRef.current = null;
      }
      WebRTCService.endCall();
      const msg = err.response?.data?.error?.message || err.message || 'Failed to connect to hospital reception';
      setError(msg);
    } finally {
      setIsDialing(false);
    }
  };

  // Mode B: AI Calling Agent Calls Reception
  const handleStartAIHospitalCall = async () => {
    try {
      setIsAiCalling(true);
      setError(null);
      setAiCallResult(null);

      // Ringing sound while AI dials reception
      if (ringHandleRef.current) ringHandleRef.current.stop();
      ringHandleRef.current = startTelephoneRinging();

      const res = await initiateAIHospitalCall({
        hospital: hospitalName,
        doctor: doctorName,
        department,
        receptionPhone,
        preferredDate,
        preferredTime,
        patientNotes,
      });

      if (ringHandleRef.current) {
        ringHandleRef.current.stop();
        ringHandleRef.current = null;
      }

      setAiCallResult(res);
      setSuccessMsg(`AI appointment inquiry completed! Proposed slot found.`);
      playReminderChime();
      await fetchData();
    } catch (err: any) {
      if (ringHandleRef.current) {
        ringHandleRef.current.stop();
        ringHandleRef.current = null;
      }
      setError(err.message || 'AI hospital calling inquiry failed');
    } finally {
      setIsAiCalling(false);
    }
  };

  // Confirm appointment proposal
  const handleConfirmAppointment = async (apptId: string) => {
    try {
      setIsConfirmingAppointment(true);
      setError(null);
      playReminderChime();
      await confirmAppointment(apptId, patientNotes);
      setSuccessMsg('Appointment successfully confirmed and added to your schedule!');
      setAiCallResult(null);
      await fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm appointment');
    } finally {
      setIsConfirmingAppointment(false);
    }
  };

  // Cancel appointment proposal
  const handleCancelAppointment = async (apptId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await cancelAppointment(apptId, 'Patient requested cancellation');
      setSuccessMsg('Appointment cancelled.');
      setAiCallResult(null);
      await fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment');
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CALLING':
      case 'PENDING_CONFIRMATION':
      case 'PROPOSED':
        return 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-sky-100 text-sky-800 border-sky-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Healthcare Calling & Appointments</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Care Calling & Clinic Appointments
          </h1>
          <p className="text-slate-600 mt-1 max-w-2xl">
            Place direct high-definition video and voice calls with your family caregivers, or let your AI assistant contact hospital reception to discover doctor visit availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="elder-btn-secondary text-sm flex items-center gap-1.5 shadow-xs"
            title="Speak with AI Companion"
          >
            <MessageSquare className="w-4 h-4 text-brand-600" />
            <span>AI Companion</span>
          </Link>
          <Link
            to="/prescription"
            className="elder-btn-secondary text-sm flex items-center gap-1.5 shadow-xs"
            title="View Prescriptions"
          >
            <FileText className="w-4 h-4 text-brand-600" />
            <span>Prescriptions</span>
          </Link>
        </div>
      </div>

      {/* Sleek Medical Line Status Bar */}
      <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-white">Live Caregiver Mobile Gateway Active</span>
          <span className="text-slate-400 hidden md:inline">•</span>
          <span className="text-slate-400 hidden md:inline">Instant Mobile SMS Dispatch & Private HD Calling</span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setShowTestSmsInput(!showTestSmsInput)}
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 hover:text-white font-semibold text-[11px] transition-all flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-300" />
            <span>{showTestSmsInput ? 'Hide Test' : 'Test Real SMS (+91)'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Test SMS Panel */}
      {showTestSmsInput && (
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-indigo-200">
            <span className="font-bold text-white">Direct SMS Test:</span>
            <span>Dispatch an immediate 1-tap call join link to your phone.</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testSmsPhone}
              onChange={(e) => setTestSmsPhone(e.target.value)}
              placeholder="+918683072836"
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 font-mono text-xs focus:ring-2 focus:ring-indigo-500 w-44"
            />
            <button
              onClick={handleSendTestSms}
              disabled={isSendingTestSms}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
            >
              {isSendingTestSms ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs: Family Caregivers vs Clinic Appointments */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('caregiver')}
          className={`pb-3 px-1 font-extrabold text-base flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'caregiver'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span>Family Caregivers</span>
        </button>

        <button
          onClick={() => setActiveTab('hospital')}
          className={`pb-3 px-1 font-extrabold text-base flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'hospital'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>Hospital & Doctor Appointments</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold text-sm">{successMsg}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Call In-Progress Overlay Banner (Shared for Caregiver or Direct Hospital) */}
      {activeCall && (
        <div className="elder-card p-6 sm:p-8 bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-900 text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner animate-pulse">
                {isVideoCall ? (
                  <Video className="w-8 h-8 text-emerald-200" />
                ) : (
                  <PhoneCall className="w-8 h-8 text-emerald-200" />
                )}
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider text-emerald-200">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>
                    {activeCall.status === 'CONNECTED'
                      ? isVideoCall
                        ? 'Live Video Call'
                        : 'Live Audio Call'
                      : `Calling (${activeCall.status})`}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {activeCall.contactName} ({activeCall.relationship})
                </h2>
                <p className="text-sky-100 text-sm font-mono">
                  Line: {activeCall.phoneNumber} • Secure Private Line
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-center flex-wrap">
              <div className="text-right mr-2">
                <span className="text-xs uppercase tracking-wider text-emerald-200 block font-bold">
                  Duration
                </span>
                <span className="text-3xl sm:text-4xl font-mono font-black text-white">
                  {formatSeconds(callDuration)}
                </span>
              </div>

              {/* Mute / Unmute Microphone */}
              <button
                onClick={handleToggleMute}
                className={`px-4 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-1.5 transition-transform active:scale-95 shadow-md ${
                  isMuted
                    ? 'bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-amber-900/30'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5 text-slate-900" /> : <Mic className="w-5 h-5" />}
                <span>{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              {/* Camera On / Off */}
              <button
                onClick={handleToggleCamera}
                className={`px-4 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-1.5 transition-transform active:scale-95 shadow-md ${
                  !isCameraActive
                    ? 'bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-amber-900/30'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                }`}
                title={isCameraActive ? 'Turn off camera' : 'Turn on camera'}
              >
                {isCameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-slate-900" />}
                <span>{isCameraActive ? 'Camera On' : 'Camera Off'}</span>
              </button>

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-rose-900/30 flex items-center gap-2 transition-transform active:scale-95"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            </div>
          </div>

          {/* Interactive HD Video Stage */}
          <div className="mt-6 w-full aspect-video max-h-[460px] rounded-3xl overflow-hidden relative bg-slate-950 border border-white/20 shadow-2xl flex items-center justify-center">
            {/* Remote Caregiver Video Feed */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                hasRemoteVideo ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
              }`}
            />

            {/* Remote Audio/Camera-off Fallback */}
            {!hasRemoteVideo && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-brand-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-2xl border-4 border-white/20">
                  {activeCall.contactName?.charAt(0) || 'C'}
                  <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {activeCall.contactName} ({activeCall.relationship})
                  </h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    Audio stream active • Video will stream when caregiver joins or turns on camera
                  </p>
                </div>
                <VoiceWaveform state={isMuted ? 'idle' : 'speaking'} />
              </div>
            )}

            {/* Floating Elder Selfie PiP (Bottom-Right) */}
            <div className="absolute bottom-4 right-4 z-20 w-32 sm:w-44 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl bg-slate-900 flex items-center justify-center">
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
                  <span className="text-[10px] font-bold">Your Camera Off</span>
                </div>
              )}
              <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] font-bold text-white tracking-wider">
                You (Laptop)
              </span>
            </div>

            {/* In-Video Status Pill */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{hasRemoteVideo ? 'Caregiver HD Video' : 'Audio Connected'}</span>
            </div>
          </div>

          {/* Live In-Call Audio Waveform & Status */}
          <div className="mt-4 pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <VoiceWaveform state={isMuted ? 'idle' : 'speaking'} />
              <span className="font-semibold text-emerald-100">
                {isMuted
                  ? 'Microphone muted • Click "Muted" to speak'
                  : 'Active Call • Speaking via Laptop Audio'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sky-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Direct Encrypted Connection</span>
            </div>
          </div>

          {/* Instant One-Tap Share Bar for Caregiver */}
          <div className="mt-4 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-white min-w-0">
              <div className="p-2 rounded-xl bg-white/20 text-emerald-300 flex-shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-white block">
                  Instant One-Tap Caregiver Link:
                </span>
                <span className="text-sky-200 truncate block text-[11px] font-mono">
                  {getMobileJoinUrl(activeCall._id)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleCopyCallLink(activeCall._id)}
                className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                title="Copy join link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleShareWhatsApp(activeCall)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                title="Send link via WhatsApp"
              >
                <span>💬 Send via WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Automated Phone Delivery Notice */}
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                <strong>📲 Automated SMS Link Dispatched</strong> to{' '}
                <span className="font-semibold text-emerald-200">{activeCall.contactName}</span> (
                <span className="font-mono text-emerald-100">{activeCall.phoneNumber}</span>).
                Caregiver can tap the link on their mobile to talk immediately!
              </span>
            </div>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-emerald-400/30 font-bold text-[10px] text-emerald-100">
              Auto-Delivered
            </span>
          </div>
        </div>
      )}

      {/* TAB 1: Caregiver Calling */}
      {activeTab === 'caregiver' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Caregiver Quick-Dial Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-brand-600" />
                  Family Caregiver Quick-Dial
                </h2>
                <p className="text-sm text-slate-500">
                  Calls resolve strictly from your verified Emergency Contacts. Numbers are protected and never forged.
                </p>
              </div>

              <Link to="/profile" className="text-sm font-bold text-brand-600 hover:underline">
                Add Contacts →
              </Link>
            </div>

            {loading && contacts.length === 0 ? (
              <div className="text-center py-12">
                <RotateCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Loading caregivers...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="elder-card p-8 text-center bg-brand-50/50 border-brand-200 space-y-4">
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">No Emergency Contacts Configured</h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
                    To enable Caregiver Calling, please register your daughter, son, or designated doctor in your Profile.
                  </p>
                </div>
                <Link to="/profile" className="elder-btn-primary inline-flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Configure Emergency Contacts</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contacts.map((contact) => (
                  <div
                    key={contact._id}
                    className={`elder-card p-6 flex flex-col justify-between transition-all hover:shadow-xl ${
                      contact.isPrimary
                        ? 'border-2 border-emerald-400 bg-emerald-50/20'
                        : 'border border-slate-200'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {contact.relationship}
                        </span>
                        {contact.isPrimary && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Primary Caregiver
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">{contact.name}</h3>
                        <p className="text-slate-500 font-mono text-sm mt-0.5">{contact.phone}</p>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100 mt-4 space-y-2">
                      <button
                        onClick={() => handleStartCaregiverCall(contact, true)}
                        disabled={isDialing || !!activeCall}
                        className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-md ${
                          contact.isPrimary
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                            : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/25'
                        } disabled:opacity-50`}
                      >
                        <Video className="w-5 h-5" />
                        <span>Video Call {contact.name.split(' ')[0]}</span>
                      </button>

                      <button
                        onClick={() => handleStartCaregiverCall(contact, false)}
                        disabled={isDialing || !!activeCall}
                        className="w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Voice Call Only</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: Hospital Calling & Appointment Assistance */}
      {activeTab === 'hospital' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Dual-Mode Selector Card */}
          <div className="elder-card p-6 sm:p-8 bg-white border border-slate-200 shadow-md space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200 mb-2">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                Hospital & Clinic Care Coordinator
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Book Doctor & Clinic Appointments
              </h2>
              <p className="text-slate-600 text-sm mt-1 max-w-3xl">
                Let our <strong>AI Assistant</strong> coordinate with clinic reception to find open appointment slots, or connect with the front desk via <strong>Direct Call</strong>.
              </p>
            </div>

            {/* Hospital Contact & Preference Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Hospital / Clinic Name
                </label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="elder-input text-sm"
                  placeholder="e.g. City General Hospital"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Doctor or Specialty
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="elder-input text-sm"
                  placeholder="e.g. Dr. Sarah Mitchell"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Reception Phone Number
                </label>
                <input
                  type="text"
                  value={receptionPhone}
                  onChange={(e) => setReceptionPhone(e.target.value)}
                  className="elder-input text-sm font-mono"
                  placeholder="e.g. +1-555-019-4820"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="elder-input text-sm"
                  placeholder="e.g. Cardiology"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="elder-input text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Preferred Time Slot
                </label>
                <input
                  type="text"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="elder-input text-sm font-mono"
                  placeholder="e.g. 10:30 AM"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Reason for Visit / Patient Notes
                </label>
                <input
                  type="text"
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  className="elder-input text-sm"
                  placeholder="e.g. Follow-up consultation on prescription"
                />
              </div>
            </div>

            {/* Calling Mode Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Mode B: AI Assistant Call */}
              <div className="p-5 rounded-2xl border-2 border-brand-200 bg-brand-50/30 flex flex-col justify-between space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 text-xs font-extrabold mb-1">
                    <Bot className="w-3.5 h-3.5" />
                    AI Booking Assistant (Recommended)
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Have AI Call Clinic Desk</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    AI agent calls clinic reception, checks doctor schedule availability, and brings back a booking proposal for your approval.
                  </p>
                </div>

                <button
                  onClick={handleStartAIHospitalCall}
                  disabled={isAiCalling || !!activeCall}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-brand-600/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Bot className="w-4 h-4" />
                  <span>{isAiCalling ? 'AI Contacting Reception...' : 'Start AI Booking Call'}</span>
                </button>
              </div>

              {/* Mode A: Direct Call */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-1">
                    <User className="w-3.5 h-3.5" />
                    Direct Reception Line
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Direct Call to Reception</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Connects your telephone line directly to the hospital scheduling desk to speak with front desk staff in person.
                  </p>
                </div>

                <button
                  onClick={handleStartDirectHospitalCall}
                  disabled={isDialing || !!activeCall}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>{isDialing ? 'Connecting Line...' : 'Direct Call Reception'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Reception Conversation Transcript & Proposal Banner (Mode B Result) */}
          {aiCallResult && aiCallResult.appointment && (
            <div className="elder-card p-6 sm:p-8 bg-gradient-to-br from-indigo-50 via-white to-sky-50 border-2 border-indigo-200 shadow-xl space-y-6 animate-in fade-in zoom-in-95">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-indigo-100 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Appointment Slot Found
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">
                    Proposed Appointment Discovered
                  </h3>
                </div>

                <div className="text-xs font-bold text-slate-500 font-mono">
                  Reception Dialed: {aiCallResult.call.phoneNumber}
                </div>
              </div>

              {/* Proposed Slot Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold block">Hospital & Doctor</span>
                  <p className="font-extrabold text-slate-900 text-base">{aiCallResult.appointment.hospital}</p>
                  <p className="text-xs text-slate-600 font-semibold">{aiCallResult.appointment.doctor}</p>
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold block">Date & Time Slot</span>
                  <p className="font-extrabold text-indigo-700 text-base">
                    {new Date(aiCallResult.appointment.requestedDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-700 font-mono font-bold">
                    {aiCallResult.appointment.requestedTime}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold block">Status</span>
                  <span className="inline-block mt-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-extrabold text-xs border border-amber-300">
                    Pending Confirmation
                  </span>
                </div>
              </div>

              {/* Verified Non-Impersonation Transcript */}
              {aiCallResult.aiTranscript && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Clinic Call Confirmation Transcript
                  </h4>
                  <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                    {aiCallResult.aiTranscript}
                  </pre>
                </div>
              )}

              {/* Human-in-the-Loop Confirmation Actions */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  ⚠️ No booking is finalized until you click Confirm. Please verify your availability.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCancelAppointment(aiCallResult.appointment!._id)}
                    className="elder-btn-secondary text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Decline Slot</span>
                  </button>

                  <button
                    onClick={() => handleConfirmAppointment(aiCallResult.appointment!._id)}
                    disabled={isConfirmingAppointment}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isConfirmingAppointment ? 'Confirming...' : 'Confirm Appointment'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming & Confirmed Appointments Schedule */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-brand-600" />
                  Scheduled Consultations & Visits
                </h2>
                <p className="text-sm text-slate-500">
                  Hospital appointments verified and committed with medical scheduling desks.
                </p>
              </div>

              <button
                onClick={fetchData}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="Refresh schedule"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading && appointments.length === 0 ? (
              <div className="text-center py-8">
                <RotateCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="elder-card p-8 text-center text-slate-500 text-sm">
                No appointments scheduled yet. Use the AI Booking Assistant above or dial reception directly.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map((appt) => (
                  <div
                    key={appt._id}
                    className="elder-card p-6 bg-white border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getStatusBadge(
                              appt.status
                            )}`}
                          >
                            {appt.status}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            via {appt.source === 'AI_CALL' ? 'AI Assistant' : 'Direct Call'}
                          </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1">{appt.hospital}</h3>
                        <p className="text-xs font-semibold text-slate-600">{appt.doctor} • {appt.department}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-brand-700 block">
                          {new Date(appt.requestedDate).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {appt.requestedTime}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 font-mono flex items-center justify-between">
                      <span>Reception: {appt.receptionPhone}</span>
                      {appt.status === 'PENDING_CONFIRMATION' && (
                        <button
                          onClick={() => handleConfirmAppointment(appt._id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                        >
                          Confirm
                        </button>
                      )}
                      {appt.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelAppointment(appt._id)}
                          className="text-rose-600 hover:underline font-bold text-xs"
                        >
                          Cancel Visit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Common Call History & Telephony Records (Both Caregiver & Hospital Calls) */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-brand-600" />
            Complete Call History & Logs
          </h2>
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Refresh history"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && calls.length === 0 ? (
          <div className="text-center py-8">
            <RotateCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Loading call logs...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="elder-card p-8 text-center text-slate-500 text-sm">
            No calls placed yet. Use the buttons above or talk to the AI to call your caregiver.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left font-bold">
                <tr>
                  <th className="px-5 py-3.5">Contact / Destination</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Phone Number</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calls.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {c.contactName}
                      <span className="block text-xs font-normal text-slate-500">{c.relationship}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          c.type === 'HOSPITAL'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600 text-xs">
                      {c.phoneNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600 text-xs">
                      {c.durationSeconds ? `${c.durationSeconds}s` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
