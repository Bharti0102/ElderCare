import React, { useState } from 'react';
import {
  X,
  Phone,
  Calendar,
  CheckCircle,
  Copy,
  Check,
  MapPin,
} from 'lucide-react';
import { HospitalReception, Appointment } from '../../types';
import { createDirectAppointment } from '../../services/appointment.service';
import { playReminderChime } from '../../services/voiceNotification.service';

interface AppointmentCallModalProps {
  reception: HospitalReception;
  isOpen: boolean;
  onClose: () => void;
  onAppointmentBooked: (appointment?: Appointment) => void;
}

export const AppointmentCallModal: React.FC<AppointmentCallModalProps> = ({
  reception,
  isOpen,
  onClose,
  onAppointmentBooked,
}) => {
  const [copied, setCopied] = useState(false);

  // Tomorrow as default date
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM');
  const [customSlot, setCustomSlot] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanPhone = reception.receptionPhone.replace(/[^0-9+]/g, '');

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(cleanPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePhoneDial = () => {
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleTruecallerDial = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href = `intent://call?number=${encodeURIComponent(cleanPhone)}#Intent;scheme=truecaller;package=com.truecaller;end`;
    } else if (isMobile) {
      window.location.href = `truecaller://call?phone=${encodeURIComponent(cleanPhone)}`;
      setTimeout(() => {
        window.location.href = `tel:${cleanPhone}`;
      }, 1200);
    } else {
      window.open(`https://www.truecaller.com/search/in/${cleanPhone.replace('+', '')}`, '_blank');
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    const finalSlot = customSlot.trim() || selectedSlot;

    try {
      const appt = await createDirectAppointment({
        hospital: reception.hospitalName,
        receptionPhone: reception.receptionPhone,
        doctor: reception.doctorName || 'Doctor on Duty',
        department: reception.department || 'General Medicine',
        requestedDate: selectedDate,
        requestedTime: finalSlot,
        patientNotes: patientNotes.trim() || 'In-Clinic Consultation',
        source: 'HUMAN_CALL',
        status: 'CONFIRMED',
      });

      setBookingSuccess(true);
      playReminderChime();

      setTimeout(() => {
        onAppointmentBooked(appt);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to log appointment:', err);
      setErrorMessage(err.message || 'Failed to save appointment. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const commonSlots = ['09:30 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'];

  // Doctor initials for avatar
  const doctorInitials = reception.doctorName
    ? reception.doctorName
        .replace(/^Dr\.?\s*/i, '')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'MD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 pr-10">
            <div className="w-13 h-13 rounded-2xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300 font-black text-lg flex-shrink-0">
              {doctorInitials}
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight">
                {reception.doctorName ? `Dr. ${reception.doctorName.replace(/^Dr\.?\s*/i, '')}` : reception.hospitalName}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-semibold text-brand-300">
                  {reception.hospitalName}
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-xs text-slate-400">
                  {reception.department || 'General Medicine'}
                </span>
              </div>
              {reception.address && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="line-clamp-1">{reception.address}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Call Action Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  Contact Number
                </span>
                <p className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                  {reception.receptionPhone}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all shadow-2xs"
                title="Copy phone number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Direct Calling Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handlePhoneDial}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Call Phone</span>
              </button>

              <button
                type="button"
                onClick={handleTruecallerDial}
                className="py-2.5 px-4 rounded-xl bg-[#0087FF] hover:bg-[#0077e6] active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <span className="w-4 h-4 rounded bg-white text-[#0087FF] text-[10px] font-black flex items-center justify-center">
                  TC
                </span>
                <span>Truecaller</span>
              </button>
            </div>
          </div>

          {/* Schedule Consultation Form */}
          <form onSubmit={handleSaveAppointment} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Schedule Consultation
              </h3>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {errorMessage}
              </div>
            )}

            {bookingSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-base font-extrabold text-emerald-900">Appointment Scheduled</h4>
                <p className="text-xs text-emerald-700">
                  Added to your appointments list.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                    />
                  </div>

                  {/* Time Slot */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Time Slot
                    </label>
                    <input
                      type="text"
                      value={customSlot || selectedSlot}
                      onChange={(e) => {
                        setCustomSlot(e.target.value);
                        setSelectedSlot(e.target.value);
                      }}
                      placeholder="e.g. 10:30 AM"
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                    />
                  </div>
                </div>

                {/* Slot Pills */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold text-slate-400">
                    Suggested times:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {commonSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setCustomSlot('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          selectedSlot === slot && !customSlot
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason for Visit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for Visit <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    placeholder="e.g. Follow-up checkup, test results review"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Confirm Button */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-98 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-brand-900/10 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Confirm Appointment'}</span>
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
