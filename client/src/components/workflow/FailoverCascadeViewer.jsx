import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Sparkles,
  SkipForward,
  Activity,
  Cpu,
  CornerDownRight
} from 'lucide-react';
import { sanitizeTelemetryError } from '../../utils/sanitizeTelemetry';

const PROVIDER_METADATA = {
  gemini: {
    displayName: 'Google Gemini',
    badgeClass: 'text-[#E5B45B] bg-[#252419] border-[rgba(229,180,91,0.3)]',
    defaultModel: 'gemini-3.8-flash',
  },
  groq: {
    displayName: 'Groq',
    badgeClass: 'text-[#059669] bg-[#059669]/15 border-[#059669]/30',
    defaultModel: 'openai/gpt-oss-20b',
  },
  openrouter: {
    displayName: 'OpenRouter (Free)',
    badgeClass: 'text-[#818CF8] bg-[#818CF8]/15 border-[#818CF8]/30',
    defaultModel: 'google/gemma-4-31b-it:free',
  },
  openai: {
    displayName: 'OpenAI',
    badgeClass: 'text-[#F5F0E6] bg-[#1C1F1C] border-[rgba(185,176,160,0.2)]',
    defaultModel: 'gpt-4o-mini',
  },
  mistral: {
    displayName: 'Mistral AI',
    badgeClass: 'text-[#E5B45B] bg-[#151715] border-[rgba(229,180,91,0.25)]',
    defaultModel: 'mistral-small-latest',
  },
};

/**
 * Status style resolver strictly within Charcoal / Champagne Gold / Emerald / Ruby / Ivory palette
 */
const getStatusBadge = (attempt) => {
  const isSuccess = attempt.success === true || (attempt.status === 200 && attempt.success !== false);
  if (isSuccess) {
    return {
      label: 'Success • Recovered',
      badgeClass: 'bg-[#059669]/15 text-[#059669] border-[#059669]/30',
      icon: CheckCircle2,
      iconColor: 'text-[#059669]',
    };
  }

  if (attempt.status === 'skipped') {
    return {
      label: 'Skipped • Unconfigured Key',
      badgeClass: 'bg-[#151715] text-[#B9B0A0] border-[rgba(185,176,160,0.18)]',
      icon: SkipForward,
      iconColor: 'text-[#B9B0A0]',
    };
  }

  if (attempt.status === 404 || attempt.modelUnavailable) {
    return {
      label: 'Model Unavailable (HTTP 404)',
      badgeClass: 'bg-[#C83C3C]/15 text-[#E5B45B] border-[#C83C3C]/30',
      icon: AlertCircle,
      iconColor: 'text-[#E5B45B]',
    };
  }

  if (attempt.status === 429) {
    return {
      label: 'Rate Limit (HTTP 429)',
      badgeClass: 'bg-[#252419] text-[#E5B45B] border-[rgba(229,180,91,0.3)]',
      icon: Clock,
      iconColor: 'text-[#E5B45B]',
    };
  }

  if (attempt.status === 401 || attempt.status === 403) {
    return {
      label: `Auth Error (HTTP ${attempt.status})`,
      badgeClass: 'bg-[#C83C3C]/15 text-[#C83C3C] border-[#C83C3C]/30',
      icon: AlertCircle,
      iconColor: 'text-[#C83C3C]',
    };
  }

  if (attempt.status === 'timeout') {
    return {
      label: 'Timeout Budget Exhausted',
      badgeClass: 'bg-[#C83C3C]/15 text-[#C83C3C] border-[#C83C3C]/30',
      icon: Clock,
      iconColor: 'text-[#C83C3C]',
    };
  }

  return {
    label: attempt.status ? `Error (HTTP ${attempt.status})` : 'Failed',
    badgeClass: 'bg-[#C83C3C]/15 text-[#C83C3C] border-[#C83C3C]/30',
    icon: AlertCircle,
    iconColor: 'text-[#C83C3C]',
  };
};

/**
 * Visual Failover Cascade Viewer
 * Displays step-by-step provider attempt history with timing, model names, and recovery paths.
 *
 * @param {Object} props
 * @param {Array} props.failoverLog - Array of candidate attempt logs from aiExecutor
 * @param {string} [props.title] - Optional section title
 * @param {boolean} [props.compact] - Compact mode for nested table drawers
 */
export default function FailoverCascadeViewer({ failoverLog, title = 'Multi-Provider Failover Cascade', compact = false }) {
  if (!Array.isArray(failoverLog) || failoverLog.length === 0) {
    return null;
  }

  const isMultiAttempt = failoverLog.length > 1;
  const lastAttempt = failoverLog[failoverLog.length - 1];
  const recovered = lastAttempt?.success === true || (lastAttempt?.status === 200 && lastAttempt?.success !== false);
  const primaryAttempt = failoverLog[0];

  return (
    <div
      role="region"
      aria-label="AI Failover Attempt History"
      className="space-y-3 rounded-2xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.12)] p-4"
    >
      {/* Header Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[rgba(185,176,160,0.08)]">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B]">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-[#F5F0E6] flex items-center space-x-1.5">
              <span>{title}</span>
              <span className="text-[10px] font-mono text-[#B9B0A0] font-normal">
                ({failoverLog.length} {failoverLog.length === 1 ? 'Attempt' : 'Attempts'})
              </span>
            </h5>
          </div>
        </div>

        {/* Global Cascade Outcome Badge */}
        {isMultiAttempt && recovered ? (
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#059669]/15 border border-[#059669]/30 text-[#059669] text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              Recovered via {PROVIDER_METADATA[lastAttempt.provider]?.displayName || lastAttempt.provider}
            </span>
          </div>
        ) : isMultiAttempt && !recovered ? (
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#C83C3C]/15 border border-[#C83C3C]/30 text-[#C83C3C] text-[11px] font-bold">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cascade Exhausted ({failoverLog.length} providers failed)</span>
          </div>
        ) : recovered ? (
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#059669]/10 border border-[#059669]/25 text-[#059669] text-[10px] font-semibold">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            <span>Primary Succeeded Directly</span>
          </div>
        ) : (
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#C83C3C]/10 border border-[#C83C3C]/25 text-[#C83C3C] text-[10px] font-semibold">
            <AlertCircle className="w-3 h-3" aria-hidden="true" />
            <span>Execution Failed</span>
          </div>
        )}
      </div>

      {/* Attempt Timeline */}
      <div className="relative pl-4 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[rgba(185,176,160,0.12)]">
        {failoverLog.map((attempt, index) => {
          const isPrimary = index === 0;
          const isLast = index === failoverLog.length - 1;
          const statusInfo = getStatusBadge(attempt);
          const StatusIcon = statusInfo.icon;
          const providerMeta = PROVIDER_METADATA[attempt.provider] || {
            displayName: attempt.provider || 'Custom Provider',
            badgeClass: 'text-[#B9B0A0] bg-[#151715] border-[rgba(185,176,160,0.2)]',
          };

          // Sanitize any error text to guarantee zero secret leaks
          const rawError = attempt.error || attempt.reason || null;
          const sanitizedError = rawError ? sanitizeTelemetryError(rawError) : null;
          const isAttemptSuccess = attempt.success === true || (attempt.status === 200 && attempt.success !== false);

          return (
            <div key={`${attempt.provider}-${index}`} className="relative group">
              {/* Timeline Node Bullet */}
              <div
                className={`absolute -left-[18px] top-3.5 w-2.5 h-2.5 rounded-full border-2 bg-[#0B0D0C] ${
                  isAttemptSuccess
                    ? 'border-[#059669] bg-[#059669]'
                    : attempt.status === 'skipped'
                    ? 'border-[#B9B0A0] bg-[#151715]'
                    : 'border-[#C83C3C] bg-[#C83C3C]'
                }`}
              />

              {/* Card Container */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  isAttemptSuccess
                    ? 'bg-[#151715] border-[#059669]/30 shadow-sm'
                    : attempt.status === 'skipped'
                    ? 'bg-[#151715]/60 border-[rgba(185,176,160,0.1)] opacity-85'
                    : 'bg-[#151715] border-[rgba(185,176,160,0.12)] hover:border-[rgba(200,60,60,0.3)]'
                }`}
              >
                {/* Header: Provider, Model, Stage, and Status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-[#B9B0A0] px-1.5 py-0.5 rounded bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)]">
                      {isPrimary ? 'Candidate 1 (Primary)' : `Candidate ${index + 1} (Fallback)`}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md border ${providerMeta.badgeClass}`}
                    >
                      {providerMeta.displayName}
                    </span>
                    <span className="text-xs font-mono text-[#F5F0E6]">
                      {attempt.model || providerMeta.defaultModel}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {typeof attempt.durationMs === 'number' && (
                      <span className="text-[11px] font-mono text-[#B9B0A0]">
                        {attempt.durationMs}ms
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusInfo.badgeClass}`}
                    >
                      <StatusIcon className={`w-3 h-3 ${statusInfo.iconColor}`} aria-hidden="true" />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>
                </div>

                {/* Sanitized Error or Reason Callout */}
                {sanitizedError && (
                  <div className="mt-2.5 pt-2 border-t border-[rgba(185,176,160,0.06)] text-[11px] font-mono">
                    <div
                      className={`p-2 rounded-lg border ${
                        attempt.status === 'skipped'
                          ? 'bg-[#0B0D0C] border-[rgba(185,176,160,0.1)] text-[#B9B0A0]'
                          : attempt.status === 404 || attempt.modelUnavailable
                          ? 'bg-[#252419]/50 border-[rgba(229,180,91,0.25)] text-[#E5B45B]'
                          : 'bg-[#C83C3C]/10 border-[#C83C3C]/20 text-[#C83C3C]'
                      }`}
                    >
                      <span className="font-semibold block text-[10px] uppercase tracking-wider mb-0.5 opacity-80">
                        {attempt.status === 'skipped'
                          ? 'Skip Justification:'
                          : attempt.status === 404
                          ? 'Upstream Model Deprecation Notice:'
                          : 'Diagnostic Detail:'}
                      </span>
                      <p className="whitespace-pre-wrap break-words max-h-36 overflow-y-auto">{sanitizedError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
