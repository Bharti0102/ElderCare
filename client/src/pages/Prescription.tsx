import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Pill,
  Building2,
  User,
  Phone,
  Calendar,
  Clock,
  Trash2,
  Volume2,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  uploadPrescription,
  getPrescriptions,
  confirmPrescription,
  createRemindersFromPrescription,
  deletePrescription,
} from '../services/prescription.service';
import {
  speakText,
} from '../services/voiceNotification.service';
import type { Prescription as IPrescription, PrescriptionMedicine } from '../types';

export const Prescription: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<IPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active / Selected Prescription under review
  const [selectedRx, setSelectedRx] = useState<IPrescription | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit/Review form state
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isBridging, setIsBridging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getPrescriptions();
      setPrescriptions(list);
      if (list.length > 0 && !selectedRx) {
        initReviewState(list[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const initReviewState = (rx: IPrescription) => {
    setSelectedRx(rx);
    setDoctorName(rx.doctor?.name || '');
    setDoctorSpecialty(rx.doctor?.specialty || '');
    setHospitalName(rx.hospital?.name || '');
    setHospitalPhone(rx.receptionPhone || '');
    setMedicines([...(rx.medicines || [])]);
    setIsEditing(rx.status !== 'CONFIRMED');
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setSuccessMsg(null);
      const rx = await uploadPrescription(file);
      setPrescriptions((prev) => [rx, ...prev]);
      initReviewState(rx);
      setSuccessMsg('Prescription analyzed successfully! Please verify the extracted information below.');
      speakText('Prescription uploaded and analyzed. Please review the extracted medications and confirm.');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze prescription');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleConfirm = async () => {
    if (!selectedRx) return;
    try {
      setIsConfirming(true);
      setError(null);
      const updated = await confirmPrescription(selectedRx._id, {
        doctor: { name: doctorName, specialty: doctorSpecialty },
        hospital: { name: hospitalName },
        receptionPhone: hospitalPhone,
        medicines: medicines.filter((m) => m.name.trim().length > 0),
      });

      setSelectedRx(updated);
      setIsEditing(false);
      setSuccessMsg('Prescription verified and confirmed! You can now create reminders for these medications.');
      speakText('Prescription confirmed successfully.');
      await fetchPrescriptions();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm prescription');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleBridgeToReminders = async () => {
    if (!selectedRx) return;
    try {
      setIsBridging(true);
      setError(null);
      const res = await createRemindersFromPrescription(selectedRx._id);
      setSuccessMsg(
        `🎉 Successfully generated ${res.count} medication reminders! They are now active in your Reminders Agent.`
      );
      speakText(
        `Created ${res.count} reminders from your prescription. I will remind you at the scheduled times.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to generate reminders');
    } finally {
      setIsBridging(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this prescription record?')) return;
    try {
      await deletePrescription(id);
      if (selectedRx?._id === id) {
        setSelectedRx(null);
      }
      await fetchPrescriptions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete prescription');
    }
  };

  const handleReadAloud = (rx: IPrescription) => {
    const medNames = rx.medicines.map((m) => `${m.name} ${m.dosage || ''}`).join(', ');
    const speech = `Prescription from ${rx.doctor?.name || 'Doctor'} at ${
      rx.hospital?.name || 'Clinic'
    }. Prescribed medicines: ${medNames || 'none listed'}.`;
    speakText(speech, { playChimeFirst: true });
  };

  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: '',
        dosage: '1 tablet',
        frequency: 'Daily',
        instructions: 'Take with water',
      },
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (
    index: number,
    field: keyof PrescriptionMedicine,
    value: string
  ) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Phase 4: Active & Operational
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Prescription Vision & Intelligence
          </h1>
          <p className="text-slate-600 mt-1">
            Upload doctor prescriptions to extract verified medications, dosages, and hospital contacts without medical hallucination.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/reminders"
            className="elder-btn-secondary text-sm flex items-center gap-1.5"
            title="View scheduled medication reminders"
          >
            <Clock className="w-4 h-4 text-brand-600" />
            <span>View Reminders</span>
          </Link>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="elder-btn-primary flex items-center gap-1.5 shadow-md shadow-brand-500/20"
            disabled={uploading}
          >
            <UploadCloud className="w-5 h-5" />
            <span>{uploading ? 'Analyzing...' : 'Upload Prescription'}</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
      />

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`elder-card p-8 sm:p-10 border-2 border-dashed transition-all cursor-pointer text-center space-y-4 ${
          uploading
            ? 'border-brand-500 bg-brand-50/50'
            : 'border-slate-300 hover:border-brand-500 hover:bg-slate-50/60'
        }`}
      >
        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
          {uploading ? (
            <RotateCw className="w-8 h-8 animate-spin text-brand-600" />
          ) : (
            <UploadCloud className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-900">
            {uploading ? 'Analyzing Prescription Document...' : 'Upload Prescription Document'}
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {uploading
              ? 'Our Multimodal Vision OCR is reading medicine names, dosages, and clinic contacts...'
              : 'Drag & drop your prescription image (JPEG, PNG) or PDF here, or click to browse.'}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span>Supported: JPG, PNG, WebP, PDF</span>
          <span>•</span>
          <span>Max Size: 10MB</span>
        </div>
      </div>

      {/* Extracted Details & Caregiver Review Card */}
      {selectedRx && (
        <div className="elder-card p-6 sm:p-8 bg-white border-2 border-brand-200/90 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
          {/* Card Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    selectedRx.status === 'CONFIRMED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {selectedRx.status}
                </span>
                <span className="text-xs text-slate-500">
                  Confidence: {Math.round(selectedRx.confidence * 100)}%
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedRx.fileName}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {selectedRx.status === 'CONFIRMED'
                  ? 'Verified Prescription Details'
                  : 'Extracted Prescription — Caregiver Review'}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleReadAloud(selectedRx)}
                className="elder-btn-secondary text-xs font-bold flex items-center gap-1.5"
                title="Read prescription details aloud"
              >
                <Volume2 className="w-4 h-4 text-brand-600" />
                <span>Read Aloud</span>
              </button>

              <a
                href={selectedRx.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="elder-btn-secondary text-xs font-bold flex items-center gap-1.5"
                title="View original uploaded file"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                <span>View Original</span>
              </a>

              {selectedRx.status === 'CONFIRMED' && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="elder-btn-secondary text-xs font-bold"
                >
                  Edit Details
                </button>
              )}
            </div>
          </div>

          {/* Form Fields: Doctor & Hospital Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-brand-600" />
                <span>Doctor Name</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g., Dr. Sarah Mitchell"
                  className="elder-input text-sm"
                />
              ) : (
                <p className="font-bold text-slate-800 text-base">
                  {doctorName || 'Not specified'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                <span>Doctor Specialty</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={doctorSpecialty}
                  onChange={(e) => setDoctorSpecialty(e.target.value)}
                  placeholder="e.g., Geriatrics & Cardiology"
                  className="elder-input text-sm"
                />
              ) : (
                <p className="font-medium text-slate-700 text-sm">
                  {doctorSpecialty || 'General Practice'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-brand-600" />
                <span>Hospital / Clinic</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g., St. Jude Clinic"
                  className="elder-input text-sm"
                />
              ) : (
                <p className="font-bold text-slate-800 text-base">
                  {hospitalName || 'Not specified'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Reception Phone</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={hospitalPhone}
                  onChange={(e) => setHospitalPhone(e.target.value)}
                  placeholder="e.g., +1-555-019-4820"
                  className="elder-input text-sm font-mono"
                />
              ) : (
                <p className="font-bold text-emerald-700 text-sm font-mono">
                  {hospitalPhone || 'Not specified'}
                </p>
              )}
            </div>
          </div>

          {/* Medicines Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-rose-600" />
                <span>Prescribed Medications ({medicines.length})</span>
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleAddMedicineRow}
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Medicine</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left font-bold">
                  <tr>
                    <th className="px-4 py-3">Medicine Name</th>
                    <th className="px-4 py-3">Dosage</th>
                    <th className="px-4 py-3">Frequency</th>
                    <th className="px-4 py-3">Instructions</th>
                    <th className="px-4 py-3">Duration</th>
                    {isEditing && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {medicines.map((med, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                            placeholder="Medicine name"
                            className="elder-input text-xs"
                          />
                        ) : (
                          med.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.dosage || ''}
                            onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                            placeholder="e.g. 5mg"
                            className="elder-input text-xs"
                          />
                        ) : (
                          med.dosage || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.frequency || ''}
                            onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                            placeholder="e.g. Daily"
                            className="elder-input text-xs"
                          />
                        ) : (
                          med.frequency || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.instructions || ''}
                            onChange={(e) =>
                              handleMedicineChange(idx, 'instructions', e.target.value)
                            }
                            placeholder="e.g. With breakfast"
                            className="elder-input text-xs"
                          />
                        ) : (
                          med.instructions || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.duration || ''}
                            onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                            placeholder="e.g. 30 days"
                            className="elder-input text-xs"
                          />
                        ) : (
                          med.duration || 'Ongoing'
                        )}
                      </td>
                      {isEditing && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strict Medical Safety Disclaimer */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Medical Safety & Care Protocol: </strong>
              ElderCare AI extracts document information for care coordination only. The system does not diagnose illnesses or modify prescriptions. Always consult your pharmacist or primary care physician with any dosage questions.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-400 font-mono">
              Recorded on {new Date(selectedRx.createdAt).toLocaleDateString()}
            </div>

            <div className="flex items-center gap-3">
              {isEditing ? (
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="elder-btn-primary flex items-center gap-1.5 shadow-md shadow-brand-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{isConfirming ? 'Saving Verification...' : 'Confirm & Save Prescription'}</span>
                </button>
              ) : (
                <>
                  <Link
                    to={`/calls?tab=hospital&rxId=${selectedRx._id}`}
                    className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-sky-500/20 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Book Follow-up / Call Clinic</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={handleBridgeToReminders}
                    disabled={isBridging || medicines.length === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{isBridging ? 'Scheduling Reminders...' : 'Create Medication Reminders'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prescription History & Document Archive */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" />
            Prescriptions History & Archive
          </h2>
          <button
            onClick={fetchPrescriptions}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Refresh list"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && prescriptions.length === 0 ? (
          <div className="text-center py-12">
            <RotateCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-500">Loading prescription archives...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="elder-card p-12 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Prescriptions Uploaded Yet</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Upload a prescription above to extract doctor contacts and schedule timely medication alerts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prescriptions.map((rx) => {
              const isCurrent = selectedRx?._id === rx._id;
              return (
                <div
                  key={rx._id}
                  onClick={() => initReviewState(rx)}
                  className={`elder-card p-6 cursor-pointer transition-all hover:shadow-md border-l-4 ${
                    rx.status === 'CONFIRMED' ? 'border-l-emerald-500' : 'border-l-amber-500'
                  } ${isCurrent ? 'ring-2 ring-brand-500 shadow-md bg-white' : 'bg-white'}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                          rx.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {rx.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(rx._id);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h4 className="font-bold text-lg text-slate-900 truncate">
                        {rx.doctor?.name || 'Doctor Prescription'}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        {rx.hospital?.name || 'Clinical record'}
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-rose-500" />
                        <span className="font-semibold text-slate-800">
                          {rx.medicines.length} Medicine{rx.medicines.length > 1 ? 's' : ''}:
                        </span>
                        <span className="truncate">
                          {rx.medicines.map((m) => m.name).join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(rx.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand-600">
                    <span>{isCurrent ? 'Viewing in review' : 'Click to inspect'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
