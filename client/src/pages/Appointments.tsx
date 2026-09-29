import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Phone,
  Building2,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Heart,
  Trash2,
  Edit2,
  Download,
  MapPin,
} from 'lucide-react';

import { HospitalReception, Appointment, CreateReceptionDTO } from '../types';
import {
  getSavedReceptions,
  createSavedReception,
  updateSavedReception,
  deleteSavedReception,
  getAppointments,
  confirmAppointment,
  cancelAppointment,
  deleteAppointment,
} from '../services/appointment.service';
import { AppointmentCallModal } from '../components/appointments/AppointmentCallModal';
import { SaveReceptionModal } from '../components/appointments/SaveReceptionModal';
import { playReminderChime } from '../services/voiceNotification.service';

export const Appointments: React.FC = () => {


  // Data states
  const [receptions, setReceptions] = useState<HospitalReception[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');

  // Modals state
  const [selectedReceptionForCall, setSelectedReceptionForCall] = useState<HospitalReception | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isSaveReceptionModalOpen, setIsSaveReceptionModalOpen] = useState(false);
  const [editingReception, setEditingReception] = useState<HospitalReception | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [recs, appts] = await Promise.all([getSavedReceptions(), getAppointments()]);
      setReceptions(recs);
      setAppointments(appts);
    } catch (err: any) {
      console.error('Failed to load appointments data:', err);
      setError(err.message || 'Failed to load clinic reception numbers & appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Call & Book Dialog
  const handleOpenCallModal = (rec: HospitalReception) => {
    setSelectedReceptionForCall(rec);
    setIsCallModalOpen(true);
  };

  // Direct Phone Dialing using Inbuilt Phone Dialer
  const handleDirectPhoneDial = (phone: string) => {
    const clean = phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${clean}`;
  };

  // Direct Truecaller Dialing
  const handleDirectTruecallerDial = (phone: string) => {
    const clean = phone.replace(/[^0-9+]/g, '');
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href = `intent://call?number=${encodeURIComponent(clean)}#Intent;scheme=truecaller;package=com.truecaller;end`;
    } else if (isMobile) {
      window.location.href = `truecaller://call?phone=${encodeURIComponent(clean)}`;
      setTimeout(() => {
        window.location.href = `tel:${clean}`;
      }, 1200);
    } else {
      window.open(`https://www.truecaller.com/search/in/${clean.replace('+', '')}`, '_blank');
      window.location.href = `tel:${clean}`;
    }
  };

  // Save / Update Reception
  const handleSaveReception = async (data: CreateReceptionDTO) => {
    if (editingReception) {
      await updateSavedReception(editingReception._id, data);
    } else {
      await createSavedReception(data);
    }
    await fetchData();
    playReminderChime();
  };

  // Delete Reception
  const handleDeleteReception = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from saved reception numbers?`)) {
      return;
    }
    try {
      await deleteSavedReception(id);
      setReceptions(receptions.filter((r) => r._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to remove reception contact.');
    }
  };

  // Confirm pending appointment
  const handleConfirmAppointment = async (id: string) => {
    try {
      const updated = await confirmAppointment(id);
      setAppointments(appointments.map((a) => (a._id === id ? updated : a)));
      playReminderChime();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm appointment.');
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const updated = await cancelAppointment(id, 'Patient requested cancellation');
      setAppointments(appointments.map((a) => (a._id === id ? updated : a)));
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment.');
    }
  };

  // Delete appointment record
  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm('Delete this appointment record from history?')) return;
    try {
      await deleteAppointment(id);
      setAppointments(appointments.filter((a) => a._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to remove appointment.');
    }
  };

  // Export .ics Calendar File
  const handleDownloadCalendarInvite = (appt: Appointment) => {
    const startDate = new Date(appt.requestedDate);
    // Parse time like 10:30 AM
    const timeMatch = appt.requestedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      startDate.setHours(hours, minutes, 0, 0);
    }
    const endDate = new Date(startDate.getTime() + 45 * 60000); // 45 min duration

    const formatDateToICS = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ElderCare AI//Medical Appointment//EN',
      'BEGIN:VEVENT',
      `UID:eldercare-${appt._id}@eldercareai.com`,
      `DTSTAMP:${formatDateToICS(new Date())}`,
      `DTSTART:${formatDateToICS(startDate)}`,
      `DTEND:${formatDateToICS(endDate)}`,
      `SUMMARY:Medical Appointment with ${appt.doctor || 'Doctor'} - ${appt.hospital}`,
      `DESCRIPTION:Appointment at ${appt.hospital}\\nDoctor: ${appt.doctor}\\nDepartment: ${appt.department}\\nReception Phone: ${appt.receptionPhone}`,
      `LOCATION:${appt.hospital}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Appointment_${appt.hospital.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists
  const filteredReceptions = receptions.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.hospitalName.toLowerCase().includes(q) ||
      (r.doctorName && r.doctorName.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q)) ||
      r.receptionPhone.includes(q)
    );
  });

  const filteredAppointments = appointments.filter((a) => {
    if (appointmentFilter === 'CONFIRMED') return a.status === 'CONFIRMED';
    if (appointmentFilter === 'PENDING') return a.status === 'PENDING_CONFIRMATION' || a.status === 'PROPOSED';
    if (appointmentFilter === 'CANCELLED') return a.status === 'CANCELLED';
    return true;
  });

  return (


    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-400/30 mb-3">
                <Calendar className="w-3.5 h-3.5" />
                <span>Appointments & Consultations</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Doctor Appointments
              </h1>
              <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Connect with your healthcare providers, schedule consultations, and manage your upcoming clinic visits.
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setEditingReception(null);
                  setIsSaveReceptionModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-sm shadow-lg shadow-brand-900/30 active:scale-98 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Add Clinic</span>
              </button>
            </div>
          </div>

          {/* Key Metrics / Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800/80">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xl font-black text-white">{receptions.length}</span>
                <p className="text-xs text-slate-400 font-semibold">Saved Clinics</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xl font-black text-white">
                  {appointments.filter((a) => a.status === 'CONFIRMED').length}
                </span>
                <p className="text-xs text-slate-400 font-semibold">Confirmed Visits</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xl font-black text-white">{appointments.length}</span>
                <p className="text-xs text-slate-400 font-semibold">Total Appointments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-bold uppercase tracking-wider text-rose-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SECTION 1: Saved Clinic Directory */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900">Saved Clinics & Doctors</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-black">
                  {receptions.length}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Select a clinic to place a direct call or schedule an in-clinic appointment.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clinic or doctor..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
              />
            </div>
          </div>

          {/* Clinic Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-3xl bg-white border border-slate-200 animate-pulse p-6" />
              ))}
            </div>
          ) : filteredReceptions.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center space-y-4">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-800">No saved clinics found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Add your primary clinic or hospital reception desk to make one-tap calls.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingReception(null);
                  setIsSaveReceptionModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Clinic</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReceptions.map((rec) => (
                <div
                  key={rec._id}
                  className="rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Card Header */}
                  <div className="p-5 pb-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 group-hover:scale-105 transition-transform flex-shrink-0">
                          <Building2 className="w-6 h-6 stroke-[2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-black text-slate-900 text-base leading-tight">
                              {rec.hospitalName}
                            </h3>
                            {rec.isFavorite && (
                              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {rec.doctorName ? `${rec.doctorName}` : 'General Consultation'}
                          </p>
                        </div>
                      </div>

                      {/* Edit / Delete actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingReception(rec);
                            setIsSaveReceptionModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Clinic"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReception(rec._id, rec.hospitalName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Clinic"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Department tag & phone */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {rec.department || 'Outpatient Clinic'}
                      </span>
                      <div className="flex items-center gap-1 font-mono font-bold text-xs text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{rec.receptionPhone}</span>
                      </div>
                    </div>

                    {/* Address & Clinic details */}
                    <div className="space-y-2 pt-2 text-xs text-slate-600">
                      {rec.address && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1 text-slate-700">{rec.address}</span>
                        </div>
                      )}
                      {rec.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-2">
                          &ldquo;{rec.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Action Bar */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2">
                    {/* Primary Button */}
                    <button
                      onClick={() => handleOpenCallModal(rec)}
                      className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Appointment</span>
                    </button>

                    {/* Quick Direct Calling Sub-Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDirectPhoneDial(rec.receptionPhone)}
                        className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>Phone</span>
                      </button>

                      <button
                        onClick={() => handleDirectTruecallerDial(rec.receptionPhone)}
                        className="py-1.5 px-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-blue-900 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <span className="w-3.5 h-3.5 rounded bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                          TC
                        </span>
                        <span>Truecaller</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: My Appointments Schedule */}
        <section className="space-y-5 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900">My Appointments Schedule</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 text-xs font-black">
                  {appointments.length} Total
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                View confirmed visits, manage your doctor consultation schedule, or add to your calendar.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
              {(['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAppointmentFilter(filter)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                    appointmentFilter === filter
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {filter === 'ALL'
                    ? 'All'
                    : filter === 'CONFIRMED'
                    ? 'Confirmed'
                    : filter === 'PENDING'
                    ? 'Proposed / Pending'
                    : 'Cancelled'}
                </button>
              ))}
            </div>
          </div>

          {/* Appointments List */}
          {filteredAppointments.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
              <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No appointments in this category</p>
              <p className="text-xs text-slate-500">
                Use the cards above to call a clinic reception and book your next appointment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appt) => {
                const isConfirmed = appt.status === 'CONFIRMED';
                const isPending = appt.status === 'PENDING_CONFIRMATION' || appt.status === 'PROPOSED';
                const isCancelled = appt.status === 'CANCELLED';

                const dateFormatted = new Date(appt.requestedDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={appt._id}
                    className={`rounded-3xl bg-white border transition-all p-5 sm:p-6 shadow-xs ${
                      isConfirmed
                        ? 'border-emerald-200 hover:border-emerald-300'
                        : isPending
                        ? 'border-indigo-200 hover:border-indigo-300'
                        : 'border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            isConfirmed
                              ? 'bg-emerald-100 text-emerald-700'
                              : isPending
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Calendar className="w-7 h-7 stroke-[2]" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-slate-900">{appt.hospital}</h3>
                            {/* Status badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isConfirmed
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {isConfirmed
                                ? 'Confirmed'
                                : isPending
                                ? 'Pending Confirmation'
                                : 'Cancelled'}
                            </span>

                            {/* Consultation type */}
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              <span>In-Clinic Visit</span>
                            </span>
                          </div>

                          <p className="text-sm font-bold text-slate-700">
                            Dr. {appt.doctor || 'Consultant'} •{' '}
                            <span className="font-normal text-slate-500">{appt.department || 'General Medicine'}</span>
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                            <div className="flex items-center gap-1 font-bold text-slate-900">
                              <Calendar className="w-3.5 h-3.5 text-brand-600" />
                              <span>{dateFormatted}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1 font-bold text-slate-900">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{appt.requestedTime}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{appt.receptionPhone}</span>
                            </div>
                          </div>

                          {appt.patientNotes && (
                            <p className="text-xs text-slate-500 italic pt-1">
                              &ldquo;{appt.patientNotes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                        {isPending && (
                          <button
                            onClick={() => handleConfirmAppointment(appt._id)}
                            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirm</span>
                          </button>
                        )}

                        {isConfirmed && (
                          <button
                            onClick={() => handleDownloadCalendarInvite(appt)}
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                            title="Download .ics calendar event"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Add to Calendar</span>
                          </button>
                        )}

                        {/* Call clinic again */}
                        <button
                          onClick={() => handleDirectPhoneDial(appt.receptionPhone)}
                          className="py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs transition-colors flex items-center gap-1.5 border border-sky-200 shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5 text-sky-600" />
                          <span>Call</span>
                        </button>

                        {!isCancelled && (
                          <button
                            onClick={() => handleCancelAppointment(appt._id)}
                            className="py-2 px-3 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-700 font-bold text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteAppointment(appt._id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete appointment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Appointment Call & Booking Modal */}
      {selectedReceptionForCall && (
        <AppointmentCallModal
          reception={selectedReceptionForCall}
          isOpen={isCallModalOpen}
          onClose={() => {
            setIsCallModalOpen(false);
            setSelectedReceptionForCall(null);
          }}
          onAppointmentBooked={async () => {
            await fetchData();
          }}
        />
      )}

      {/* Save Reception Modal */}
      <SaveReceptionModal
        isOpen={isSaveReceptionModalOpen}
        onClose={() => {
          setIsSaveReceptionModalOpen(false);
          setEditingReception(null);
        }}
        onSave={handleSaveReception}
        initialData={editingReception}
      />
    </div>
  );
};
