import React from 'react';
import { X, Sparkles, Workflow, Layers, CheckCircle2 } from 'lucide-react';

/**
 * Reusable modal for features scheduled in upcoming roadmap phases
 */
export default function FeatureModal({ isOpen, onClose, feature }) {
  if (!isOpen || !feature) return null;

  const icons = {
    workflow: Workflow,
    template: Layers,
    default: Sparkles,
  };

  const Icon = icons[feature.type] || icons.default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#0B0D0C]/85 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.18)] shadow-2xl p-6 sm:p-8 space-y-6 z-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B] shadow-glow-gold">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] text-[10px] font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-[#E5B45B]" />
                <span>{feature.badge || 'Roadmap Preview'}</span>
              </div>
              <h3 className="text-xl font-bold text-[#F5F0E6] tracking-tight">
                {feature.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#1C1F1C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-sm text-[#B9B0A0] leading-relaxed">
          <p>{feature.description}</p>

          {feature.highlights && (
            <div className="pt-2 space-y-2">
              <span className="text-xs font-semibold text-[#F5F0E6] uppercase tracking-wider">
                Upcoming Capabilities:
              </span>
              <ul className="space-y-1.5 text-xs text-[#B9B0A0]">
                {feature.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[rgba(185,176,160,0.1)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] text-sm font-bold shadow-lg shadow-[#E5B45B]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
