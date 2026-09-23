import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Sparkles,
  UserCheck,
  Clock,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  MessageSquare,
  Building2,
  Radio,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  initiateCaregiverCall,
  getCalls,
  hangupCall,
} from '../services/calling.service';
import { getContacts } from '../services/contact.service';
import { speakText, playReminderChime } from '../services/voiceNotification.service';
import { Call, EmergencyContact } from '../types';

export const Calls: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active in-call state
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isDialing, setIsDialing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contactList, callList] = await Promise.all([
        getContacts(),
        getCalls(),
      ]);
      setContacts(contactList);
      setCalls(callList);

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

  const handleStartCall = async (contact: EmergencyContact) => {
    try {
      setIsDialing(true);
      setError(null);
      playReminderChime();
      speakText(`Calling your ${contact.relationship}, ${contact.name}. Please stay on the line.`);

      const call = await initiateCaregiverCall({
        contactId: contact._id,
        relationship: contact.relationship,
        name: contact.name,
      });

      setActiveCall(call);
      setCallDuration(0);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate phone call');
      speakText('Could not complete call. Please check your emergency contacts.');
    } finally {
      setIsDialing(false);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      await hangupCall(activeCall._id);
      speakText('Call disconnected.');
      setActiveCall(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to end call');
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
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CALLING':
        return 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'FAILED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-sky-100 text-sky-800 border-sky-300';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Phase 5: Active & Operational
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Caregiver & Emergency Calling
          </h1>
          <p className="text-slate-600 mt-1">
            Directly dial your verified family caregiver, daughter, son, or doctor with one tap or natural voice command.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="elder-btn-secondary text-sm flex items-center gap-1.5"
            title="Call with voice via AI Companion"
          >
            <MessageSquare className="w-4 h-4 text-brand-600" />
            <span>Call via AI Chat</span>
          </Link>
          <Link
            to="/profile"
            className="elder-btn-primary flex items-center gap-1.5 shadow-md shadow-brand-500/20 text-sm"
          >
            <UserCheck className="w-4 h-4" />
            <span>Manage Contacts</span>
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl flex items-center gap-2">
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
                <PhoneCall className="w-8 h-8 text-emerald-200" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider text-emerald-200">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Call {activeCall.status}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {activeCall.contactName} ({activeCall.relationship})
                </h2>
                <p className="text-sky-100 text-sm font-mono">
                  {activeCall.phoneNumber} • Duration: <span className="font-bold text-white text-base">{formatSeconds(callDuration)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                onClick={handleEndCall}
                className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold rounded-2xl flex items-center gap-2 shadow-lg shadow-rose-900/40 transition-all text-base"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Prompt Pro-Tip */}
      <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-sky-900">
          <span className="font-bold">Natural Voice Calling: </span>
          You can tell the AI Companion in Chat:
          <span className="italic font-medium text-sky-950 ml-1">
            "Call my daughter"
          </span>{' '}
          or{' '}
          <span className="italic font-medium text-sky-950">
            "Call my doctor"
          </span>
          — and it will automatically resolve your verified contact and place the call without dialing manually!
        </div>
      </div>

      {/* Caregiver Quick-Dial Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-600" />
            Verified Caregivers & Emergency Contacts
          </h2>
          <span className="text-xs text-slate-500">Configured in Profile</span>
        </div>

        {loading && contacts.length === 0 ? (
          <div className="text-center py-12">
            <RotateCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-500">Loading your emergency contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="elder-card p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">No Emergency Contacts Registered</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Before you can place direct calls, please add your daughter, son, or doctor in your Profile.
              </p>
            </div>
            <Link to="/profile" className="elder-btn-primary inline-flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span>Add Caregiver in Profile</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact) => (
              <div
                key={contact._id}
                className="elder-card p-6 flex flex-col justify-between border-l-4 border-l-brand-600 hover:shadow-lg transition-all bg-white"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                      {contact.relationship}
                    </span>
                    {contact.isPrimary && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Primary Caregiver
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{contact.name}</h3>
                    <p className="text-sm font-mono text-slate-500 mt-0.5">{contact.phone}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleStartCall(contact)}
                    disabled={isDialing || (activeCall !== null && activeCall.status !== 'COMPLETED')}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Call {contact.name.split(' ')[0]}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Hospital Dialing Preview (Phase 6 Preview) */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <div className="elder-card p-6 bg-slate-50 border-dashed border-2 border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-white rounded-2xl text-slate-400 border border-slate-200">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Phase 6 Preview
              </span>
              <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                Hospital Reception & Autonomous Booking Inquiries
              </h3>
              <p className="text-sm text-slate-500 max-w-xl">
                In Phase 6, ElderCare AI will directly call hospital receptionists extracted from your prescriptions to check appointment availability and schedule visits.
              </p>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-1 bg-white rounded-xl border border-slate-200 self-start sm:self-center">
            Upcoming in Phase 6
          </div>
        </div>
      </section>

      {/* Call History & Telephony Logs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-brand-600" />
            Call History & Telephony Records
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
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Relationship</th>
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
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{c.relationship}</td>
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
