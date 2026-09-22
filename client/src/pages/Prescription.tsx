import React from 'react';
import { UploadCloud, FileText, Sparkles } from 'lucide-react';

export const Prescription: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-semibold border border-indigo-200 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Phase 4: Prescription Intelligence
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Prescription OCR & Intelligence</h1>
        <p className="text-slate-600 mt-1">
          Upload doctor prescriptions to extract medicines, dosages, and hospital contacts without medical hallucination.
        </p>
      </div>

      <div className="elder-card p-12 border-2 border-dashed border-slate-300 text-center space-y-4">
        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-900">Upload Prescription Document</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Drag and drop prescription images (JPG, PNG) or PDFs. Secure OCR extraction will be enabled in Phase 4.
          </p>
        </div>
        <button
          className="elder-btn-secondary opacity-60 cursor-not-allowed"
          disabled
        >
          <FileText className="w-5 h-5 mr-2" />
          <span>Select Document (Phase 4)</span>
        </button>
      </div>
    </div>
  );
};
