import React from 'react';
import { Plus } from 'lucide-react';

/**
 * Reusable EmptyState component in luxury industrial-tech styling
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(185,176,160,0.18)] bg-[#151715]/70 p-8 sm:p-10 text-center space-y-4">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center mx-auto text-[#E5B45B] shadow-glow-gold">
          <Icon className="w-7 h-7" />
        </div>
      )}

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-base font-semibold text-[#F5F0E6] tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-[#B9B0A0] leading-relaxed">
          {description}
        </p>
      </div>

      {actionLabel && (
        <div className="pt-2">
          <button
            onClick={onAction}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] text-xs sm:text-sm font-bold shadow-lg shadow-[#E5B45B]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ActionIcon className="w-4 h-4" />
            <span>{actionLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
