import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';

/**
 * Reusable StatusBadge supporting success (Emerald), failure (Ruby Red), running (Gold), and pending
 */
export default function StatusBadge({ status = 'pending', label }) {
  const configs = {
    success: {
      bg: 'bg-[#059669]/15',
      text: 'text-[#059669]',
      border: 'border-[#059669]/30',
      icon: CheckCircle2,
      defaultLabel: 'Success',
    },
    failure: {
      bg: 'bg-[#C83C3C]/15',
      text: 'text-[#C83C3C]',
      border: 'border-[#C83C3C]/30',
      icon: AlertCircle,
      defaultLabel: 'Failed',
    },
    running: {
      bg: 'bg-[#252419]',
      text: 'text-[#E5B45B]',
      border: 'border-[#E5B45B]/35',
      icon: Loader2,
      spin: true,
      defaultLabel: 'Running',
    },
    pending: {
      bg: 'bg-[#151715]',
      text: 'text-[#B9B0A0]',
      border: 'border-[rgba(185,176,160,0.2)]',
      icon: Clock,
      defaultLabel: 'Pending',
    },
    warning: {
      bg: 'bg-[#C83C3C]/15',
      text: 'text-[#C83C3C]',
      border: 'border-[#C83C3C]/30',
      icon: AlertCircle,
      defaultLabel: 'Warning',
    },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />
      <span>{displayLabel}</span>
    </span>
  );
}
