import React, { useState } from 'react';
import { Trip, DayPlan } from '../types/travel';
import { generateWhatsAppSummary } from '../utils/travelUtils';
import { Share2, Copy, Check, ExternalLink, X, MessageSquare } from 'lucide-react';

interface WhatsAppExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  activeDay: DayPlan;
}

export const WhatsAppExportModal: React.FC<WhatsAppExportModalProps> = ({
  isOpen,
  onClose,
  trip,
  activeDay,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const summaryText = generateWhatsAppSummary(trip, activeDay);

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(summaryText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Share Trip Hub to WhatsApp</h3>
              <p className="text-xs text-slate-500">Day {activeDay.dayNumber} · Schedule, Beacon & Debt Summary</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-xs text-slate-600">
            Copy this pre-formatted summary directly into your group chat so everyone is synchronized on meetups and reservations:
          </p>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed border border-slate-800 selection:bg-amber-400 selection:text-slate-900">
            {summaryText}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Formatted Text'}</span>
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
