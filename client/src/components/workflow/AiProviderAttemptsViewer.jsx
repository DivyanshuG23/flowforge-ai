import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Key, 
  ShieldCheck, 
  Server, 
  Layers,
  Info,
  Zap
} from 'lucide-react';

/**
 * Strict client-side redaction of secrets, API keys, and bearer tokens
 */
export const sanitizeErrorText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/AIza[0-9A-Za-z_-]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{20,}/g, '[REDACTED_GROQ_KEY]')
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/(?:key|secret|apiKey|api_key|token)[=:]\s*['"]?[A-Za-z0-9\-._~+/]{8,}['"]?/gi, (m) => {
      const prefix = m.split(/[=:]/)[0];
      return `${prefix}=[REDACTED]`;
    })
    .replace(/Bearer\s+[0-9A-Za-z_.\-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:key|apiKey|api_key)=)[^&\s]+/gi, '$1[REDACTED]');
};

/**
 * Recursively scrubs all sensitive secrets, credentials, tokens, and API keys from an export payload
 */
export const deepSanitizeExportObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return sanitizeErrorText(obj);
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSanitizeExportObject);
  }
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('secret') || 
        lower.includes('apikey') || 
        lower.includes('api_key') || 
        lower.includes('authorization') || 
        lower.includes('password') ||
        lower.includes('token')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = deepSanitizeExportObject(val);
      }
    }
    return sanitized;
  }
  return obj;
};

/**
 * Maps provider identifier to display label and styling
 */
const PROVIDER_METADATA = {
  gemini: {
    name: 'Google Gemini',
    badgeClass: 'text-[#E5B45B] bg-[#E5B45B]/10 border-[#E5B45B]/30',
    tag: 'Gemini'
  },
  groq: {
    name: 'Groq LPU',
    badgeClass: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
    tag: 'Groq'
  },
  openai: {
    name: 'OpenAI',
    badgeClass: 'text-[#059669] bg-[#059669]/10 border-[#059669]/30',
    tag: 'OpenAI'
  },
  mistral: {
    name: 'Mistral AI',
    badgeClass: 'text-[#60A5FA] bg-[#60A5FA]/10 border-[#60A5FA]/30',
    tag: 'Mistral'
  }
};

/**
 * AiProviderAttemptsViewer
 * Visualizes multi-provider AI fallback attempts, skipping indicators, and outcomes.
 */
export default function AiProviderAttemptsViewer({ step, compact = false }) {
  if (!step) return null;

  // Extract telemetry and failoverLog from all possible node execution locations
  const output = step.output || {};
  const input = step.input || {};
  const telemetry = output.telemetry || input.telemetry || (typeof input === 'object' && input.failoverLog ? input : null) || {};

  const failoverLog = Array.isArray(output.failoverLog)
    ? output.failoverLog
    : Array.isArray(input.failoverLog)
      ? input.failoverLog
      : Array.isArray(telemetry.failoverLog)
        ? telemetry.failoverLog
        : null;

  const isAiNode = step.nodeType === 'ai' || Boolean(failoverLog || output.provider || input.provider || telemetry.primaryProvider);
  if (!isAiNode) return null;

  const isSuccess = step.status === 'succeeded';
  const primaryProvider = (
    telemetry.primaryProvider || 
    output.provider || 
    input.provider || 
    (failoverLog && failoverLog[0]?.provider) || 
    'gemini'
  ).toLowerCase();

  const finalProvider = (
    output.provider || 
    telemetry.finalProvider || 
    (failoverLog && failoverLog.find(f => f.success)?.provider) || 
    primaryProvider
  ).toLowerCase();

  const finalModel = output.model || telemetry.finalModel || (failoverLog && failoverLog.find(f => f.success)?.model) || null;
  const failoverTriggered = telemetry.failoverTriggered ?? (Array.isArray(failoverLog) && failoverLog.length > 1 && failoverLog.some((f, idx) => idx > 0 && f.success));
  const hasFailoverLog = Array.isArray(failoverLog) && failoverLog.length > 0;

  // Determine Overall Failover Status Mode
  let statusMode = 'single_provider';
  if (hasFailoverLog) {
    if (failoverLog.length === 1 && failoverLog[0].success) {
      statusMode = 'primary_success';
    } else if (failoverTriggered && isSuccess) {
      statusMode = 'failover_resolved';
    } else if (!isSuccess) {
      statusMode = 'cascade_failed';
    } else {
      statusMode = 'multi_attempt';
    }
  } else if (input.enableFailover === false || output.enableFailover === false || telemetry.enableFailover === false) {
    statusMode = 'failover_disabled';
  } else {
    statusMode = 'legacy_record';
  }

  const primaryMeta = PROVIDER_METADATA[primaryProvider] || { name: primaryProvider, badgeClass: 'text-[#E5B45B] bg-[#252419]', tag: primaryProvider };
  const finalMeta = PROVIDER_METADATA[finalProvider] || { name: finalProvider, badgeClass: 'text-[#E5B45B] bg-[#252419]', tag: finalProvider };

  return (
    <div className="space-y-3 font-sans select-text">
      {/* 1. Header: Primary Provider & Failover Resolution State */}
      <div className="p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.12)] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#B9B0A0]">
              Primary Provider:
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${primaryMeta.badgeClass}`}>
              {primaryMeta.name}
            </span>
          </div>

          {/* Outcome Status Pill */}
          {statusMode === 'primary_success' && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#059669]/15 text-[#059669] border border-[#059669]/30 text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-[#059669]" />
              <span>Primary Succeeded (Fallback Not Needed)</span>
            </span>
          )}

          {statusMode === 'failover_resolved' && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#E5B45B]/15 text-[#E5B45B] border border-[#E5B45B]/30 text-[10px] font-bold shadow-glow-gold/10">
              <Zap className="w-3 h-3 text-[#E5B45B]" />
              <span>Failover Resolved via {finalMeta.name}</span>
            </span>
          )}

          {statusMode === 'cascade_failed' && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#C83C3C]/15 text-[#C83C3C] border border-[#C83C3C]/30 text-[10px] font-bold">
              <AlertCircle className="w-3 h-3 text-[#C83C3C]" />
              <span>Cascade Exhausted (All Configured Providers Failed)</span>
            </span>
          )}

          {statusMode === 'failover_disabled' && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#151715] text-[#B9B0A0] border border-[rgba(185,176,160,0.2)] text-[10px] font-medium">
              <ShieldCheck className="w-3 h-3 text-[#B9B0A0]" />
              <span>Single-Provider Mode (Failover Disabled)</span>
            </span>
          )}

          {statusMode === 'legacy_record' && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#151715] text-[#B9B0A0] border border-[rgba(185,176,160,0.15)] text-[10px] font-medium">
              <Info className="w-3 h-3 text-[#B9B0A0]/60" />
              <span>Legacy Execution Record</span>
            </span>
          )}
        </div>

        {/* Narrative Description */}
        <p className="text-[11px] text-[#B9B0A0] leading-relaxed">
          {statusMode === 'primary_success' && (
            <>Primary provider responded successfully on attempt 1. Downstream failover cascade was kept on standby.</>
          )}
          {statusMode === 'failover_resolved' && (
            <>Initial provider encountered a transient error or model retirement. Automatic failover safely cascaded through configured providers and recovered on <strong className="text-[#E5B45B]">{finalMeta.name}</strong> ({finalModel || 'active model'}).</>
          )}
          {statusMode === 'cascade_failed' && (
            <>All candidate AI providers in the failover cascade were attempted or skipped without successful completion.</>
          )}
          {statusMode === 'failover_disabled' && (
            <>Multi-provider failover was disabled on this node. Execution ran strictly against the primary provider with no fallback attempts.</>
          )}
          {statusMode === 'legacy_record' && (
            <>Detailed attempt-by-attempt telemetry was not recorded for this execution. Response completed via {finalMeta.name}.</>
          )}
        </p>
      </div>

      {/* 2. Detailed Attempt-by-Attempt Timeline */}
      {hasFailoverLog ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#B9B0A0] tracking-wider px-1">
            <span>Provider Cascade Attempts ({failoverLog.length})</span>
            <span>Outcome & Latency</span>
          </div>

          <div className="space-y-2">
            {failoverLog.map((attempt, index) => {
              const isFirst = index === 0;
              const providerKey = (attempt.provider || '').toLowerCase();
              const meta = PROVIDER_METADATA[providerKey] || { name: attempt.provider || 'AI Provider', badgeClass: 'text-[#E5B45B] bg-[#252419]', tag: attempt.provider };
              const isSkipped = attempt.status === 'skipped' || attempt.status === 'missing_credentials';
              const isSuccessAttempt = attempt.success === true || attempt.status === 200;

              return (
                <div
                  key={`${attempt.provider}-${index}`}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isSuccessAttempt
                      ? 'bg-[#059669]/5 border-[#059669]/30 text-[#F5F0E6]'
                      : isSkipped
                        ? 'bg-[#151715]/60 border-[rgba(185,176,160,0.1)] text-[#B9B0A0]'
                        : 'bg-[#C83C3C]/5 border-[#C83C3C]/30 text-[#F5F0E6]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    {/* Left: Attempt Number, Tag, Provider & Model */}
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-[#151715] border border-[rgba(185,176,160,0.2)] flex items-center justify-center font-mono text-[10px] text-[#B9B0A0]">
                        {index + 1}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${meta.badgeClass}`}>
                        {meta.tag}
                      </span>
                      <span className="text-[11px] font-semibold text-[#F5F0E6]">
                        {meta.name}
                      </span>
                      {attempt.model && (
                        <span className="text-[10px] font-mono text-[#B9B0A0]/80 hidden sm:inline">
                          ({attempt.model})
                        </span>
                      )}
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#151715] text-[#B9B0A0] border border-[rgba(185,176,160,0.12)]">
                        {isFirst ? 'Primary' : 'Fallback'}
                      </span>
                    </div>

                    {/* Right: Status Pill & Duration */}
                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                      {isSuccessAttempt ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#059669]/20 text-[#059669] text-[10px] font-bold border border-[#059669]/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>200 OK</span>
                        </span>
                      ) : isSkipped ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[rgba(185,176,160,0.1)] text-[#B9B0A0] text-[10px] font-medium border border-[rgba(185,176,160,0.2)]">
                          <Key className="w-3 h-3 text-[#E5B45B]" />
                          <span>Skipped (No API Key)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#C83C3C]/20 text-[#C83C3C] text-[10px] font-bold border border-[#C83C3C]/30">
                          <AlertCircle className="w-3 h-3" />
                          <span>
                            {typeof attempt.status === 'number'
                              ? `HTTP ${attempt.status}`
                              : attempt.status || 'Failed'}
                          </span>
                        </span>
                      )}

                      {/* Latency */}
                      <span className="text-[10px] font-mono text-[#B9B0A0]">
                        {isSkipped ? '—' : `${attempt.durationMs ?? 0}ms`}
                      </span>
                    </div>
                  </div>

                  {/* Sanitized Reason or Error Callout */}
                  {(attempt.error || attempt.reason) && (
                    <div className="mt-2 pt-2 border-t border-[rgba(185,176,160,0.08)] text-[10px] font-mono leading-relaxed">
                      {isSkipped ? (
                        <div className="flex items-center space-x-1.5 text-[#B9B0A0]">
                          <Info className="w-3 h-3 text-[#E5B45B] flex-shrink-0" />
                          <span>{sanitizeErrorText(attempt.reason || attempt.error)}</span>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-[#0B0D0C] border border-[#C83C3C]/20 text-[#C83C3C] break-words whitespace-pre-wrap">
                          <span className="font-bold text-[9px] uppercase tracking-wider text-[#C83C3C]/80 block mb-0.5">Attempt Error:</span>
                          {sanitizeErrorText(attempt.error)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-xs space-y-2">
          <div className="flex items-center justify-between text-[#B9B0A0]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Configured Engine:</span>
            <span className="font-mono text-[#F5F0E6] text-[11px] font-semibold">
              {primaryMeta.name} {output.model || input.model ? `(${output.model || input.model})` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#B9B0A0] pt-1.5 border-t border-[rgba(185,176,160,0.06)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Failover Policy:</span>
            <span className="font-mono text-[11px] text-[#B9B0A0]">
              {statusMode === 'failover_disabled' ? 'Disabled (Strict Single Provider)' : 'Not Recorded (Legacy Execution)'}
            </span>
          </div>
          {step.durationMs !== undefined && (
            <div className="flex items-center justify-between text-[#B9B0A0] pt-1.5 border-t border-[rgba(185,176,160,0.06)]">
              <span className="text-[10px] uppercase font-bold tracking-wider">Step Latency:</span>
              <span className="font-mono text-[#E5B45B] text-[11px]">
                {step.durationMs}ms
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Final Safe Failure Summary (When Step Failed) */}
      {!isSuccess && step.error && (
        <div className="p-3 rounded-xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 space-y-1.5">
          <div className="flex items-center space-x-1.5 text-[#C83C3C] text-xs font-bold uppercase tracking-wider">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Final Execution Error</span>
          </div>
          <p className="text-[11px] font-mono text-[#C83C3C] leading-snug break-words">
            {sanitizeErrorText(step.error)}
          </p>
        </div>
      )}
    </div>
  );
}
