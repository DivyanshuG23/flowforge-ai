import React from 'react';

/**
 * Reusable StatCard for luxury industrial-tech dashboard metrics
 */
export default function StatCard({
  label,
  value,
  note,
  icon: Icon,
  accentColor = 'gold',
  badge,
}) {
  const accentStyles = {
    gold: {
      iconBg: 'bg-[#252419]',
      iconText: 'text-[#E5B45B]',
      borderHover: 'hover:border-[#E5B45B]/40',
      glow: 'group-hover:shadow-glow-gold',
    },
    emerald: {
      iconBg: 'bg-[#059669]/15',
      iconText: 'text-[#059669]',
      borderHover: 'hover:border-[#059669]/40',
      glow: 'group-hover:shadow-glow-emerald',
    },
    ruby: {
      iconBg: 'bg-[#C83C3C]/15',
      iconText: 'text-[#C83C3C]',
      borderHover: 'hover:border-[#C83C3C]/40',
      glow: 'group-hover:shadow-glow-ruby',
    },
    neutral: {
      iconBg: 'bg-[#1C1F1C]',
      iconText: 'text-[#B9B0A0]',
      borderHover: 'hover:border-[#B9B0A0]/40',
      glow: 'group-hover:shadow-card-dark',
    },
  };

  const style = accentStyles[accentColor] || accentStyles.gold;

  return (
    <div
      className={`group relative p-5 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] shadow-xl transition-all duration-300 ${style.borderHover} ${style.glow}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-medium text-[#B9B0A0] tracking-wider uppercase">
            {label}
          </span>
          <div className="text-3xl font-extrabold text-[#F5F0E6] tracking-tight font-sans">
            {value}
          </div>
        </div>

        <div className={`w-11 h-11 rounded-xl ${style.iconBg} ${style.iconText} border border-[rgba(185,176,160,0.1)] flex items-center justify-center transition-transform group-hover:scale-105 duration-200`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[rgba(185,176,160,0.08)] flex items-center justify-between">
        <span className="text-xs text-[#B9B0A0]/80">
          {note}
        </span>
        {badge && (
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.12)]">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
