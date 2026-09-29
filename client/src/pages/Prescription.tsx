import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Pill,
  User,
  Clock,
  Trash2,
  Check,
  Plus,
  ShieldCheck,
  RotateCw,
  Info,
  AlertCircle,
  X,
  Search,
  BookOpen,
  Settings2,
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Bot,
  RefreshCw,
  FileText,
  ChevronRight,
  Paperclip,
  Image as ImageIcon,
  Key,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  uploadPrescription,
  getPrescriptions,
  confirmPrescription,
  createRemindersFromPrescription,
  deletePrescription,
  lookupMedicine,
  chatWithAIAssistant,
  chatWithAIVisionAssistant,
  AIChatResult,
} from '../services/prescription.service';
import { createReminder } from '../services/reminder.service';
import {
  getAIConfigStatus,
  updateAIConfig,
  testAIKey,
  AIConfigStatus,
} from '../services/aiConfig.service';
import { speakText } from '../services/voiceNotification.service';
import type { Prescription as IPrescription, PrescriptionMedicine } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  identifiedMedicine?: PrescriptionMedicine | null;
  identifiedMedicines?: PrescriptionMedicine[] | null;
  suggestedFollowUps?: string[];
  timestamp: Date;
}

export const Prescription: React.FC = () => {
  // Navigation & Mode tabs
  const [activeTab, setActiveTab] = useState<'chat' | 'scanner' | 'records'>('chat');

  // Prescription Records & Scanner State
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

  // AI Chatbot State (ChatGPT / Gemini / Groq style)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I am **Dr. Mira**, your **AI Clinical Pharmacologist & Medicine Assistant** (powered by Groq LPU, Gemini & OpenAI).\n\nYou can:\n1. 📎 **Attach / Browse any prescription image or document** directly into our chat.\n2. 🔍 **Type any medication name** (e.g. *Telmisartan*, *Metformin*, *Atorvastatin*) to get comprehensive clinical guidance.\n3. ❓ **Ask questions** about food interactions, geriatric safety, dosage timings, or missing doses.`,
      suggestedFollowUps: [
        'Explain Telmisartan 40mg (Blood Pressure)',
        'Why is Metformin 500mg prescribed and when to take it?',
        'What foods and painkillers should I avoid with Atorvastatin?',
        'What are safe pain relievers for a 70-year-old senior?',
      ],
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatImageFile, setChatImageFile] = useState<File | null>(null);
  const [chatImagePreview, setChatImagePreview] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const scannerFileInputRef = useRef<HTMLInputElement>(null);

  // AI Configuration Modal State
  const [aiConfig, setAiConfig] = useState<AIConfigStatus | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [inputGroqKey, setInputGroqKey] = useState('');
  const [inputGeminiKey, setInputGeminiKey] = useState('');
  const [inputOpenAIKey, setInputOpenAIKey] = useState('');
  const [selectedVisionProvider, setSelectedVisionProvider] = useState<'groq' | 'gemini' | 'openai' | 'tesseract'>('groq');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Reminder Schedule Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [singleMedicineToRemind, setSingleMedicineToRemind] = useState<PrescriptionMedicine | null>(null);
  const [confirmDailySchedule, setConfirmDailySchedule] = useState(true);
  const [preferredReminderTime, setPreferredReminderTime] = useState('09:00');
  const [isCreatingSingleReminder, setIsCreatingSingleReminder] = useState(false);

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

  const fetchAIConfig = async () => {
    try {
      const config = await getAIConfigStatus();
      setAiConfig(config);
      setSelectedVisionProvider(config.activeProvider);
    } catch {
      // Non-fatal fallback
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchAIConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading, activeTab]);

  const initReviewState = (rx: IPrescription) => {
    setSelectedRx(rx);
    setDoctorName(rx.doctor?.name || '');
    setDoctorSpecialty(rx.doctor?.specialty || '');
    setHospitalName(rx.hospital?.name || '');
    setHospitalPhone(rx.receptionPhone || '');
    setMedicines([...(rx.medicines || [])]);
    setIsEditing(rx.status !== 'CONFIRMED');
  };

  // Image selection for AI Chatbot
  const handleChatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setChatImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setChatImagePreview(previewUrl);
      // Reset input value so re-selecting same file works
      e.target.value = '';
    }
  };

  const handleClearChatImage = () => {
    if (chatImagePreview) {
      URL.revokeObjectURL(chatImagePreview);
    }
    setChatImageFile(null);
    setChatImagePreview(null);
  };

  // Chatbot Send Message Handler (Supports both Text and Image Direct Vision)
  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = (customText || chatInput).trim();
    if (!textToSend && !chatImageFile) return;
    if (isChatLoading) return;

    const currentImageFile = chatImageFile;
    const currentImagePreview = chatImagePreview;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend || (currentImageFile ? `Attached prescription: "${currentImageFile.name}"` : ''),
      imageUrl: currentImagePreview || undefined,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatImageFile(null);
    setChatImagePreview(null);
    setIsChatLoading(true);
    setError(null);

    try {
      if (currentImageFile) {
        // Direct Vision Handover to Multimodal AI
        const visionResult = await chatWithAIVisionAssistant(
          currentImageFile,
          textToSend || 'Please analyze this prescription in clinical detail and explain every medicine.'
        );

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: visionResult.reply,
          identifiedMedicine:
            visionResult.identifiedMedicines && visionResult.identifiedMedicines.length === 1
              ? visionResult.identifiedMedicines[0]
              : null,
          identifiedMedicines:
            visionResult.identifiedMedicines && visionResult.identifiedMedicines.length > 1
              ? visionResult.identifiedMedicines
              : null,
          suggestedFollowUps: [
            'What if I miss a dose of these medications?',
            'Can these medicines be taken together in the morning?',
            'Are there any dietary restrictions with these drugs?',
          ],
          timestamp: new Date(),
        };

        setChatMessages((prev) => [...prev, assistantMessage]);
        speakText('Prescription image analyzed by AI. You can review the complete clinical report below.');
      } else {
        // Text-based Clinical Chat Query
        const history = chatMessages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result: AIChatResult = await chatWithAIAssistant(textToSend, history);

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.reply,
          identifiedMedicine: result.identifiedMedicine || null,
          suggestedFollowUps: result.suggestedFollowUps || [],
          timestamp: new Date(),
        };

        setChatMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      const errorReply: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I ran into an issue analyzing the prescription: ${err.message || 'Network error'}. Please check your API key in settings or try uploading again.`,
        suggestedFollowUps: ['Search Telmisartan 40mg', 'Search Metformin 500mg'],
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Voice Input (Web Speech Recognition)
  const handleToggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setChatInput(transcript);
          handleSendChatMessage(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Prescription Upload & OCR Handler (Tab 2)
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setSuccessMsg(null);
      setActiveTab('scanner');

      const activeScanner =
        aiConfig?.activeProvider === 'openai'
          ? 'OpenAI GPT-4o Vision'
          : aiConfig?.activeProvider === 'gemini'
          ? 'Google Gemini 1.5/2.0 Vision'
          : 'Tesseract Local OCR Engine';

      setUploadStep(`1/4: Analyzing document with ${activeScanner}...`);
      setTimeout(() => setUploadStep(`2/4: Reading optical lines & handwriting...`), 800);
      setTimeout(() => setUploadStep(`3/4: Looking up clinical pharmacology & indications...`), 1600);
      setTimeout(() => setUploadStep(`4/4: Formulating simple language summary for seniors...`), 2400);

      const rx = await uploadPrescription(file);
      setPrescriptions((prev) => [rx, ...prev]);
      initReviewState(rx);

      if (rx.medicines && rx.medicines.length > 0) {
        setSuccessMsg(`Prescription analyzed! Found ${rx.medicines.length} medications.`);
        speakText(`Prescription analyzed successfully. Extracted ${rx.medicines.length} medications for review.`);
      } else {
        setSuccessMsg(`Document processed, but no clear prescription medicines were identified.`);
      }
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

  const handleScannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  // Real-World Clinical Presets
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
        `Diagnosis: Essential Hypertension & Dyslipidemia\n\n` +
        `Rx Medications:\n` +
        `1. Tab. Telmisartan 40mg - 1 tablet once daily morning after breakfast (Duration: 90 days)\n` +
        `2. Tab. Atorvastatin 20mg - 1 tablet at bedtime with water (Duration: 60 days)\n` +
        `3. Tab. Amlodipine 5mg - 1 tablet in evening with water (Duration: 60 days)\n\n` +
        `Instructions:\n- Low sodium diet. Monitor BP weekly. Avoid grapefruit juice.`;
    } else if (presetType === 'diabetes') {
      fileName = 'Fortis_Endocrine_Diabetes_Prescription.txt';
      content =
        `FORTIS METABOLIC & DIABETES CARE CENTER\n` +
        `Physician: Dr. Ananya Iyer, MD (Endocrinology & Diabetology)\n` +
        `Hospital: Fortis Memorial Research Institute\n` +
        `Reception Phone: +91-12-4496-2200\n` +
        `Date: 2026-09-23\n` +
        `Diagnosis: Type 2 Diabetes Mellitus\n\n` +
        `Rx Medications:\n` +
        `1. Tab. Metformin 500mg - 1 tablet twice daily with meals (Duration: 90 days)\n` +
        `2. Tab. Glimepiride 1mg - 1 tablet once daily before breakfast (Duration: 90 days)\n` +
        `3. Tab. Rosuvastatin 10mg - 1 tablet at bedtime (Duration: 60 days)\n\n` +
        `Instructions:\n- Check fasting blood sugar weekly. Carry glucose sweets for hypoglycemia.`;
    } else {
      fileName = 'CityHospital_Respiratory_Infection_Prescription.txt';
      content =
        `CITY GENERAL PULMONOLOGY & CHEST CLINIC\n` +
        `Physician: Dr. Michael Chen, MD (Pulmonology)\n` +
        `Hospital: Metropolitan Chest & Allergy Institute\n` +
        `Reception Phone: +1-555-019-4820\n` +
        `Date: 2026-09-23\n` +
        `Diagnosis: Acute Bacterial Bronchitis\n\n` +
        `Rx Medications:\n` +
        `1. Tab. Augmentin 625mg - 1 tablet twice daily after food every 12 hours (Duration: 6 days)\n` +
        `2. Tab. Montair-LC - 1 tablet once daily at bedtime (Duration: 10 days)\n` +
        `3. Tab. Pantoprazole 40mg - 1 tablet once daily 30 mins before breakfast (Duration: 14 days)\n\n` +
        `Instructions:\n- Complete full antibiotic course. Drink warm fluids.`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: 'text/plain' });
    handleFileUpload(file);
  };

  // Medicine Table Handlers
  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: 'New Medication',
        dosage: '1 tablet',
        frequency: 'Daily',
        instructions: 'Take once daily with water',
        duration: '30 days',
        purpose: 'Prescribed for therapeutic maintenance',
        timingInstructions: 'Take at regular time with water',
        precautions: 'Follow physician guidance strictly',
        interactions: 'Check with doctor before adding new medicines',
        whatToAvoid: 'Avoid alcohol and unapproved supplements',
        warnings: 'Report severe dizziness or allergic reactions immediately',
        simplifiedExplanation: 'Take daily as directed to maintain health.',
        researchSource: 'User Entry',
      },
    ]);
  };

  const handleRemoveMedicineRow = (idx: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMedicineChange = (idx: number, field: keyof PrescriptionMedicine, value: string) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  };

  const handleLookupSingleMedicine = async (idx: number) => {
    const med = medicines[idx];
    if (!med || !med.name.trim()) return;

    try {
      setLookingUpIdx(idx);
      setError(null);
      const details = await lookupMedicine({
        name: med.name,
        dosage: med.dosage,
        instructions: med.instructions,
      });

      setMedicines((prev) =>
        prev.map((m, i) =>
          i === idx
            ? {
                ...m,
                ...details,
                name: m.name,
              }
            : m
        )
      );

      setSuccessMsg(`Clinical research updated for ${med.name}!`);
      speakText(`Clinical research complete for ${med.name}. ${details.simplifiedExplanation || details.purpose}`);
    } catch (err: any) {
      setError(err.message || 'Failed to lookup medicine');
    } finally {
      setLookingUpIdx(null);
    }
  };

  // Prescription Confirmation & Bridging
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

  // Direct Reminder Creation from Chatbot or Research Card
  const handleCreateDirectReminder = async (med: PrescriptionMedicine) => {
    try {
      setIsCreatingSingleReminder(true);
      setError(null);

      const title = `Take ${med.name}`;
      const description = `Dosage: ${med.dosage || '1 tablet'}. Instructions: ${med.instructions || med.timingInstructions || 'Take with water as directed'}`;

      const scheduledAt = new Date();
      const [hours, minutes] = preferredReminderTime.split(':');
      scheduledAt.setHours(parseInt(hours || '9', 10), parseInt(minutes || '0', 10), 0, 0);

      await createReminder({
        title,
        description,
        category: 'MEDICATION',
        scheduledAt: scheduledAt.toISOString(),
        repeat: confirmDailySchedule ? 'daily' : 'none',
      });

      setSuccessMsg(`Daily reminder scheduled for ${med.name} at ${preferredReminderTime}!`);
      speakText(`Reminder created for ${med.name} daily at ${preferredReminderTime}.`);
      setSingleMedicineToRemind(null);
      setShowReminderModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create reminder');
    } finally {
      setIsCreatingSingleReminder(false);
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

  // AI Configuration Handlers
  const handleSaveAIConfig = async () => {
    try {
      setIsTestingKey(true);
      setKeyTestFeedback(null);
      const updated = await updateAIConfig({
        groqApiKey: inputGroqKey || undefined,
        geminiApiKey: inputGeminiKey || undefined,
        openAiApiKey: inputOpenAIKey || undefined,
        preferredProvider: selectedVisionProvider,
      });
      setAiConfig(updated);
      setInputGroqKey('');
      setInputGeminiKey('');
      setInputOpenAIKey('');
      setShowAiModal(false);
      setSuccessMsg(`AI Model preferences applied! Active Provider: ${updated.activeProvider.toUpperCase()}`);
    } catch (err: any) {
      setKeyTestFeedback({ success: false, message: err.message || 'Failed to save AI configuration' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleTestKey = async (provider: 'groq' | 'gemini' | 'openai') => {
    try {
      setIsTestingKey(true);
      setKeyTestFeedback(null);
      const keyToTest =
        provider === 'groq' ? inputGroqKey : provider === 'openai' ? inputOpenAIKey : inputGeminiKey;
      const res = await testAIKey({ provider, apiKey: keyToTest || undefined });
      setKeyTestFeedback({
        success: true,
        message: `${provider.toUpperCase()} API key verified successfully! Status: ${res.status}`,
      });
    } catch (err: any) {
      setKeyTestFeedback({
        success: false,
        message: err.message || `Failed to verify ${provider} API key`,
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200 mb-2">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Multimodal AI Vision & Clinical Pharmacology Assistant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Prescriptions & AI Medicine Assistant
          </h1>
          <p className="text-slate-600 mt-1 max-w-2xl text-sm sm:text-base">
            Upload or browse any doctor prescription image directly into Gemini/ChatGPT for instant, in-depth clinical analysis, food interactions, and automated daily reminders.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* AI Settings Modal Toggle */}
          <button
            onClick={() => setShowAiModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition-all shadow-xs"
            title="Configure Gemini, OpenAI, or Tesseract Vision Scanner"
          >
            <Settings2 className="w-4 h-4 text-slate-600" />
            <span>AI Model Settings</span>
          </button>

          <Link
            to="/reminders"
            className="elder-btn-secondary text-xs sm:text-sm flex items-center gap-1.5 py-2"
          >
            <Clock className="w-4 h-4 text-brand-600" />
            <span>My Daily Reminders</span>
          </Link>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-xs ${
            activeTab === 'chat'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>AI Medicine Assistant (ChatGPT / Gemini)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] uppercase tracking-wider font-extrabold">
            Multimodal AI
          </span>
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-xs ${
            activeTab === 'scanner'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Prescription Document OCR Scanner</span>
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-xs ${
            activeTab === 'records'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Saved Prescriptions ({prescriptions.length})</span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CHATGPT / GEMINI STYLE AI MEDICINE ASSISTANT CHATBOT               */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Chat Container (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 shadow-lg flex flex-col overflow-hidden h-[780px]">
            {/* Chat Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-200 shadow-inner">
                  <Bot className="w-6 h-6 text-indigo-300 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-black flex items-center gap-2 text-white">
                    Dr. Mira • Multimodal AI Pharmacologist
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live Vision
                    </span>
                  </h2>
                  <p className="text-xs text-indigo-200/80">
                    Multimodal Vision Handover • Real-world clinical research & food interactions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiModal(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors border border-white/10"
                  title="Configure Gemini or OpenAI key"
                >
                  <Key className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Set Key</span>
                </button>
                <button
                  onClick={() =>
                    setChatMessages([
                      {
                        id: `welcome-${Date.now()}`,
                        role: 'assistant',
                        content: `Hello! I am **Dr. Mira**, your **AI Clinical Pharmacologist & Medicine Assistant**. Attach any prescription image with the 📎 icon below or search any medication name!`,
                        suggestedFollowUps: [
                          'Explain Telmisartan 40mg (Blood Pressure)',
                          'Why is Metformin 500mg prescribed and when to take it?',
                          'What foods and painkillers should I avoid with Atorvastatin?',
                        ],
                        timestamp: new Date(),
                      },
                    ])
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors border border-white/10"
                  title="Start a new chat session"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Chat</span>
                </button>
              </div>
            </div>

            {/* API Key Banner Notice if no key is configured */}
            {!aiConfig?.hasGeminiKey && !aiConfig?.hasOpenAIKey && (
              <div className="px-5 py-2.5 bg-gradient-to-r from-amber-50 to-indigo-50 border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-900 gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Unlock Direct Gemini Flash Vision:</strong> Paste your free Google AI Studio key to handover high-res prescription photos directly to Gemini!
                  </span>
                </div>
                <button
                  onClick={() => setShowAiModal(true)}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 shadow-xs"
                >
                  Configure Free Key
                </button>
              </div>
            )}

            {/* Chat Messages Scrollable Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-3xl p-5 shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {/* Attached Image Thumbnail inside user bubble */}
                    {msg.imageUrl && (
                      <div className="mb-3 rounded-2xl overflow-hidden border border-white/20 max-w-sm">
                        <img
                          src={msg.imageUrl}
                          alt="Prescription Document"
                          className="w-full max-h-60 object-contain bg-slate-900/50"
                        />
                      </div>
                    )}

                    {/* Message Content Markdown */}
                    <div className="text-sm sm:text-base leading-relaxed whitespace-pre-line prose prose-slate max-w-none">
                      {msg.content}
                    </div>

                    {/* Interactive 7-Pillars Card if a single medicine was identified */}
                    {msg.identifiedMedicine && msg.identifiedMedicine.name && (
                      <div className="mt-4 p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200/80 text-slate-900 space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-indigo-200 pb-2">
                          <div className="flex items-center gap-2">
                            <Pill className="w-4 h-4 text-indigo-600" />
                            <span className="font-extrabold text-sm text-indigo-950">
                              {msg.identifiedMedicine.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-800 text-[11px] font-bold">
                              {msg.identifiedMedicine.drugClass || 'Therapeutic Agent'}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSingleMedicineToRemind(msg.identifiedMedicine || null);
                              setShowReminderModal(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Set Daily Reminder</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                            <span className="font-bold text-slate-600 block mb-0.5">🎯 Purpose:</span>
                            <p className="text-slate-800">{msg.identifiedMedicine.purpose}</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                            <span className="font-bold text-slate-600 block mb-0.5">⏰ When to Take:</span>
                            <p className="text-slate-800">{msg.identifiedMedicine.timingInstructions || msg.identifiedMedicine.instructions}</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-amber-200 bg-amber-50/60 sm:col-span-2">
                            <span className="font-bold text-amber-900 block mb-0.5">⚠️ Food Interactions & Avoid:</span>
                            <p className="text-amber-950">{msg.identifiedMedicine.whatToAvoid || msg.identifiedMedicine.interactions}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interactive Multiple Medicine Cards (from Vision Handover) */}
                    {msg.identifiedMedicines && msg.identifiedMedicines.length > 0 && (
                      <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                        <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                          📋 Extracted Medications ({msg.identifiedMedicines.length}) • 1-Click Reminder
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {msg.identifiedMedicines.map((m, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 flex items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <div className="font-black text-indigo-950 text-sm">{m.name}</div>
                                <div className="text-slate-600 text-[11px] mt-0.5">
                                  {m.dosage || '1 tablet'} • {m.frequency || 'Daily'} • {m.timingInstructions || m.instructions || 'With water'}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setSingleMedicineToRemind(m);
                                  setShowReminderModal(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs shrink-0 transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Set Reminder</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Follow-up Prompt Chips */}
                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400 w-full mb-1">
                          Suggested questions:
                        </span>
                        {msg.suggestedFollowUps.map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendChatMessage(prompt)}
                            className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium border border-slate-200 transition-all text-left"
                          >
                            💡 {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-9 h-9 rounded-2xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}

              {isChatLoading && (
                <div className="flex gap-3.5 items-center text-slate-500 text-sm italic">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-xs font-semibold text-slate-600 ml-1">
                      Dr. Mira & Gemini Vision are analyzing clinical pharmacology...
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 bg-white border-t border-slate-200/90 space-y-3">
              {/* Attached Image Preview in Input Bar */}
              {chatImagePreview && (
                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 max-w-fit animate-in fade-in">
                  <img
                    src={chatImagePreview}
                    alt="Selected Prescription"
                    className="w-12 h-12 object-cover rounded-xl border border-indigo-300"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-indigo-950 truncate max-w-[200px]">
                      {chatImageFile?.name || 'Prescription Image'}
                    </div>
                    <div className="text-[11px] text-indigo-700">Ready for Multimodal Vision</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearChatImage}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Quick Prompt Suggestions */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">Popular:</span>
                <button
                  onClick={() => handleSendChatMessage('Tell me about Telmisartan 40mg')}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-semibold shrink-0 transition-colors border border-slate-200"
                >
                  💊 Telmisartan 40mg
                </button>
                <button
                  onClick={() => handleSendChatMessage('Why is Metformin 500mg prescribed?')}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-semibold shrink-0 transition-colors border border-slate-200"
                >
                  🩺 Metformin 500mg
                </button>
                <button
                  onClick={() => handleSendChatMessage('Food interactions with Atorvastatin')}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-semibold shrink-0 transition-colors border border-slate-200"
                >
                  ⚠️ Atorvastatin Foods
                </button>
                <button
                  onClick={() => handleSendChatMessage('Safe pain relief options for elderly')}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-semibold shrink-0 transition-colors border border-slate-200"
                >
                  👴 Senior Pain Relief
                </button>
              </div>

              {/* Input field + Image Attach + Voice + Send */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Hidden File Input for Chat Image */}
                <input
                  ref={chatFileInputRef}
                  id="chat-prescription-input"
                  type="file"
                  accept="image/*,.pdf,text/plain"
                  onChange={handleChatImageSelect}
                  className="hidden"
                />

                {/* Attach Prescription Image Button */}
                <button
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  className="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex items-center justify-center transition-all shadow-xs shrink-0"
                  title="Browse prescription image (handover to Gemini/ChatGPT)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      chatImageFile
                        ? 'Ask specific questions about this prescription, or press Ask AI...'
                        : 'Search any medicine or ask Dr. Mira a prescription question...'
                    }
                    disabled={isChatLoading}
                    className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-100/80 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 text-sm sm:text-base placeholder:text-slate-400 shadow-inner"
                  />

                  {/* Voice Input Microphone */}
                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-md'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200'
                    }`}
                    title={isListening ? 'Listening... Speak your query' : 'Voice input (Speak to ask)'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={(!chatInput.trim() && !chatImageFile) || isChatLoading}
                  className="px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask AI</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Direct Browse Card & Real-World Clinical Presets */}
          <div className="space-y-6">
            {/* Quick Upload & Browse Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-base">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <span>Browse Prescription Image</span>
              </div>
              <p className="text-xs text-slate-600">
                Directly handover your doctor note or prescription slip to Gemini / ChatGPT Vision.
              </p>

              {/* Native styled label wrapping file input */}
              <label
                htmlFor="sidebar-prescription-upload"
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-6 text-center bg-indigo-50/40 hover:bg-indigo-50/80 cursor-pointer transition-all space-y-2 block group"
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Click to browse prescription file
                </div>
                <div className="text-[11px] text-slate-500">
                  PNG, JPG, WebP, PDF & TXT (Max 10MB)
                </div>
                <input
                  id="sidebar-prescription-upload"
                  type="file"
                  accept="image/*,.pdf,text/plain"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setChatImageFile(file);
                      setChatImagePreview(URL.createObjectURL(file));
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => chatFileInputRef.current?.click()}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Paperclip className="w-4 h-4" />
                <span>Select & Analyze in Chat</span>
              </button>
            </div>

            {/* 3 Authentic Clinical Prescription Presets */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <span>Authentic Clinical Presets</span>
              </div>
              <p className="text-xs text-slate-500">
                1-click test real medical regimens across cardiology, endocrinology, and respiratory care:
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleLoadRealWorldSample('cardio')}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 transition-all text-xs group"
                >
                  <div className="font-extrabold text-slate-900 group-hover:text-indigo-900 flex items-center justify-between">
                    <span>🫀 Cardiology & Hypertension</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-slate-500 mt-0.5 text-[11px]">
                    Telmisartan 40mg + Atorvastatin 20mg + Amlodipine 5mg
                  </div>
                </button>

                <button
                  onClick={() => handleLoadRealWorldSample('diabetes')}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 transition-all text-xs group"
                >
                  <div className="font-extrabold text-slate-900 group-hover:text-indigo-900 flex items-center justify-between">
                    <span>🩸 Type 2 Diabetes & Metabolic</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-slate-500 mt-0.5 text-[11px]">
                    Metformin 500mg + Glimepiride 1mg + Rosuvastatin 10mg
                  </div>
                </button>

                <button
                  onClick={() => handleLoadRealWorldSample('antibiotic')}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 transition-all text-xs group"
                >
                  <div className="font-extrabold text-slate-900 group-hover:text-indigo-900 flex items-center justify-between">
                    <span>🫁 Respiratory & Chest Infection</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-slate-500 mt-0.5 text-[11px]">
                    Augmentin 625mg + Montair-LC + Pantoprazole 40mg
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRESCRIPTION OCR SCANNER & DETAILED CLINICAL REVIEW                */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
        <div className="space-y-8">
          {/* Document Upload & OCR Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Upload & Scan Prescription</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multimodal AI analyzes handwritten notes, doctor seals, and medication dosage schedules.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                  Engine: {selectedVisionProvider.toUpperCase()}
                </div>
              </div>

              {/* Native Label wrapped file upload */}
              <label
                htmlFor="scanner-main-file-upload"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 rounded-3xl p-8 text-center bg-indigo-50/40 hover:bg-indigo-50/70 cursor-pointer transition-all space-y-3 block group"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    Click to browse prescription file or drop here
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Accepts JPEG, PNG, WebP, PDF & TXT documents
                  </div>
                </div>
                <input
                  ref={scannerFileInputRef}
                  id="scanner-main-file-upload"
                  type="file"
                  accept="image/*,.pdf,text/plain"
                  onChange={handleScannerFileChange}
                  className="hidden"
                />
              </label>

              {uploading && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center gap-3">
                  <RotateCw className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">Processing Document</div>
                    <div className="text-indigo-700">{uploadStep}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Presets & Actions */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-lg space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Real Clinical Presets</span>
                </div>
                <h4 className="text-lg font-black mt-1">Instant Sample Testing</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Click any sample to test OCR extraction with authentic multi-drug formulations:
                </p>

                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => handleLoadRealWorldSample('cardio')}
                    className="w-full text-left p-3 rounded-2xl bg-slate-800/90 hover:bg-indigo-900/60 border border-slate-700 text-xs transition-colors"
                  >
                    <div className="font-bold text-white">🫀 Cardiology & BP (Telmisartan)</div>
                  </button>
                  <button
                    onClick={() => handleLoadRealWorldSample('diabetes')}
                    className="w-full text-left p-3 rounded-2xl bg-slate-800/90 hover:bg-indigo-900/60 border border-slate-700 text-xs transition-colors"
                  >
                    <div className="font-bold text-white">🩸 Diabetes Regimen (Metformin)</div>
                  </button>
                  <button
                    onClick={() => handleLoadRealWorldSample('antibiotic')}
                    className="w-full text-left p-3 rounded-2xl bg-slate-800/90 hover:bg-indigo-900/60 border border-slate-700 text-xs transition-colors"
                  >
                    <div className="font-bold text-white">🫁 Chest Infection (Augmentin)</div>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Zero fake data guarantee</span>
                <span className="text-emerald-400 font-bold">● Live OCR</span>
              </div>
            </div>
          </div>

          {/* Extracted Prescription Review / Confirmation Screen */}
          {selectedRx && (
            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-md space-y-8">
              {/* Doctor / Clinic Information Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Status: {selectedRx.status || 'ANALYZED'}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    {doctorName ? `Prescription by ${doctorName}` : 'Prescription Document'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {hospitalName ? `${hospitalName} • ` : ''}
                    Date: {selectedRx.prescriptionDate ? new Date(selectedRx.prescriptionDate).toLocaleDateString() : 'Recent'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="elder-btn-secondary text-xs py-2 px-3"
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit Details'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className="elder-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    {isConfirming ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Confirm & Save</span>
                  </button>
                </div>
              </div>

              {/* Editable Doctor & Clinic Details if Editing */}
              {isEditing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Doctor Name</label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Doctor Specialty</label>
                    <input
                      type="text"
                      value={doctorSpecialty}
                      onChange={(e) => setDoctorSpecialty(e.target.value)}
                      placeholder="e.g. Cardiology"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Clinic / Hospital</label>
                    <input
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="e.g. Metro Heart Clinic"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Reception Phone</label>
                    <input
                      type="text"
                      value={hospitalPhone}
                      onChange={(e) => setHospitalPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Medicines Extracted & 7 Clinical Pillars */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-indigo-600" />
                    <span>Prescribed Medications ({medicines.length})</span>
                  </h4>
                  {isEditing && (
                    <button
                      onClick={handleAddMedicineRow}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Medicine</span>
                    </button>
                  )}
                </div>

                {medicines.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-amber-50/80 border border-amber-200 text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                    <h5 className="font-bold text-amber-950 text-base">
                      No Legible Medications Identified
                    </h5>
                    <p className="text-xs text-amber-800 max-w-md mx-auto">
                      The handwriting in this document or photo was not clear enough for reliable clinical identification.
                      We never generate dummy or fake doctor data.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => scannerFileInputRef.current?.click()}
                        className="elder-btn-primary text-xs py-2 px-4"
                      >
                        Upload Clearer Photo
                      </button>
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="elder-btn-secondary text-xs py-2 px-4"
                      >
                        Search Medicine in AI Chat
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {medicines.map((med, idx) => (
                      <div
                        key={idx}
                        className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200 hover:border-indigo-300 transition-all space-y-4 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                              {idx + 1}
                            </div>
                            <div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={med.name}
                                  onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                                  className="font-black text-slate-900 text-base bg-white px-2 py-1 rounded-lg border border-slate-300"
                                />
                              ) : (
                                <h5 className="font-black text-slate-900 text-base flex items-center gap-2">
                                  {med.name}
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                                    {med.drugClass || 'Therapeutic Agent'}
                                  </span>
                                </h5>
                              )}
                              <p className="text-xs text-slate-500">
                                Active: {med.activeIngredients || med.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleLookupSingleMedicine(idx)}
                              disabled={lookingUpIdx === idx}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 text-xs font-bold border border-slate-200 flex items-center gap-1 shadow-xs"
                            >
                              {lookingUpIdx === idx ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                              <span>Re-Analyze AI</span>
                            </button>
                            <button
                              onClick={() => {
                                setSingleMedicineToRemind(med);
                                setShowReminderModal(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Set Reminder</span>
                            </button>
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveMedicineRow(idx)}
                                className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 7 Clinical Pillars Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                              🎯 Clinical Indication (Why Prescribed)
                            </span>
                            <p className="text-slate-900 font-medium">{med.purpose || 'Follow physician guidance'}</p>
                          </div>

                          <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                              ⏰ When & How to Take
                            </span>
                            <p className="text-slate-900 font-medium">
                              {med.timingInstructions || med.instructions || `${med.frequency} with water`}
                            </p>
                          </div>

                          <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                              🛡️ Precautions for Seniors
                            </span>
                            <p className="text-slate-900 font-medium">{med.precautions || 'Take regularly at same time'}</p>
                          </div>

                          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 sm:col-span-2">
                            <span className="font-bold text-amber-800 uppercase tracking-wider text-[10px] block">
                              ⚠️ Food & Drug Interactions (What to Avoid)
                            </span>
                            <p className="text-amber-950 font-medium">{med.whatToAvoid || med.interactions || 'Avoid alcohol'}</p>
                          </div>

                          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                            <span className="font-bold text-rose-800 uppercase tracking-wider text-[10px] block">
                              🚨 Red-Flag Warnings
                            </span>
                            <p className="text-rose-950 font-medium">{med.warnings || 'Call clinic if experiencing severe dizziness'}</p>
                          </div>
                        </div>

                        {/* Plain Language Summary */}
                        {med.simplifiedExplanation && (
                          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-2 text-xs text-indigo-950">
                            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">AI Simple Explanation: </span>
                              <span>{med.simplifiedExplanation}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SAVED PRESCRIPTIONS ARCHIVE                                        */}
      {/* ========================================================================= */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900">Your Prescription Records</h3>
            <button
              onClick={() => setActiveTab('scanner')}
              className="elder-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Scan New Prescription</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Loading prescription archive...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-800 text-base">No Prescriptions Saved Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload a prescription photo or use our AI medicine chatbot to research drugs and set reminders.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prescriptions.map((rx) => (
                <div
                  key={rx._id}
                  className="p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-sm transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
                        {rx.status || 'ANALYZED'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {rx.prescriptionDate ? new Date(rx.prescriptionDate).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <h4 className="font-black text-slate-900 text-base">
                      {rx.doctor?.name || 'Prescription Document'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {rx.hospital?.name || 'Clinic Record'} • {rx.medicines?.length || 0} Medications
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                      {rx.medicines?.slice(0, 3).map((m, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          {m.name}
                        </span>
                      ))}
                      {(rx.medicines?.length || 0) > 3 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                          +{(rx.medicines?.length || 0) - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        initReviewState(rx);
                        setActiveTab('scanner');
                      }}
                      className="flex-1 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold text-center transition-colors"
                    >
                      View & Manage
                    </button>
                    <button
                      onClick={() => handleDelete(rx._id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Delete prescription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AI MODEL CONFIGURATION SETTINGS                                    */}
      {/* ========================================================================= */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">AI Model & Vision Settings</h3>
                  <p className="text-xs text-slate-500">Configure LLM providers and test API keys</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Provider Selection */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Select Active OCR / Vision Engine
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedVisionProvider('groq')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedVisionProvider === 'groq'
                      ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200 text-indigo-950'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center justify-between">
                    <span>Groq Llama 3.2</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">FAST</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">11B/90B Vision</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVisionProvider('gemini')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedVisionProvider === 'gemini'
                      ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200 text-indigo-950'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-extrabold text-xs">Google Gemini</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Flash 1.5/2.0 Vision</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVisionProvider('openai')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedVisionProvider === 'openai'
                      ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200 text-indigo-950'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-extrabold text-xs">OpenAI ChatGPT</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">GPT-4o Vision</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVisionProvider('tesseract')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedVisionProvider === 'tesseract'
                      ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200 text-indigo-950'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-extrabold text-xs">Tesseract OCR</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Local WASM Engine</div>
                </button>
              </div>
            </div>

            {/* API Keys Entry */}
            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Groq API Key (Llama 3.2 Vision & 3.3 LLM)</label>
                  {aiConfig?.hasGroqKey && (
                    <span className="text-[11px] text-emerald-600 font-bold">● Key Active</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={inputGroqKey}
                    onChange={(e) => setInputGroqKey(e.target.value)}
                    placeholder={aiConfig?.maskedGroqKey || 'Enter Groq API key (gsk_...)'}
                    className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestKey('groq')}
                    disabled={isTestingKey}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300"
                  >
                    Test
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Google Gemini API Key (Free)</label>
                  {aiConfig?.hasGeminiKey && (
                    <span className="text-[11px] text-emerald-600 font-bold">● Key Active</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={inputGeminiKey}
                    onChange={(e) => setInputGeminiKey(e.target.value)}
                    placeholder={aiConfig?.maskedGeminiKey || 'Enter Gemini key from Google AI Studio...'}
                    className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestKey('gemini')}
                    disabled={isTestingKey}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300"
                  >
                    Test
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">OpenAI API Key</label>
                  {aiConfig?.hasOpenAIKey && (
                    <span className="text-[11px] text-emerald-600 font-bold">● Key Active</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={inputOpenAIKey}
                    onChange={(e) => setInputOpenAIKey(e.target.value)}
                    placeholder={aiConfig?.maskedOpenAIKey || 'Enter OpenAI API key (sk-...)'}
                    className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestKey('openai')}
                    disabled={isTestingKey}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300"
                  >
                    Test
                  </button>
                </div>
              </div>
            </div>

            {keyTestFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  keyTestFeedback.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {keyTestFeedback.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="elder-btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAIConfig}
                className="elder-btn-primary text-xs py-2 px-5"
              >
                Save & Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DIRECT MEDICATION REMINDER CREATION                                */}
      {/* ========================================================================= */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Schedule Medication Reminder</h3>
                  <p className="text-xs text-slate-500">Automated daily alarm for senior wellness</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  setSingleMedicineToRemind(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 text-sm">
                  {singleMedicineToRemind
                    ? singleMedicineToRemind.name
                    : `All ${medicines.length} Prescription Medications`}
                </div>
                <div className="text-slate-500 mt-1">
                  {singleMedicineToRemind
                    ? singleMedicineToRemind.instructions || singleMedicineToRemind.timingInstructions
                    : 'Scheduled daily dosages will be created for your caregiver & elder alerts.'}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Preferred Daily Dose Time</label>
                <input
                  type="time"
                  value={preferredReminderTime}
                  onChange={(e) => setPreferredReminderTime(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 font-bold text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <input
                  type="checkbox"
                  id="confirmDaily"
                  checked={confirmDailySchedule}
                  onChange={(e) => setConfirmDailySchedule(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md"
                />
                <label htmlFor="confirmDaily" className="font-medium text-indigo-950">
                  Repeat this reminder daily automatically
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowReminderModal(false);
                  setSingleMedicineToRemind(null);
                }}
                className="elder-btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (singleMedicineToRemind) {
                    handleCreateDirectReminder(singleMedicineToRemind);
                  } else {
                    handleExecuteBridgeToReminders();
                  }
                }}
                disabled={isBridging || isCreatingSingleReminder}
                className="elder-btn-primary text-xs py-2 px-5 flex items-center gap-1.5"
              >
                {(isBridging || isCreatingSingleReminder) && <RotateCw className="w-4 h-4 animate-spin" />}
                <span>Activate Daily Reminder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescription;
