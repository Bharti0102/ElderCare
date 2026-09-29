import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  UserCheck,
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
  Mic,
  MicOff,
  Copy,
  Share2,
  Send,
  Video,
  VideoOff,
  UserPlus,
  Users,
  Heart,
  Stethoscope,
  Ambulance,
  Bell,
  QrCode,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useSearchParams } from 'react-router-dom';
import { WebRTCService } from '../services/webrtc.service';
import {
  getTunnelStatus,
  sendTestSms,
  TunnelStatusResponse,
} from '../services/tunnel.service';
import { PushNotificationService } from '../services/pushNotification.service';

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
} from '../services/appointment.service';
import {
  playReminderChime,
  startTelephoneRinging,
  playHangupTone,
} from '../services/voiceNotification.service';
import { Call, EmergencyContact, Appointment, HospitalCallResponse, ContactCategory } from '../types';


interface ParticipantInfo {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  status: 'CONNECTED' | 'INVITED';
}

export const Calls: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'hospital' ? 'hospital' : 'caregiver';

  const [activeTab, setActiveTab] = useState<'caregiver' | 'hospital'>(initialTab);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ContactCategory>('ALL');
  const [_calls, setCalls] = useState<Call[]>([]);
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

  // Multi-participant state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [customInviteName, setCustomInviteName] = useState('');
  const [customInvitePhone, setCustomInvitePhone] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);

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
  const [patientNotes, setPatientNotes] = useState('Follow-up review for health routines');

  // AI calling result / transcript state
  const [aiCallResult, setAiCallResult] = useState<HospitalCallResponse | null>(null);
  const [isAiCalling, setIsAiCalling] = useState(false);
  const [isConfirmingAppointment, setIsConfirmingAppointment] = useState(false);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatusResponse | null>(null);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [testSmsPhone, setTestSmsPhone] = useState('+918683072836');
  const [showTestSmsInput, setShowTestSmsInput] = useState(false);

  // Caregiver device pairing modal state
  const [pairingContact, setPairingContact] = useState<EmergencyContact | null>(null);
  const [copiedPairUrl, setCopiedPairUrl] = useState(false);
  const [isTestingRing, setIsTestingRing] = useState(false);
  const [testRingFeedback, setTestRingFeedback] = useState<string | null>(null);

  const handleTestRingModal = async (contactId: string) => {
    setIsTestingRing(true);
    setTestRingFeedback(null);
    try {
      const ok = await PushNotificationService.testRing(contactId);
      if (ok) {
        setTestRingFeedback('🔔 Test ring dispatched! Check the caregiver phone for ringing sound & alert.');
      } else {
        setTestRingFeedback('⚠️ Ring not sent. Make sure the caregiver enabled notifications on their phone.');
      }
    } catch {
      setTestRingFeedback('⚠️ Error triggering test ring.');
    } finally {
      setIsTestingRing(false);
    }
  };

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
        setParticipants([
          {
            id: ongoing.contactId || 'p-1',
            name: ongoing.contactName,
            relationship: ongoing.relationship,
            phone: ongoing.phoneNumber,
            status: ongoing.status === 'CONNECTED' ? 'CONNECTED' : 'INVITED',
          },
        ]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load calling data');
    } finally {
      setLoading(false);
    }
  };

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

  const handleShareWhatsApp = (call: Call, targetName?: string, targetPhone?: string) => {
    const url = getMobileJoinUrl(call._id);
    const cleanPhone = (targetPhone || call.phoneNumber || '').replace(/[^0-9]/g, '');
    const nameToMention = targetName || call.contactName;
    const text = encodeURIComponent(
      `Family Call Invitation: You are invited to join an ElderCare live video call with ${nameToMention}. Tap here to join now: ${url}`
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

      const callingState: Call = {
        ...call,
        status: 'CALLING',
      };
      setActiveCall(callingState);
      setCallDuration(0);
      setIsMuted(false);
      setParticipants([
        {
          id: contact._id,
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          status: 'INVITED',
        },
      ]);
      setSuccessMsg(
        `📲 Call link dispatched to ${contact.name} (${contact.phone}) via SMS! Waiting for them to connect...`
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
          if (ringHandleRef.current) {
            ringHandleRef.current.stop();
            ringHandleRef.current = null;
          }
          playReminderChime();
          setActiveCall((prev) => (prev ? { ...prev, status: 'CONNECTED' } : null));
          setParticipants((prev) =>
            prev.map((p) => (p.id === contact._id ? { ...p, status: 'CONNECTED' } : p))
          );
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
          setParticipants([]);
          setSuccessMsg(`Call ended.`);
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
      setParticipants([]);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to end call');
    }
  };

  // Invite participant to active call
  const handleInviteContactToCall = async (contact: EmergencyContact) => {
    if (!activeCall) return;
    setIsSendingInvite(true);
    try {
      await sendTestSms(contact.phone, `${contact.name} (${contact.relationship})`);
      setParticipants((prev) => {
        if (prev.some((p) => p.phone === contact.phone)) return prev;
        return [
          ...prev,
          {
            id: contact._id,
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
            status: 'INVITED',
          },
        ];
      });
      setSuccessMsg(`📲 Join invite dispatched to ${contact.name}! They can tap the SMS link to join.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || `Failed to send invite to ${contact.name}`);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleInviteCustomParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCall || !customInvitePhone.trim()) return;
    setIsSendingInvite(true);
    try {
      const name = customInviteName.trim() || 'Guest Participant';
      await sendTestSms(customInvitePhone.trim(), name);
      setParticipants((prev) => [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          name,
          relationship: 'Guest',
          phone: customInvitePhone.trim(),
          status: 'INVITED',
        },
      ]);
      setSuccessMsg(`📲 Join link dispatched to ${name} (${customInvitePhone})!`);
      setCustomInviteName('');
      setCustomInvitePhone('');
      setIsInviteModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Direct User Call to Hospital via WebRTC
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

      await WebRTCService.startCall({
        callId: res.call._id,
        userId: 'patient',
        video: false,
        onLocalStream: (stream) => {
          localStreamRef.current = stream;
        },
        onRemoteStream: (stream) => {
          remoteStreamRef.current = stream;
        },
        onCallConnected: () => {
          playReminderChime();
          setActiveCall(res.call);
          setSuccessMsg(`Connected with ${hospitalName} Reception Desk.`);
        },
        onCallEnded: () => {
          playHangupTone();
          WebRTCService.endCall();
          setActiveCall(null);
          fetchData();
        },
      });

      setActiveCall(res.call);
      setCallDuration(0);
      setIsMuted(false);
      setIsVideoCall(false);
      await fetchData();
    } catch (err: any) {
      if (ringHandleRef.current) {
        ringHandleRef.current.stop();
        ringHandleRef.current = null;
      }
      WebRTCService.endCall();
      setError(err.response?.data?.error?.message || err.message || 'Failed to connect hospital call');
    } finally {
      setIsDialing(false);
    }
  };

  // AI Autonomous Assistant Call to Hospital
  const handleStartAIHospitalCall = async () => {
    try {
      setIsAiCalling(true);
      setAiCallResult(null);
      setError(null);

      const res = await initiateAIHospitalCall({
        hospital: hospitalName,
        doctor: doctorName,
        department,
        receptionPhone,
        preferredDate,
        preferredTime,
        patientNotes,
      });

      setAiCallResult(res);
      setSuccessMsg(res.summary);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'AI Assistant call failed');
    } finally {
      setIsAiCalling(false);
    }
  };

  const handleConfirmAppointment = async (apptId: string) => {
    try {
      setIsConfirmingAppointment(true);
      await confirmAppointment(apptId);
      setSuccessMsg('Appointment confirmed! Notification reminder scheduled.');
      await fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm appointment');
    } finally {
      setIsConfirmingAppointment(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    try {
      await cancelAppointment(apptId);
      setSuccessMsg('Appointment cancelled.');
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

  const filteredContacts = contacts.filter((c) => {
    if (selectedCategory === 'ALL') return true;
    return (c.category || 'FAMILY') === selectedCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Multi-Party HD Calling & Video Room</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Family Video & Voice Calls
          </h1>
          <p className="text-slate-600 mt-1 max-w-2xl">
            Connect instantly with family, caregivers, and doctors. Add multiple participants to the same call with zero app download required.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="elder-btn-secondary text-sm flex items-center gap-1.5 shadow-xs"
            title="Manage Phonebook"
          >
            <Users className="w-4 h-4 text-brand-600" />
            <span>Manage Phonebook</span>
          </Link>
          <Link
            to="/chat"
            className="elder-btn-secondary text-sm flex items-center gap-1.5 shadow-xs"
            title="Speak with AI Companion"
          >
            <MessageSquare className="w-4 h-4 text-brand-600" />
            <span>AI Companion</span>
          </Link>
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
          <span>Family & Caregiver Directory</span>
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
          <span>Clinic & Doctor Appointments</span>
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

      {/* Active Call In-Progress Overlay Banner */}
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
                      : `Connecting Line (${activeCall.status})`}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {activeCall.contactName} ({activeCall.relationship})
                </h2>
                <div className="flex items-center gap-3 text-xs text-sky-100">
                  <span>Line: {activeCall.phoneNumber}</span>
                  <span>•</span>
                  <span>{participants.length} Active in Room</span>
                </div>
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

              {/* Add More Participants Button */}
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="px-4 py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-sm flex items-center gap-2 border border-white/30 transition-all active:scale-95 shadow-md"
                title="Add more participants to call"
              >
                <UserPlus className="w-5 h-5 text-emerald-300" />
                <span>Add Person</span>
              </button>

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
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                hasRemoteVideo ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
              }`}
            />

            {/* Inactive Remote Video Screen */}
            {!hasRemoteVideo && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-extrabold shadow-2xl border-4 border-white/20">
                  {activeCall.contactName.charAt(0).toUpperCase()}
                  <span className="absolute inset-0 rounded-3xl border-2 border-indigo-400 animate-ping opacity-30" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{activeCall.contactName}</h3>
                  <p className="text-sm text-sky-200 mt-1">
                    {activeCall.status === 'CONNECTED'
                      ? 'Live Audio Call Connected'
                      : 'Sending SMS link... Waiting for caregiver to tap and connect'}
                  </p>
                </div>
              </div>
            )}

            {/* Local PiP Selfie Camera */}
            <div className="absolute bottom-4 right-4 z-20 w-32 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900 flex items-center justify-center">
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
                  <User className="w-8 h-8 mb-1 text-slate-500" />
                  <span className="text-xs font-bold">Camera Off</span>
                </div>
              )}
              <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] font-bold text-white tracking-wider">
                You
              </span>
            </div>

            {/* In-Video Status Pill */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{hasRemoteVideo ? 'Caregiver HD Video' : 'Audio Connected'}</span>
            </div>
          </div>

          {/* Participant List Strip */}
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-emerald-200">Call Participants:</span>
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-white font-semibold">
                You (Host)
              </span>
              {participants.map((p, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                    p.status === 'CONNECTED'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-400/20 text-amber-200 border border-amber-300/30'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${p.status === 'CONNECTED' ? 'bg-white' : 'bg-amber-300 animate-ping'}`} />
                  {p.name} ({p.relationship}) - {p.status === 'CONNECTED' ? 'Connected' : 'Invited'}
                </span>
              ))}
            </div>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="font-bold text-emerald-300 hover:text-white underline flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Invite More Family</span>
            </button>
          </div>

          {/* Instant One-Tap Share Bar for Caregivers */}
          <div className="mt-4 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-white min-w-0">
              <div className="p-2 rounded-xl bg-white/20 text-emerald-300 flex-shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-white block">
                  Multi-Party Join URL (No Login Required):
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
                <span>💬 WhatsApp Invite</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Caregiver Calling */}
      {activeTab === 'caregiver' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick-Dial Category Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-brand-600" />
                Family & Caregiver Quick-Dial
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                One-tap direct HD video and audio call with your verified contacts.
              </p>
            </div>

            <Link to="/profile" className="text-sm font-bold text-brand-600 hover:underline flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Manage Phonebook ({contacts.length}) →</span>
            </Link>
          </div>

          {/* WhatsApp-Style Direct Incoming Call Notice */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-xs">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 block text-sm">
                  WhatsApp-Style Instant Call Ringing Active
                </span>
                <span className="text-slate-600 block mt-0.5">
                  Caregivers can pair their phone in 1 tap. When you call, their phone rings with sound and vibration even when the screen is locked — completely free of cost!
                </span>
              </div>
            </div>
            <div className="text-xs font-bold text-emerald-700 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
              Zero SMS Fees • 1-Click Answering
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Contacts ({contacts.length})
            </button>
            <button
              onClick={() => setSelectedCategory('FAMILY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedCategory === 'FAMILY'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Family ({contacts.filter((c) => (c.category || 'FAMILY') === 'FAMILY').length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('CAREGIVER')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedCategory === 'CAREGIVER'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Caregivers ({contacts.filter((c) => c.category === 'CAREGIVER').length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('DOCTOR')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedCategory === 'DOCTOR'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctors ({contacts.filter((c) => c.category === 'DOCTOR').length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('EMERGENCY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedCategory === 'EMERGENCY'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Ambulance className="w-3.5 h-3.5" />
              <span>Emergency SOS ({contacts.filter((c) => c.category === 'EMERGENCY').length})</span>
            </button>
          </div>

          {loading && contacts.length === 0 ? (
            <div className="text-center py-12">
              <RotateCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Loading phonebook...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="elder-card p-8 text-center bg-brand-50/50 border-brand-200 space-y-4">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedCategory === 'ALL'
                    ? 'No Contacts in Phonebook Yet'
                    : `No ${selectedCategory.toLowerCase()} contacts found`}
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
                  Add multiple family members, personal caregivers, or doctors in your Profile to call in 1 tap.
                </p>
              </div>
              <Link to="/profile" className="elder-btn-primary inline-flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Add Contacts in Profile</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContacts.map((contact) => (
                <div
                  key={contact._id}
                  className={`elder-card p-6 flex flex-col justify-between transition-all hover:shadow-xl ${
                    contact.isPrimary
                      ? 'border-2 border-emerald-400 bg-emerald-50/20'
                      : 'border border-slate-200 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {contact.relationship}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700">
                          {contact.category || 'FAMILY'}
                        </span>
                      </div>

                      {contact.isPrimary && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Primary
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

                    <button
                      onClick={() => {
                        setPairingContact(contact);
                        setCopiedPairUrl(false);
                        setTestRingFeedback(null);
                      }}
                      className="w-full py-2 px-2.5 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      title="Pair phone for WhatsApp-style incoming call ringing"
                    >
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      <span>📲 Pair Phone for 1-Click Ringing</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Hospital Calling & Appointment Assistance */}
      {activeTab === 'hospital' && (
        <div className="space-y-8 animate-in fade-in duration-200">
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
                Let our <strong>AI Assistant</strong> coordinate with clinic reception to find open appointment slots, or connect directly via <strong>WebRTC Call</strong>.
              </p>
            </div>

            {/* Quick Link to Dedicated Appointments Module */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-600 text-white">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Dedicated Appointments & Reception Module</h4>
                  <p className="text-xs text-slate-600">
                    Access all your saved clinic numbers, direct Phone/Truecaller dialing, and doctor availability slots.
                  </p>
                </div>
              </div>
              <Link
                to="/appointments"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-colors whitespace-nowrap"
              >
                <span>Open Appointments</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
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
                  Medical Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="elder-input text-sm"
                  placeholder="e.g. Cardiology & Internal Medicine"
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
                  className="elder-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Preferred Time
                </label>
                <input
                  type="text"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="elder-input text-sm"
                  placeholder="e.g. 10:30 AM"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Reason for Visit / Symptoms
                </label>
                <input
                  type="text"
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  className="elder-input text-sm"
                  placeholder="e.g. Routine blood pressure checkup"
                />
              </div>
            </div>

            {/* Launch Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleStartAIHospitalCall}
                disabled={isAiCalling || isDialing || !!activeCall}
                className="p-5 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-700 hover:from-brand-700 hover:to-indigo-800 text-white font-extrabold flex flex-col items-start gap-2 shadow-lg shadow-brand-900/20 active:scale-98 transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2.5 rounded-xl bg-white/20 text-white">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 font-bold">
                    Autonomous
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black">Let AI Assistant Book Visit</h3>
                  <p className="text-xs text-sky-100 font-normal mt-0.5">
                    AI calls hospital reception, finds open slot, and confirms your visit.
                  </p>
                </div>
              </button>

              <button
                onClick={handleStartDirectHospitalCall}
                disabled={isAiCalling || isDialing || !!activeCall}
                className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold flex flex-col items-start gap-2 shadow-lg shadow-slate-900/20 active:scale-98 transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2.5 rounded-xl bg-white/10 text-emerald-400">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 font-bold text-slate-300">
                    Direct Line
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black">Direct Call Reception</h3>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    Connect directly to the front desk over high-clarity voice audio.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* AI Result Card */}
          {aiCallResult && (
            <div className="elder-card p-6 sm:p-8 bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-200 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-indigo-950">AI Consultation Booking Result</h3>
                  <p className="text-xs text-indigo-700">Autonomous interaction with {hospitalName}</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-indigo-100 text-sm text-slate-800 space-y-2">
                <p className="font-bold text-indigo-900">{aiCallResult.summary}</p>
                {aiCallResult.aiTranscript && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 font-mono">
                    <span className="font-bold text-slate-800 block mb-1">Reception Call Transcript:</span>
                    <p className="whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {aiCallResult.aiTranscript}
                    </p>
                  </div>
                )}
              </div>

              {aiCallResult.appointment && aiCallResult.appointment.status !== 'CONFIRMED' && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleConfirmAppointment(aiCallResult.appointment!._id)}
                    disabled={isConfirmingAppointment}
                    className="elder-btn-primary text-sm gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm & Schedule Visit</span>
                  </button>
                  <button
                    onClick={() => handleCancelAppointment(aiCallResult.appointment!._id)}
                    className="elder-btn-secondary text-sm"
                  >
                    Cancel Slot
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Past Appointments List */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              Scheduled Clinic Appointments
            </h3>

            {appointments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                No hospital appointments scheduled yet. Use the form above to book a doctor visit.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map((appt) => (
                  <div key={appt._id} className="elder-card p-5 bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700">
                        {appt.hospital}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                          appt.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-base text-slate-900">
                        {appt.doctor || 'Attending Physician'}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {appt.requestedDate} at {appt.requestedTime}
                      </p>
                    </div>

                    {appt.patientNotes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        Note: {appt.patientNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Participant Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-brand-600" />
                  Add Participant to Call
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Invite family members or doctors to join this active conversation.
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-Tap Invite from Phonebook */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                1-Tap Invite From Your Phonebook:
              </span>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {contacts.length === 0 ? (
                  <p className="text-xs text-slate-400">No contacts in phonebook yet.</p>
                ) : (
                  contacts.map((c) => (
                    <div
                      key={c._id}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-sm text-slate-900 block">{c.name}</span>
                        <span className="text-xs text-slate-500 font-mono">
                          {c.relationship} • {c.phone}
                        </span>
                      </div>
                      <button
                        onClick={() => handleInviteContactToCall(c)}
                        disabled={isSendingInvite}
                        className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send Invite</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Or Invite by Custom Number */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Or Invite Any Other Phone Number:
              </span>
              <form onSubmit={handleInviteCustomParticipant} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Participant Name"
                    value={customInviteName}
                    onChange={(e) => setCustomInviteName(e.target.value)}
                    className="elder-input text-xs"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={customInvitePhone}
                    onChange={(e) => setCustomInvitePhone(e.target.value)}
                    className="elder-input text-xs font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="elder-btn-secondary py-2 px-3 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingInvite || !customInvitePhone.trim()}
                    className="elder-btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                  >
                    {isSendingInvite ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Dispatch SMS Join Link</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pair Caregiver Device & 1-Click WhatsApp Calling Modal */}
      {pairingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">
                    Pair Caregiver Phone
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {pairingContact.name} ({pairingContact.relationship}) &bull; {pairingContact.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPairingContact(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Container */}
            {(() => {
              const effectiveBase = tunnelStatus?.effectiveClientUrl || window.location.origin;
              const pairUrl = `${effectiveBase.replace(/\/$/, '')}/caregiver/connect/${pairingContact._id}`;
              const cleanPhone = pairingContact.phone.replace(/[^\d+]/g, '');
              const waUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(
                `Hi ${pairingContact.name}! To receive 1-click video and voice calls from me directly on your phone (like WhatsApp), please open this link and tap 'Allow Notifications':\n\n${pairUrl}`
              )}`;

              return (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>1-Time Setup:</strong> Once paired, caregiver's phone rings natively even when browser is closed.
                    </span>
                  </div>

                  {/* QR Code Display */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <QRCodeSVG value={pairUrl} size={168} level="M" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-1">
                      <QrCode className="w-3.5 h-3.5 text-slate-400" />
                      Scan with caregiver's phone camera
                    </p>
                  </div>

                  {/* WhatsApp & Copy Sharing */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Send on WhatsApp</span>
                    </a>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pairUrl);
                        setCopiedPairUrl(true);
                        setTimeout(() => setCopiedPairUrl(false), 2500);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-all active:scale-95"
                    >
                      {copiedPairUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Copy Mobile Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Active Cloudflare URL preview */}
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-mono break-all flex items-center justify-between gap-2">
                    <span className="truncate">{pairUrl}</span>
                    <a
                      href={pairUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 shrink-0 font-sans font-bold flex items-center gap-1"
                      title="Open on this PC to test"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Test PC
                    </a>
                  </div>

                  {/* Test Ring Action */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">One-Click Ring Test:</span>
                      <button
                        onClick={() => handleTestRingModal(pairingContact._id)}
                        disabled={isTestingRing}
                        className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isTestingRing ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                        <span>Ring Caregiver Phone Now</span>
                      </button>
                    </div>

                    {testRingFeedback && (
                      <p className={`text-xs font-semibold p-2.5 rounded-xl ${
                        testRingFeedback.includes('dispatched')
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {testRingFeedback}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
