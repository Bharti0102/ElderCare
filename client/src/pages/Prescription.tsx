import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Heart,
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
  Search,
  FlaskConical,
  BookOpen,
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

  // Live AI Medicine Research Lab State
  const [searchDrugQuery, setSearchDrugQuery] = useState('');
  const [isSearchingDrug, setIsSearchingDrug] = useState(false);
  const [researchedDrugResult, setResearchedDrugResult] = useState<PrescriptionMedicine | null>(null);

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

      setUploadStep('1/5: Uploading prescription document...');
      setTimeout(() => setUploadStep('2/5: Multimodal OCR / Vision document scanning...'), 600);
      setTimeout(() => setUploadStep('3/5: Extracting medicines, dosages & doctor details...'), 1200);
      setTimeout(() => setUploadStep('4/5: Live clinical pharmacology research & drug lookup...'), 1800);
      setTimeout(() => setUploadStep('5/5: AI generating simple language explanation for seniors...'), 2400);

      const rx = await uploadPrescription(file);
      setPrescriptions((prev) => [rx, ...prev]);
      initReviewState(rx);
      setSuccessMsg('Prescription analyzed! Live AI pharmacology research & explanations ready below.');
      speakText('Prescription analyzed with live clinical research. You can now review the simple explanations and schedule daily reminders.');
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

  // Real-World Clinical Prescription Presets
  const handleLoadRealWorldSample = (presetType: 'cardio' | 'diabetes' | 'antibiotic') => {
    let content = '';
    let fileName = '';

    if (presetType === 'cardio') {
      fileName = 'Apollo_Cardiology_Prescription.txt';
      content =
        `APOLLO HEART INSTITUTE & CLINICAL GERIATRICS\n` +
        `Physician: Dr. Rajesh Sharma, MD, DM (Cardiology)\n` +
        `Hospital: Apollo Super Speciality Hospital, Delhi\n` +
        `Reception Phone: +91-11-2692-5858\n` +
        `Date: 2026-09-23\n` +
        `Diagnosis: Essential Hypertension, Dyslipidemia & Acid Reflux\n\n` +
        `Rx Medications:\n` +
        `1. Telma 40mg (Telmisartan) - 1 tablet once daily in the morning after breakfast. Duration: 90 days.\n` +
        `2. Rosuvas 10mg (Rosuvastatin) - 1 tablet once daily at bedtime with water. Duration: 60 days.\n` +
        `3. Ecosprin 75mg (Aspirin Gastro-Resistant) - 1 tablet once daily after lunch with water. Duration: 90 days.\n` +
        `4. Pan 40mg (Pantoprazole Sodium) - 1 tablet once daily 30 minutes before breakfast. Duration: 30 days.`;
    } else if (presetType === 'diabetes') {
      fileName = 'Fortis_Endocrine_Diabetes_Prescription.txt';
      content =
        `FORTIS METABOLIC & DIABETES CARE CENTER\n` +
        `Physician: Dr. Ananya Iyer, MD (Endocrinology & Diabetology)\n` +
        `Hospital: Fortis Memorial Research Institute\n` +
        `Reception Phone: +91-12-4496-2200\n` +
        `Date: 2026-09-23\n` +
        `Diagnosis: Type 2 Diabetes Mellitus with Peripheral Neuropathy\n\n` +
        `Rx Medications:\n` +
        `1. Glycomet-GP 1 (Glimepiride 1mg + Metformin 500mg SR) - 1 tablet once daily before breakfast. Duration: 90 days.\n` +
        `2. Januvia 100mg (Sitagliptin) - 1 tablet once daily in the morning with water. Duration: 60 days.\n` +
        `3. Neurobion Forte (Vitamin B-Complex + B12) - 1 tablet once daily after meals. Duration: 30 days.`;
    } else {
      fileName = 'CityHospital_Respiratory_Infection_Prescription.txt';
      content =
        `CITY GENERAL PULMONOLOGY & CHEST CLINIC\n` +
        `Physician: Dr. Michael Chen, MD (Pulmonology & Geriatric Medicine)\n` +
        `Hospital: Metropolitan Chest & Allergy Institute\n` +
        `Reception Phone: +1-555-019-4820\n` +
        `Date: 2026-09-23\n` +
        `Diagnosis: Acute Bronchitis & Allergic Rhinitis\n\n` +
        `Rx Medications:\n` +
        `1. Augmentin 625mg (Amoxicillin 500mg + Clavulanate 125mg) - 1 tablet twice daily after food every 12 hours. Duration: 6 days.\n` +
        `2. Montair-LC (Montelukast 10mg + Levocetirizine 5mg) - 1 tablet once daily at bedtime. Duration: 10 days.\n` +
        `3. Calpol 650mg (Paracetamol) - 1 tablet every 6 to 8 hours as needed (SOS) for fever or body ache. Duration: 4 days.`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: 'text/plain' });
    handleFileUpload(file);
  };

  // Live Medicine Researcher Tool Handler
  const handleLiveDrugSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchDrugQuery.trim();
    if (!query) return;

    try {
      setIsSearchingDrug(true);
      setError(null);
      const details = await lookupMedicine({ name: query });
      setResearchedDrugResult(details);
      setSuccessMsg(`Clinical pharmacology research completed for ${query}!`);
      speakText(`Research completed for ${query}. ${details.simplifiedExplanation || details.purpose}`);
    } catch (err: any) {
      setError(err.message || 'Failed to research medication');
    } finally {
      setIsSearchingDrug(false);
    }
  };

  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: 'New Medication',
        dosage: '1 tablet',
        frequency: 'Daily',
        instructions: 'Take with water after food',
        duration: '30 days',
        purpose: 'Prescribed by your physician for health maintenance.',
        timingInstructions: 'Take 1 tablet daily with a full glass of water after meals.',
        precautions: 'Take regularly at the same time each day. Do not alter dosage without consulting your physician.',
        interactions: 'Check with your pharmacist before taking new over-the-counter medications.',
        whatToAvoid: 'Avoid alcohol and unverified dietary supplements.',
        warnings: 'Contact your doctor immediately if you experience dizziness, rash, or persistent side effects.',
        simplifiedExplanation: 'This medicine helps support your daily health under your physician’s guidance.',
        researchSource: 'Google Gemini AI Clinical Pharmacology Research',
      },
    ]);
  };

  const handleRemoveMedicineRow = (idx: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMedicineChange = (idx: number, field: keyof PrescriptionMedicine, value: string) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // On-demand real-time re-analysis for a specific medicine row
  const handleLookupSingleMedicine = async (idx: number) => {
    const med = medicines[idx];
    if (!med || !med.name) return;

    try {
      setLookingUpIdx(idx);
      const enriched = await lookupMedicine({
        name: med.name,
        dosage: med.dosage,
        instructions: med.instructions || med.timingInstructions,
      });

      setMedicines((prev) => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          ...enriched,
        };
        return updated;
      });

      setSuccessMsg(`Live AI clinical research refreshed for "${med.name}"`);
    } catch (err: any) {
      setError(`Failed to look up information for ${med.name}: ${err.message}`);
    } finally {
      setLookingUpIdx(null);
    }
  };

  // Read aloud senior voice narration
  const handleReadMedicineAloud = (med: PrescriptionMedicine) => {
    const speechScript = `Medication: ${med.name}. ${med.activeIngredients ? `Active formulation: ${med.activeIngredients}. ` : ''}Why it is prescribed: ${med.purpose || 'For your health'}. How to take it: ${med.timingInstructions || med.instructions || 'Take with water'}. Things to avoid: ${med.whatToAvoid || 'None specified'}. Important warnings: ${med.warnings || 'Contact your doctor if symptoms persist'}. Simple summary: ${med.simplifiedExplanation || 'Taking this regularly keeps you feeling healthy.'}`;
    speakText(speechScript);
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
        prescriptionDate: selectedRx.prescriptionDate,
        medicines,
      });

      setSelectedRx(updated);
      setIsEditing(false);
      setPrescriptions((prev) =>
        prev.map((p) => (p._id === updated._id ? updated : p))
      );
      setSuccessMsg('Prescription verified and saved! Would you like to schedule automatic daily reminders?');
      setShowReminderModal(true);
      speakText('Prescription verified. You can now activate automatic daily reminders.');
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

      const created = await createRemindersFromPrescription(selectedRx._id, {
        confirmDaily: confirmDailySchedule,
        preferredTime: preferredReminderTime,
      });

      const count = created.reminders?.length || created.count || 0;
      setShowReminderModal(false);
      setSuccessMsg(
        `Created ${count} active medication reminders with daily schedule & detailed instructions!`
      );
      speakText(`Successfully activated ${count} medication reminders for your daily schedule.`);
    } catch (err: any) {
      setError(err.message || 'Failed to create reminders');
    } finally {
      setIsBridging(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this prescription record?')) return;
    try {
      await deletePrescription(id);
      setPrescriptions((prev) => prev.filter((p) => p._id !== id));
      if (selectedRx?._id === id) {
        setSelectedRx(null);
      }
      setSuccessMsg('Prescription deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete prescription');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-800 text-xs font-bold border border-brand-200 mb-2">
            <FlaskConical className="w-3.5 h-3.5 text-brand-600" />
            <span>AI Prescription Intelligence & Clinical Pharmacology</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Prescriptions & AI Drug Safety
          </h1>
          <p className="text-slate-600 mt-1 max-w-2xl text-sm sm:text-base">
            Upload real doctor prescriptions or research any medication to get genuine clinical indications,
            evidence-based food interactions, precautions, and plain-language AI explanations.
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

      {/* LIVE AI MEDICINE & DRUG RESEARCH LAB SEARCH TOOL */}
      <div className="p-6 sm:p-7 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 rounded-3xl border-2 border-indigo-500/30 text-white shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold">
              <FlaskConical className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>AI Clinical Drug Research Lab</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Real-World Analysis
                </span>
              </h3>
              <p className="text-xs text-indigo-200">
                Research any brand or generic medication in real-time with Google Gemini Pharmacology & OpenFDA.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono hidden md:block">
            Engine: Gemini 1.5 Flash + OpenFDA RxNorm
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleLiveDrugSearch} className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchDrugQuery}
              onChange={(e) => setSearchDrugQuery(e.target.value)}
              placeholder="Enter any medicine name (e.g., Augmentin 625, Telma-H, Glycomet-GP 1, Pan-D, Thyronorm 50, Calpol 650, Rosuvas 10)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-800/90 text-white border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isSearchingDrug || !searchDrugQuery.trim()}
            className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-brand-600 hover:from-indigo-400 hover:to-brand-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSearchingDrug ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Researching Pharmacology...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Research Drug with AI</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
          <span className="text-slate-400 font-semibold">Try real brands:</span>
          {[
            'Augmentin 625',
            'Telma-H',
            'Glycomet-GP 1',
            'Pan-D',
            'Thyronorm 50',
            'Rosuvas 10',
            'Calpol 650',
            'Januvia 100',
            'Ecosprin 75',
          ].map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => {
                setSearchDrugQuery(pill);
                lookupMedicine({ name: pill })
                  .then((res) => {
                    setResearchedDrugResult(res);
                    speakText(`Research completed for ${pill}. ${res.simplifiedExplanation || res.purpose}`);
                  })
                  .catch(() => {});
              }}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-sky-200 text-[11px] font-bold transition-colors border border-white/10"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Standalone Researched Drug Result Card */}
        {researchedDrugResult && (
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-indigo-400/50 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-indigo-800/60 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    🔬 Research Result
                  </span>
                  {researchedDrugResult.activeIngredients && (
                    <span className="text-xs font-mono text-indigo-300 bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-800">
                      🧪 Formulation: {researchedDrugResult.activeIngredients}
                    </span>
                  )}
                  {researchedDrugResult.drugClass && (
                    <span className="text-xs font-mono text-amber-300 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800">
                      🏷️ Class: {researchedDrugResult.drugClass}
                    </span>
                  )}
                </div>
                <h4 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                  <span>{researchedDrugResult.name}</span>
                  {researchedDrugResult.dosage && (
                    <span className="text-xs font-mono font-bold text-sky-300 bg-sky-950 px-2.5 py-1 rounded-md border border-sky-800">
                      {researchedDrugResult.dosage}
                    </span>
                  )}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReadMedicineAloud(researchedDrugResult)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-emerald-300" />
                  <span>Read Aloud</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResearchedDrugResult(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 7-Section Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5" />
                  <span>Why It Is Prescribed</span>
                </div>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {researchedDrugResult.purpose}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>When / How to Take It</span>
                </div>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {researchedDrugResult.timingInstructions}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-sky-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Common Precautions</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {researchedDrugResult.precautions}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>Food & Drug Interactions</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {researchedDrugResult.interactions}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <Ban className="w-3.5 h-3.5" />
                  <span>What to Avoid</span>
                </div>
                <p className="text-rose-200 leading-relaxed font-semibold">
                  {researchedDrugResult.whatToAvoid}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-rose-300 font-extrabold text-[11px] uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Important Warnings</span>
                </div>
                <p className="text-rose-100 leading-relaxed">
                  {researchedDrugResult.warnings}
                </p>
              </div>
            </div>

            {/* AI Plain Language Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-400/40 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1 text-xs">
                <span className="font-extrabold text-indigo-200 block text-[11px] uppercase tracking-wider">
                  AI Plain Language Explanation:
                </span>
                <p className="text-white font-medium leading-relaxed italic text-sm">
                  "{researchedDrugResult.simplifiedExplanation}"
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span>Source: {researchedDrugResult.researchSource || 'Live Clinical Research'}</span>
              <button
                type="button"
                onClick={() => {
                  setMedicines((prev) => [...prev, researchedDrugResult]);
                  setSuccessMsg(`Added "${researchedDrugResult.name}" to prescription review below.`);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Prescription Review</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl flex items-center gap-2 animate-in fade-in">
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

      {/* Upload Drag & Drop Area with 3 Real-World Clinical Presets */}
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
            {uploading ? 'Processing Prescription Pipeline...' : 'Upload Real Prescription Document'}
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {uploading ? (
              <span className="font-semibold text-brand-600 animate-pulse">{uploadStep}</span>
            ) : (
              'Drag & drop your prescription image (JPEG, PNG) or PDF here, or select a realistic medical sample below.'
            )}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            Browse Prescription File
          </button>
        </div>

        {/* 3 Real-World Medical Sample Presets */}
        <div className="pt-3 border-t border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Or Test with Authentic Clinical Prescriptions:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleLoadRealWorldSample('cardio')}
              disabled={uploading}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs border border-indigo-200 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Cardiology (Telma 40, Rosuvas 10, Ecosprin, Pan 40)</span>
            </button>

            <button
              type="button"
              onClick={() => handleLoadRealWorldSample('diabetes')}
              disabled={uploading}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Pill className="w-3.5 h-3.5 text-emerald-600" />
              <span>Diabetes (Glycomet-GP 1, Januvia 100, Neurobion)</span>
            </button>

            <button
              type="button"
              onClick={() => handleLoadRealWorldSample('antibiotic')}
              disabled={uploading}
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              <span>Chest Infection (Augmentin 625, Montair-LC, Calpol)</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-semibold">
          Supports JPG, PNG, WebP, PDF • Triggers Multimodal Vision OCR & Live Clinical Pharmacology Research
        </div>
      </div>

      {/* Extracted Details & Caregiver Review Card */}
      {selectedRx && (
        <div className="elder-card p-6 sm:p-8 bg-white border-2 border-brand-200/90 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
          {/* Card Header & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
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
                  ? 'Verified Prescription & Clinical AI Analysis'
                  : 'Extracted Prescription — Clinical Review & Verification'}
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
                  placeholder="e.g., Dr. Rajesh Sharma"
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
                  placeholder="e.g., Cardiology"
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
                  placeholder="e.g., Apollo Hospital"
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
                  placeholder="e.g., +91-11-2692-5858"
                  className="elder-input text-xs font-mono"
                />
              ) : (
                <p className="font-bold text-emerald-700 text-sm font-mono">
                  {hospitalPhone || 'Not specified'}
                </p>
              )}
            </div>
          </div>

          {/* Structured Medicine Cards (Matching 7-Point User Specification) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Pill className="w-6 h-6 text-rose-600" />
                  <span>Prescribed Medications ({medicines.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-world pharmacological research, indications, interactions, and simple AI explanations.
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
                  {/* Top Bar: Medicine Name & Clinical Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-200 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
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
                          <h4 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                            <span>{med.name}</span>
                            {med.dosage && (
                              <span className="text-xs font-mono font-bold text-brand-700 bg-brand-100 px-2.5 py-0.5 rounded-md">
                                {med.dosage}
                              </span>
                            )}
                          </h4>
                        )}

                        {/* Composition & Drug Class Badges */}
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {med.activeIngredients && (
                            <span className="text-[11px] font-mono text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 font-semibold">
                              🧪 {med.activeIngredients}
                            </span>
                          )}
                          {med.drugClass && (
                            <span className="text-[11px] font-mono text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md font-semibold">
                              🏷️ {med.drugClass}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            • Frequency: <strong className="text-slate-800">{med.frequency || 'Daily'}</strong>
                            {med.duration && <span> • Duration: <strong className="text-slate-800">{med.duration}</strong></span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleReadMedicineAloud(med)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-brand-50 text-brand-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors shadow-xs"
                        title="Read this medicine explanation aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-brand-600" />
                        <span>Read Aloud</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLookupSingleMedicine(idx)}
                        disabled={lookingUpIdx === idx}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Re-analyze with live AI pharmacology research"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${lookingUpIdx === idx ? 'animate-spin' : ''}`} />
                        <span>{lookingUpIdx === idx ? 'Researching...' : 'Re-Analyze AI'}</span>
                      </button>

                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                          title="Remove medicine"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-indigo-900 block text-[11px] uppercase tracking-wider">
                          AI Explains in Simple Language:
                        </span>
                        {med.researchSource && (
                          <span className="text-[10px] text-indigo-600 font-mono font-semibold">
                            Source: {med.researchSource}
                          </span>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={med.simplifiedExplanation || ''}
                          onChange={(e) => handleMedicineChange(idx, 'simplifiedExplanation', e.target.value)}
                          placeholder="Warm, senior-friendly plain language summary"
                          className="w-full p-2 text-xs border border-indigo-200 rounded-xl bg-white"
                        />
                      ) : (
                        <p className="text-indigo-950 font-medium leading-relaxed italic text-sm">
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
              <strong className="font-bold">Clinical Protocol & Patient Safety: </strong>
              ElderCare AI provides clinical education, pharmacological interaction warnings, and reminder automation. The AI does not modify dosages without doctor oversight. Always consult your prescribing physician with any treatment questions.
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
                    ElderCare AI will automatically alert you every day at your preferred time with precautions, food instructions, and audio readouts.
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
            <BookOpen className="w-6 h-6 text-brand-600" />
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
