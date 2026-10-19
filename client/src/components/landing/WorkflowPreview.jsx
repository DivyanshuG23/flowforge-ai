import React, { useState, useEffect } from 'react';
import {
  Zap,
  Bot,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function WorkflowPreview({ externalStep = 0, isExternalSimulating = false }) {
  const [ambientStep, setAmbientStep] = useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect user preference for reduced motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Ambient step cycle when not manually running
  useEffect(() => {
    if (isExternalSimulating || externalStep > 0 || prefersReducedMotion) return;

    const interval = setInterval(() => {
      setAmbientStep((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 2400);

    return () => clearInterval(interval);
  }, [isExternalSimulating, externalStep, prefersReducedMotion]);

  // Determine current active step: manual simulation takes precedence over ambient cycle
  const currentStep = externalStep > 0 ? externalStep : ambientStep;
  const isTriggerActive = currentStep >= 1;
  const isAiActive = currentStep >= 2;
  const isBranchActive = currentStep >= 3;
  const isCompleted = currentStep >= 4;

  return (
    <div className="w-full relative flex flex-col bg-[#0B0D0C] text-left select-none p-3.5 sm:p-5 min-h-[340px] justify-between">
      {/* Top Illustrative Tag Ribbon */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(185,176,160,0.08)] text-[10px] font-mono">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            {!prefersReducedMotion && (
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E5B45B] opacity-75"></span>
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E5B45B]"></span>
          </span>
          <span className="text-[#E5B45B] font-bold uppercase tracking-wider">
            // ILLUSTRATIVE WORKFLOW PREVIEW
          </span>
        </div>
        <span className="text-[9px] text-[#B9B0A0]/70 px-2 py-0.5 rounded bg-[#151715] border border-[rgba(185,176,160,0.1)]">
          {prefersReducedMotion
            ? 'Static Preview'
            : isExternalSimulating
            ? 'Manual DAG Step'
            : 'Ambient Simulation'}
        </span>
      </div>

      {/* Desktop & Tablet Layout (sm and up) */}
      <div className="hidden sm:grid grid-cols-12 gap-3 items-center relative my-auto py-2">
        {/* Node 1: Ingestion Webhook (cols 1-3) */}
        <div
          className={`col-span-3 p-3 rounded-xl bg-[#151715] border transition-all duration-300 relative z-10 ${
            currentStep === 1
              ? 'border-[#E5B45B] shadow-glow-gold ring-1 ring-[#E5B45B]/50'
              : isTriggerActive
              ? 'border-[#059669]/60'
              : 'border-[rgba(185,176,160,0.14)] opacity-85'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[rgba(185,176,160,0.08)]">
            <span className="text-[9px] font-mono text-[#E5B45B] font-bold uppercase tracking-wider">
              [TRIGGER]
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${isTriggerActive ? 'bg-[#059669]' : 'bg-[#B9B0A0]/40'}`} />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-[#E5B45B] shrink-0" />
              <h4 className="text-xs font-bold text-[#F5F0E6] truncate">Incident Webhook</h4>
            </div>
            <div className="text-[9px] text-[#B9B0A0] font-mono bg-[#0B0D0C] px-1.5 py-0.5 rounded border border-[rgba(185,176,160,0.08)] truncate">
              POST /api/v1/alert
            </div>
          </div>
          {/* Output port handle dot */}
          <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0B0D0C] border-2 border-[#E5B45B]" />
        </div>

        {/* SVG Connector 1: Trigger -> AI Node (col 4) */}
        <div className="col-span-1 flex items-center justify-center relative h-12">
          <svg className="w-full h-8 overflow-visible" viewBox="0 0 40 20" preserveAspectRatio="none">
            <line
              x1="0"
              y1="10"
              x2="40"
              y2="10"
              stroke="rgba(185, 176, 160, 0.18)"
              strokeWidth="2"
            />
            <line
              x1="0"
              y1="10"
              x2="40"
              y2="10"
              stroke="#E5B45B"
              strokeWidth="2"
              strokeDasharray="6 4"
              className={!prefersReducedMotion ? "animate-data-flow" : ""}
              opacity={isTriggerActive ? 1 : 0.2}
            />
          </svg>
        </div>

        {/* Node 2: AI Reasoning (cols 5-7) */}
        <div
          className={`col-span-4 p-3 rounded-xl bg-[#151715] border transition-all duration-300 relative z-10 ${
            currentStep === 2
              ? 'border-[#E5B45B] shadow-glow-gold ring-1 ring-[#E5B45B]/50'
              : isAiActive
              ? 'border-[#059669]/60'
              : 'border-[rgba(185,176,160,0.14)] opacity-85'
          }`}
        >
          {/* Input port handle dot */}
          <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0B0D0C] border-2 border-[#E5B45B]" />
          <div className="flex items-center justify-between pb-1.5 border-b border-[rgba(185,176,160,0.08)]">
            <span className="text-[9px] font-mono text-[#E5B45B] font-bold uppercase tracking-wider">
              [AI // REASONING]
            </span>
            <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
              currentStep === 2 ? 'bg-[#E5B45B]/15 text-[#E5B45B]' : 'text-[#B9B0A0]/60'
            }`}>
              {currentStep === 2 ? 'Inferring' : 'Gemini 2.5'}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center space-x-1.5">
              <Bot className="w-3.5 h-3.5 text-[#E5B45B] shrink-0" />
              <h4 className="text-xs font-bold text-[#F5F0E6] truncate">Anomaly Triage</h4>
            </div>
            <div className="text-[9px] text-[#059669] font-mono bg-[#0B0D0C] px-1.5 py-0.5 rounded border border-[rgba(185,176,160,0.08)] truncate">
              severity: "CRITICAL"
            </div>
          </div>
          {/* Output port handle dot */}
          <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0B0D0C] border-2 border-[#059669]" />
        </div>

        {/* SVG Connector 2: Branching Fork (col 8) */}
        <div className="col-span-1 flex items-center justify-center relative h-32">
          <svg className="w-full h-28 overflow-visible" viewBox="0 0 40 80" preserveAspectRatio="none">
            {/* Branch 1 (Success - Upper Curve) */}
            <path
              d="M 0 40 C 20 40, 20 16, 40 16"
              fill="none"
              stroke="rgba(185, 176, 160, 0.18)"
              strokeWidth="2"
            />
            <path
              d="M 0 40 C 20 40, 20 16, 40 16"
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeDasharray="6 4"
              className={!prefersReducedMotion ? "animate-data-flow" : ""}
              opacity={isBranchActive || isCompleted ? 1 : 0.25}
            />

            {/* Branch 2 (Fallback - Lower Curve) */}
            <path
              d="M 0 40 C 20 40, 20 64, 40 64"
              fill="none"
              stroke="rgba(185, 176, 160, 0.18)"
              strokeWidth="2"
            />
            <path
              d="M 0 40 C 20 40, 20 64, 40 64"
              fill="none"
              stroke="#C83C3C"
              strokeWidth="2"
              strokeDasharray="6 4"
              className={!prefersReducedMotion ? "animate-data-flow" : ""}
              opacity={isBranchActive || isCompleted ? 0.75 : 0.2}
            />
          </svg>
        </div>

        {/* Node 3 & 4: Dual Outcomes (cols 9-12) */}
        <div className="col-span-3 space-y-2.5">
          {/* Success Branch: P1 Dispatch */}
          <div
            className={`p-2.5 rounded-xl bg-[#151715] border transition-all duration-300 relative ${
              isBranchActive || isCompleted
                ? 'border-[#059669] shadow-glow-emerald ring-1 ring-[#059669]/50'
                : 'border-[rgba(185,176,160,0.14)] opacity-85'
            }`}
          >
            {/* Input handle dot */}
            <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0B0D0C] border-2 border-[#059669]" />
            <div className="flex items-center justify-between pb-1 border-b border-[rgba(185,176,160,0.08)]">
              <span className="text-[8px] font-mono text-[#059669] font-bold uppercase tracking-wider">
                [SUCCESS // BRANCH A]
              </span>
              <span className="text-[8px] font-mono text-[#059669]">True</span>
            </div>
            <div className="mt-1 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0" />
              <span className="text-xs font-semibold text-[#F5F0E6] truncate">PagerDuty P1</span>
            </div>
          </div>

          {/* Fallback Branch: Groq Auto-Failover */}
          <div
            className={`p-2.5 rounded-xl bg-[#151715] border transition-all duration-300 relative ${
              isBranchActive || isCompleted
                ? 'border-[#C83C3C]/50 shadow-[0_0_15px_-3px_rgba(200,60,60,0.25)]'
                : 'border-[rgba(185,176,160,0.12)] opacity-70'
            }`}
          >
            {/* Input handle dot */}
            <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0B0D0C] border-2 border-[#C83C3C]" />
            <div className="flex items-center justify-between pb-1 border-b border-[rgba(185,176,160,0.08)]">
              <span className="text-[8px] font-mono text-[#C83C3C] font-bold uppercase tracking-wider">
                [FALLBACK // RESCUE]
              </span>
              <span className="text-[8px] font-mono text-[#B9B0A0]">Tier 2</span>
            </div>
            <div className="mt-1 flex items-center space-x-1.5">
              <ShieldAlert className="w-3 h-3 text-[#C83C3C] shrink-0" />
              <span className="text-xs font-semibold text-[#F5F0E6] truncate">Groq Failover</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Vertical Layout (< sm: 320px to 639px) */}
      <div className="sm:hidden space-y-2.5 my-auto py-2">
        {/* Mobile Node 1: Webhook */}
        <div
          className={`p-2.5 rounded-xl bg-[#151715] border transition-all duration-300 ${
            currentStep === 1
              ? 'border-[#E5B45B] shadow-glow-gold'
              : 'border-[rgba(185,176,160,0.14)] opacity-85'
          }`}
        >
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-[#E5B45B] font-bold">[1. TRIGGER // HTTP]</span>
            <span className={currentStep === 1 ? 'text-[#E5B45B] animate-pulse font-bold' : 'text-[#B9B0A0]'}>
              {currentStep === 1 ? 'Firing' : 'Standby'}
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-1.5">
            <Zap className="w-3 h-3 text-[#E5B45B] shrink-0" />
            <span className="text-xs font-bold text-[#F5F0E6]">Incident Webhook</span>
          </div>
        </div>

        {/* Mobile Vertical Connector */}
        <div className="flex justify-center -my-1">
          <div className={`w-0.5 h-3.5 ${isTriggerActive ? 'bg-[#E5B45B]' : 'bg-[rgba(185,176,160,0.2)]'}`} />
        </div>

        {/* Mobile Node 2: AI Reasoning */}
        <div
          className={`p-2.5 rounded-xl bg-[#151715] border transition-all duration-300 ${
            currentStep === 2
              ? 'border-[#E5B45B] shadow-glow-gold'
              : 'border-[rgba(185,176,160,0.14)] opacity-85'
          }`}
        >
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-[#E5B45B] font-bold">[2. AI // REASONING]</span>
            <span className={currentStep === 2 ? 'text-[#059669] font-bold' : 'text-[#B9B0A0]'}>
              Gemini 2.5 Flash
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-1.5">
            <Bot className="w-3.5 h-3.5 text-[#E5B45B] shrink-0" />
            <span className="text-xs font-bold text-[#F5F0E6]">Severity &amp; Root Cause Analysis</span>
          </div>
        </div>

        {/* Mobile Vertical Connector */}
        <div className="flex justify-center -my-1">
          <div className={`w-0.5 h-3.5 ${isAiActive ? 'bg-[#059669]' : 'bg-[rgba(185,176,160,0.2)]'}`} />
        </div>

        {/* Mobile Dual Outcome Row */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className={`p-2 rounded-xl bg-[#151715] border transition-all duration-300 ${
              isBranchActive || isCompleted
                ? 'border-[#059669] shadow-glow-emerald'
                : 'border-[rgba(185,176,160,0.14)] opacity-85'
            }`}
          >
            <div className="text-[8px] font-mono text-[#059669] font-bold uppercase truncate">
              [SUCCESS]
            </div>
            <div className="mt-0.5 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0" />
              <span className="text-[11px] font-bold text-[#F5F0E6] truncate">PagerDuty P1</span>
            </div>
          </div>

          <div
            className={`p-2 rounded-xl bg-[#151715] border transition-all duration-300 ${
              isBranchActive || isCompleted
                ? 'border-[#C83C3C]/40'
                : 'border-[rgba(185,176,160,0.12)] opacity-70'
            }`}
          >
            <div className="text-[8px] font-mono text-[#C83C3C] font-bold uppercase truncate">
              [FALLBACK]
            </div>
            <div className="mt-0.5 flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 text-[#C83C3C] shrink-0" />
              <span className="text-[11px] font-bold text-[#F5F0E6] truncate">Groq Rescue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Technical Note & Disclaimer */}
      <div className="pt-2.5 border-t border-[rgba(185,176,160,0.1)] flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-[#B9B0A0]">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-3 h-3 text-[#E5B45B]" />
          <span>Interactive Visual DAG Simulation</span>
        </div>
        <span className="text-[#B9B0A0]/60 text-[9px]">
          Simulated demonstration • Zero live token consumption
        </span>
      </div>
    </div>
  );
}
