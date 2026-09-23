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
  Clock,
  Trash2,
  Volume2,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  ExternalLink,
  Info,
  AlertCircle,
  Ban,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  uploadPrescription,
  getPrescriptions,
  confirmPrescription,
  createRemindersFromPrescription,
  deletePrescription,
  lookupMedicine,
} from '../services/prescription.service';
import { speakText } from '../services/voiceNotification.service';
import type { Prescription as IPrescription, PrescriptionMedicine } from '../types';

export const Prescription: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<IPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
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
  const [lookingUpIdx, setLookingUpIdx] = useState<number | null>(null);

  // Reminder schedule modal state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [confirmDailySchedule, setConfirmDailySchedule] = useState(true);
  const [preferredReminderTime, setPreferredReminderTime] = useState('09:00');

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

      // Simulate sequential workflow updates for user visual feedback
      setUploadStep('1/5: Uploading prescription document...');
      setTimeout(() => setUploadStep('2/5: Multimodal OCR / Vision document scanning...'), 600);
      setTimeout(() => setUploadStep('3/5: Extracting medicines, dosages & doctor details...'), 1200);
      setTimeout(() => setUploadStep('4/5: Clinical information lookup (purpose, precautions, interactions)...'), 1800);
      setTimeout(() => setUploadStep('5/5: AI generating simple language explanation for seniors...'), 2400);

      const rx = await uploadPrescription(file);
      setPrescriptions((prev) => [rx, ...prev]);
      initReviewState(rx);
      setSuccessMsg('Prescription analyzed! Medicine information lookup & AI explanations ready below.');
      speakText('Prescription analyzed. You can now review the simple explanations and schedule daily reminders.');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze prescription');
    } finally {
      setUploading(false);
      setUploadStep('');
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

  // Quick sample prescription loader for fast testing
  const handleLoadSample = () => {
    const blob = new Blob(
      [
        `METROPOLITAN COMMUNITY HEALTH CENTER\n` +
          `742 Evergreen Terrace, Medical Suite 300\n` +
          `Physician: Dr. Sarah Mitchell, MD (Internal Medicine & Geriatrics)\n` +
          `Reception: +1-555-019-4820\n` +
          `Date: 2026-09-23\n\n` +
          `PRESCRIPTION:\n` +
          `1. Amlodipine Besylate 5mg - Take 1 tablet once daily in the morning after breakfast. Duration: 90 days.\n` +
          `2. Metformin HCl 500mg - Take 1 tablet twice daily with meals (breakfast & dinner). Duration: 60 days.\n` +
          `3. Atorvastatin 20mg - Take 1 tablet once daily at bedtime with water. Duration: 30 days.`
      ],
      { type: 'text/plain' }
    );
    const file = new File([blob], 'Doctor_Prescription_Cardiology.txt', { type: 'text/plain' });
    handleFileUpload(file);
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
      setSuccessMsg('Prescription verified and saved! Would you like to schedule daily reminders?');
      speakText('Prescription verified and saved. Click Create Medication Reminders to schedule your daily alerts.');
      await fetchPrescriptions();
      // Prompt user with reminder modal automatically
      setShowReminderModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm prescription');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleExecuteBridgeToReminders = async () => {
    if (!selectedRx) return;
    try {
      setIsBridging(true);
      setError(null);
      const res = await createRemindersFromPrescription(selectedRx._id, {
        confirmDaily: confirmDailySchedule,
        preferredTime: preferredReminderTime,
      });

      setShowReminderModal(false);
      setSuccessMsg(
        `🎉 Successfully created ${res.count} daily medication reminders! They are now active with detailed food precautions & instructions.`
      );
      speakText(
        `Scheduled ${res.count} daily medication reminders at ${preferredReminderTime}. I will announce your medicine instructions and food precautions.`
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

  const handleReadMedicineAloud = (med: PrescriptionMedicine) => {
    const text = `${med.name}. Prescribed for: ${med.purpose || 'Health maintenance'}. ` +
      `How to take: ${med.timingInstructions || med.instructions || 'with water'}. ` +
      `What to avoid: ${med.whatToAvoid || 'no specific food restrictions'}. ` +
      `Precautions: ${med.precautions || 'take as directed'}. ` +
      (med.simplifiedExplanation ? `Summary: ${med.simplifiedExplanation}` : '');
    speakText(text, { playChimeFirst: true });
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

  const handleLookupSingleMedicine = async (index: number) => {
    const target = medicines[index];
    if (!target || !target.name) return;
    try {
      setLookingUpIdx(index);
      const enriched = await lookupMedicine({
        name: target.name,
        dosage: target.dosage,
        instructions: target.instructions,
      });
      setMedicines((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...enriched };
        return updated;
      });
      speakText(`Information lookup complete for ${target.name}.`);
    } catch (err: any) {
      console.warn('Medicine lookup error:', err);
    } finally {
      setLookingUpIdx(null);
    }
  };

  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: '',
        dosage: '1 tablet',
        frequency: 'Once daily',
        instructions: 'Take with water after breakfast',
        duration: '30 days',
        purpose: 'Prescribed by your doctor',
        timingInstructions: 'Take with water after breakfast',
        precautions: 'Take regularly at the same time each day',
        interactions: 'Check with pharmacist before taking new supplements',
        whatToAvoid: 'Avoid alcohol and taking on an empty stomach',
        warnings: 'Contact doctor if you experience dizziness or rash',
        simplifiedExplanation: 'This medicine helps maintain your health when taken daily as directed.',
      },
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Prescription Vision & AI Medicine Intelligence
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Prescription Analysis & Patient Guidance
          </h1>
          <p className="text-slate-600 mt-1 max-w-2xl">
            Upload doctor prescriptions to extract medications, look up clinical indications, and read simple AI explanations of why and how to take each medicine.
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
        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
        className="hidden"
      />

      {/* Visual Workflow Pipeline Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-indigo-800/40 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Prescription Processing Pipeline
          </span>
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            Autonomous 7-Step Workflow
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">1</div>
            <span className="font-bold text-white">Upload Rx</span>
            <span className="text-[10px] text-slate-400">PDF / Image</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">2</div>
            <span className="font-bold text-white">OCR / Vision</span>
            <span className="text-[10px] text-slate-400">Gemini Flash</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">3</div>
            <span className="font-bold text-white">Extract Meds</span>
            <span className="text-[10px] text-slate-400">Dosage & Sig</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">4</div>
            <span className="font-bold text-white">Info Lookup</span>
            <span className="text-[10px] text-slate-400">Clinical DB</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">5</div>
            <span className="font-bold text-white">AI Explains</span>
            <span className="text-[10px] text-slate-400">Simple Words</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">6</div>
            <span className="font-bold text-white">User Confirms</span>
            <span className="text-[10px] text-slate-400">Save Review</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold">7</div>
            <span className="font-bold text-white">Daily Alert</span>
            <span className="text-[10px] text-emerald-300">Voice Reminder</span>
          </div>
        </div>
      </div>

      {/* Status Notifications */}
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
            <span className="font-medium text-sm">{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Drag & Drop Area with Quick Sample Button */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`elder-card p-6 sm:p-8 border-2 border-dashed transition-all text-center space-y-4 ${
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
            {uploading ? 'Processing Prescription Pipeline...' : 'Upload Prescription Document'}
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {uploading ? (
              <span className="font-semibold text-brand-600 animate-pulse">{uploadStep}</span>
            ) : (
              'Drag & drop your prescription image (JPEG, PNG) or PDF here, or click to browse.'
            )}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            Browse Prescription File
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-all active:scale-95"
            title="Load sample cardiology prescription for instant verification"
          >
            Load Sample Prescription
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-semibold">
          Supports JPG, PNG, WebP, PDF • Automatically triggers OCR & Medicine Info Lookup
        </div>
      </div>

      {/* Extracted Details & Caregiver Review Card */}
      {selectedRx && (
        <div className="elder-card p-6 sm:p-8 bg-white border-2 border-brand-200/90 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
          {/* Card Header & Status */}
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
                <span className="text-xs text-slate-500 font-mono truncate max-w-[200px]">
                  {selectedRx.fileName}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {selectedRx.status === 'CONFIRMED'
                  ? 'Verified Prescription & AI Explanation'
                  : 'Extracted Prescription — Review & Verification'}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={selectedRx.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="elder-btn-secondary text-xs font-bold flex items-center gap-1.5"
                title="View original uploaded document"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
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
                  className="elder-input text-xs"
                />
              ) : (
                <p className="font-bold text-slate-800 text-sm">
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
                  className="elder-input text-xs"
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
                  placeholder="e.g., City General Hospital"
                  className="elder-input text-xs"
                />
              ) : (
                <p className="font-bold text-slate-800 text-sm">
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
                  className="elder-input text-xs font-mono"
                />
              ) : (
                <p className="font-bold text-emerald-700 text-sm font-mono">
                  {hospitalPhone || 'Not specified'}
                </p>
              )}
            </div>
          </div>

          {/* Structured Medicine Cards (Matching User Specification) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Pill className="w-6 h-6 text-rose-600" />
                  <span>Prescribed Medications ({medicines.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Each medication includes clinical lookup details and simple AI plain-language explanations.
                </p>
              </div>

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

            {/* Medicine Cards Grid */}
            <div className="space-y-5">
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="p-5 sm:p-6 rounded-3xl bg-slate-50 border-2 border-slate-200 hover:border-brand-300 transition-all space-y-4 relative overflow-hidden"
                >
                  {/* Top Bar: Medicine Name & Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                            placeholder="Medicine name"
                            className="elder-input text-base font-bold text-slate-900 w-full sm:w-64"
                          />
                        ) : (
                          <h4 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            <span>{med.name}</span>
                            {med.dosage && (
                              <span className="text-xs font-mono font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-md">
                                {med.dosage}
                              </span>
                            )}
                          </h4>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">
                          Frequency: <strong className="text-slate-800">{med.frequency || 'Daily'}</strong>
                          {med.duration && <span> • Duration: <strong className="text-slate-800">{med.duration}</strong></span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleReadMedicineAloud(med)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-brand-50 text-brand-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors shadow-xs"
                        title="Read this medicine explanation aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-brand-600" />
                        <span>Read Aloud</span>
                      </button>

                      {isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleLookupSingleMedicine(idx)}
                            disabled={lookingUpIdx === idx}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            title="Refresh information with AI lookup"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${lookingUpIdx === idx ? 'animate-spin' : ''}`} />
                            <span>{lookingUpIdx === idx ? 'Looking up...' : 'Lookup AI'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                            title="Remove medicine"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 7 Structured Clinical Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* 1. Why it is prescribed */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider">
                        <Info className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Why It Is Prescribed</span>
                      </div>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={med.purpose || ''}
                          onChange={(e) => handleMedicineChange(idx, 'purpose', e.target.value)}
                          placeholder="Why doctor prescribed this"
                          className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-brand-500"
                        />
                      ) : (
                        <p className="text-slate-800 leading-relaxed font-medium">
                          {med.purpose || 'Prescribed by your physician for health maintenance.'}
                        </p>
                      )}
                    </div>

                    {/* 2. When / how to take it */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-[11px] uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>When / How to Take It</span>
                      </div>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={med.timingInstructions || med.instructions || ''}
                          onChange={(e) => handleMedicineChange(idx, 'timingInstructions', e.target.value)}
                          placeholder="Timing and administration instructions"
                          className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-brand-500"
                        />
                      ) : (
                        <p className="text-slate-800 leading-relaxed font-medium">
                          {med.timingInstructions || med.instructions || 'Take with water as directed by your physician.'}
                        </p>
                      )}
                    </div>

                    {/* 3. Common precautions */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-700 font-extrabold text-[11px] uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Common Precautions</span>
                      </div>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={med.precautions || ''}
                          onChange={(e) => handleMedicineChange(idx, 'precautions', e.target.value)}
                          placeholder="Common precautions"
                          className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-brand-500"
                        />
                      ) : (
                        <p className="text-slate-700 leading-relaxed">
                          {med.precautions || 'Take regularly at the same time each day. Do not stop abruptly.'}
                        </p>
                      )}
                    </div>

                    {/* 4. Food / drug interactions */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-700 font-extrabold text-[11px] uppercase tracking-wider">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                        <span>Food & Drug Interactions</span>
                      </div>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={med.interactions || ''}
                          onChange={(e) => handleMedicineChange(idx, 'interactions', e.target.value)}
                          placeholder="Food or drug interactions"
                          className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-brand-500"
                        />
                      ) : (
                        <p className="text-slate-700 leading-relaxed">
                          {med.interactions || 'Check with your pharmacist before starting new supplements or over-the-counter pills.'}
                        </p>
                      )}
                    </div>

                    {/* 5. What to avoid */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-[11px] uppercase tracking-wider">
                        <Ban className="w-3.5 h-3.5 text-rose-600" />
                        <span>What to Avoid</span>
                      </div>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={med.whatToAvoid || ''}
                          onChange={(e) => handleMedicineChange(idx, 'whatToAvoid', e.target.value)}
                          placeholder="Foods, drinks, or habits to avoid"
                          className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-brand-500"
                        />
                      ) : (
                        <p className="text-slate-700 leading-relaxed font-semibold text-rose-900/90">
                          {med.whatToAvoid || 'Avoid taking on an empty stomach and avoid excessive alcohol.'}
                        </p>
                      )}
                    </div>

                    {/* 6. Important warnings */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-[11px] uppercase tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                        <span>Important Warnings</span>
                      </div>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={med.warnings || ''}
                          onChange={(e) => handleMedicineChange(idx, 'warnings', e.target.value)}
                          placeholder="Emergency warning signs"
                          className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-brand-500"
                        />
                      ) : (
                        <p className="text-slate-700 leading-relaxed">
                          {med.warnings || 'Contact your doctor immediately if you experience dizziness, rash, or unusual fatigue.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 7. AI Explains in Simple Language (Full Width Banner) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-brand-50 border border-indigo-200/80 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1 text-xs">
                      <span className="font-extrabold text-indigo-900 block text-[11px] uppercase tracking-wider">
                        AI Explains in Simple Language:
                      </span>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={med.simplifiedExplanation || ''}
                          onChange={(e) => handleMedicineChange(idx, 'simplifiedExplanation', e.target.value)}
                          placeholder="Warm, senior-friendly plain language summary"
                          className="w-full p-2 text-xs border border-indigo-200 rounded-xl bg-white"
                        />
                      ) : (
                        <p className="text-indigo-950 font-medium leading-relaxed italic">
                          "{med.simplifiedExplanation || 'This medicine is customized by your doctor to maintain your daily vitality. Taking it regularly keeps you feeling safe and healthy.'}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Medical Safety Disclaimer */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Medical Protocol & Invariant: </strong>
              ElderCare AI provides patient education and reminder coordination. The AI does not diagnose illnesses or modify prescriptions. Always consult your pharmacist or primary care physician with any dosage questions.
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-400 font-mono">
              Recorded on {new Date(selectedRx.createdAt).toLocaleDateString()}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
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
                    <span>Book Clinic Visit</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => setShowReminderModal(true)}
                    disabled={isBridging || medicines.length === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Create Daily Reminders</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Creating Daily Reminders */}
      {showReminderModal && selectedRx && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Schedule Medication Reminders
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set up automatic daily voice & notification reminders
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReminderModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Daily Confirmation Checkbox */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmDailySchedule}
                  onChange={(e) => setConfirmDailySchedule(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-extrabold text-sm text-emerald-950 block">
                    Follow this schedule daily (Recommended)
                  </span>
                  <span className="text-xs text-emerald-800">
                    ElderCare AI will automatically alert you every day at your preferred time with precautions and food instructions.
                  </span>
                </div>
              </label>

              <div className="pt-2 flex items-center justify-between border-t border-emerald-200/60 text-xs">
                <span className="font-bold text-emerald-900">Preferred Daily Time:</span>
                <input
                  type="time"
                  value={preferredReminderTime}
                  onChange={(e) => setPreferredReminderTime(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-slate-800 font-mono text-xs font-bold"
                />
              </div>
            </div>

            {/* Summary List of Medicines */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Medicines to Schedule ({medicines.length}):
              </span>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {medicines.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-bold">{m.name} {m.dosage}</strong>
                      <span className="text-[10px] font-mono text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md font-bold">
                        {confirmDailySchedule ? 'Daily' : 'Once'}
                      </span>
                    </div>
                    {m.whatToAvoid && (
                      <p className="text-[11px] text-rose-700 font-medium">
                        🚫 Avoid: {m.whatToAvoid}
                      </p>
                    )}
                    {m.precautions && (
                      <p className="text-[11px] text-slate-600">
                        🛡️ Precaution: {m.precautions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteBridgeToReminders}
                disabled={isBridging}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isBridging ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Scheduling Reminders...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Activate Reminders</span>
                  </>
                )}
              </button>
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
            <p className="text-slate-500 text-sm">Loading archive...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="elder-card p-8 text-center bg-slate-50 border-slate-200">
            <p className="text-slate-500 text-sm">
              No prescriptions uploaded yet. Use the upload area above to scan your first prescription document.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prescriptions.map((rx) => (
              <div
                key={rx._id}
                onClick={() => initReviewState(rx)}
                className={`elder-card p-5 cursor-pointer transition-all hover:shadow-xl flex flex-col justify-between ${
                  selectedRx?._id === rx._id
                    ? 'border-2 border-brand-500 bg-brand-50/20 shadow-md'
                    : 'border border-slate-200'
                }`}
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
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">
                      {rx.hospital?.name || 'Clinic Prescription'}
                    </h3>
                    <p className="text-slate-600 text-xs mt-0.5">
                      {rx.doctor?.name || 'Doctor'} {rx.doctor?.specialty ? `• ${rx.doctor.specialty}` : ''}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 block mb-1">
                      Medications ({rx.medicines.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rx.medicines.map((m, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-medium"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                  <span className="text-brand-600 font-bold hover:underline">
                    {selectedRx?._id === rx._id ? 'Currently Selected' : 'View & Manage →'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(rx._id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
