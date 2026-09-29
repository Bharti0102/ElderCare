import React, { useState, useEffect } from 'react';
import { X, Building2, Phone, User, Stethoscope, MapPin, Heart } from 'lucide-react';
import { HospitalReception, CreateReceptionDTO } from '../../types';



interface SaveReceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateReceptionDTO) => Promise<void>;
  initialData?: HospitalReception | null;
}

export const SaveReceptionModal: React.FC<SaveReceptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [hospitalName, setHospitalName] = useState('');
  const [receptionPhone, setReceptionPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [department, setDepartment] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setHospitalName(initialData.hospitalName);
      setReceptionPhone(initialData.receptionPhone);
      setDoctorName(initialData.doctorName || '');
      setDepartment(initialData.department || '');
      setAddress(initialData.address || '');
      setNotes(initialData.notes || '');
      setIsFavorite(!!initialData.isFavorite);
    } else {
      setHospitalName('');
      setReceptionPhone('');
      setDoctorName('');
      setDepartment('');
      setAddress('');
      setNotes('');
      setIsFavorite(false);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalName.trim() || !receptionPhone.trim()) {
      setError('Hospital name and reception phone number are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSave({
        hospitalName: hospitalName.trim(),
        receptionPhone: receptionPhone.trim(),
        doctorName: doctorName.trim() || undefined,
        department: department.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        isFavorite,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save reception contact.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {initialData ? 'Edit Clinic / Reception Desk' : 'Save New Clinic & Reception'}
              </h2>
              <p className="text-xs text-slate-400">Save hospital phone numbers for quick calling & booking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Hospital / Clinic Name *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Apollo Hospital / City Heart Center"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Reception Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={receptionPhone}
                  onChange={(e) => setReceptionPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. +91 98765 43210 or 022-28491234"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Doctor Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Dr. Rajesh Sharma"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Specialty / Department
              </label>
              <div className="relative">
                <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Cardiology, Senior Wellness"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Clinic Address / Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. 14 MG Road, Near Central Metro"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Notes / Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Call before 11 AM for tokens, closed on Sundays"
              />
            </div>


            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <Heart className="w-4 h-4 text-rose-500 fill-rose-100" />
                <span>Mark as Primary / Favorite Clinic</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : initialData ? 'Update Clinic' : 'Save Clinic Desk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
