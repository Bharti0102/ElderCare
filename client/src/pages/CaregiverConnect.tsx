import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  PhoneCall,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Volume2,
  ArrowRight,
  HeartHandshake,
} from 'lucide-react';
import { PushNotificationService } from '../services/pushNotification.service';

interface ContactStatus {
  name: string;
  relationship: string;
  phone: string;
}

export const CaregiverConnect: React.FC = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const [contact, setContact] = useState<ContactStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) {
      setError('Invalid pairing link. No contact ID specified.');
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/notifications/status/${contactId}`);
        const data = await res.json();
        if (data.success && data.data?.contact) {
          setContact(data.data.contact);
          const hasLocalSub = await PushNotificationService.hasActiveSubscription();
          setIsSubscribed(hasLocalSub || data.data.isPaired);
        } else {
          setError(data.error?.message || 'Contact pairing record not found.');
        }
      } catch {
        setError('Failed to reach server. Please ensure you are connected to the network.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [contactId]);

  const handleEnableCalling = async () => {
    if (!contactId) return;
    setSubscribing(true);
    setTestStatus(null);
    try {
      const result = await PushNotificationService.subscribe({
        contactId,
        recipientName: contact?.name,
      });

      if (result.success) {
        setIsSubscribed(true);
        localStorage.setItem('eldercare_paired_contact_id', contactId);
        setTestStatus('✅ Device successfully paired! You will now receive instant incoming call rings.');
      } else {
        setError(result.error || 'Failed to enable notifications.');
      }
    } catch (err: any) {
      setError(err.message || 'Notification pairing failed.');
    } finally {
      setSubscribing(false);
    }
  };

  const handleTestRing = async () => {
    if (!contactId) return;
    setTestStatus('Sending test incoming call ring to this device...');
    const ok = await PushNotificationService.testRing(contactId);
    if (ok) {
      setTestStatus('🔔 Test ring dispatched! Check your notifications and sound.');
    } else {
      setTestStatus('Could not dispatch test ring. Please verify notification permissions.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Caregiver Direct Connect</h1>
          <p className="text-sm text-slate-400">
            WhatsApp-style incoming call receiver for ElderCare AI
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Connecting to server...</div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        ) : (
          <>
            {/* Contact Card */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Assigned Caregiver</span>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {contact?.relationship || 'Caregiver'}
                </span>
              </div>
              <div className="text-lg font-semibold text-white">{contact?.name}</div>
              <div className="text-xs text-slate-400">Registered phone: +91 {contact?.phone}</div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              {isSubscribed ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-xs text-emerald-300 font-medium">
                    Device Active & Ready for Incoming Calls
                  </div>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="text-xs text-amber-300 font-medium">
                    Direct incoming call notifications not enabled yet
                  </div>
                </>
              )}
            </div>

            {/* Test or Feedback Notice */}
            {testStatus && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                {testStatus}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {!isSubscribed ? (
                <button
                  onClick={handleEnableCalling}
                  disabled={subscribing}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  <Bell className="w-5 h-5" />
                  {subscribing ? 'Registering Device...' : 'Enable 1-Click Direct Calls'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 font-medium py-1">
                    <CheckCircle2 className="w-5 h-5" />
                    Paired for Instant Incoming Calls
                  </div>
                  <button
                    onClick={handleTestRing}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    Test Ring This Phone
                  </button>
                </div>
              )}
            </div>

            {/* Feature Highlights */}
            <div className="border-t border-slate-800/80 pt-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">How Direct Calling Works</h3>
              <ul className="text-xs text-slate-300 space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>100% Free & Unlimited:</strong> Uses browser Web Push & WebRTC — no SMS gateway charges or subscriptions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Instant 1-Click Answering:</strong> When you receive a call, tap "Answer" to connect immediately with two-way audio & video.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Runs in Background:</strong> You will be notified even if your browser is minimized or phone is locked.</span>
                </li>
              </ul>
            </div>
          </>
        )}

        <div className="text-center pt-2">
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-400 inline-flex items-center gap-1">
            Go to ElderCare AI Dashboard <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
