import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Activity, 
  Zap, 
  Send, 
  Sparkles, 
  Globe, 
  GitBranch,
  ChevronRight,
  RotateCw,
  Copy,
  Check,
  Download
} from 'lucide-react';
import FailoverCascadeViewer from './FailoverCascadeViewer';
import AiProviderAttemptsViewer, { sanitizeErrorText, deepSanitizeExportObject } from './AiProviderAttemptsViewer';

const typeIcons = {
  trigger: Zap,
  action: Activity,
  condition: GitBranch,
  ai: Sparkles,
  api: Globe,
  output: Send,
};

export default function ExecutionResultModal({ isOpen, onClose, execution, error, onRerun, isRerunning = false }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTabs, setActiveTabs] = useState({});

  if (!isOpen) return null;

  const isSuccess = execution?.status === 'succeeded';
  const nodeExecutions = execution?.nodeExecutions || [];

  const handleCopy = (key, data) => {
    try {
      const sanitized = deepSanitizeExportObject(data);
      const text = typeof sanitized === 'object' ? JSON.stringify(sanitized, null, 2) : String(sanitized ?? '');
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleExportTraceJson = () => {
    if (!execution) return;
    try {
      const exportData = {
        _exportMetadata: {
          platform: 'FlowForge AI',
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        },
        execution: {
          id: execution._id,
          status: execution.status,
          triggerSource: execution.triggerSource,
          triggerData: execution.triggerData,
          rerunFrom: execution.rerunFrom || null,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          durationMs: execution.durationMs,
          error: execution.error || null,
          nodeExecutions: execution.nodeExecutions || []
        }
      };

      const sanitizedExportData = deepSanitizeExportObject(exportData);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sanitizedExportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `flowforge-trace-${execution._id?.slice(-8) || 'run'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export trace JSON:', err);
    }
  };

  // Detect whether any AI node triggered multi-provider failover
  const failoverStep = nodeExecutions.find(
    (s) => Array.isArray(s.output?.failoverLog) && s.output.failoverLog.length > 1
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D0C]/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="max-w-2xl w-full max-h-[85vh] rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.18)] shadow-2xl shadow-inner-highlight flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[rgba(185,176,160,0.08)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                isSuccess
                  ? 'bg-[#059669]/15 border-[#059669]/30 text-[#059669]'
                  : 'bg-[#C83C3C]/15 border-[#C83C3C]/30 text-[#C83C3C]'
              }`}
            >
              {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#F5F0E6]">
                  {isSuccess ? 'Pipeline Executed Successfully' : 'Pipeline Execution Halted'}
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isSuccess
                      ? 'bg-[#059669]/15 text-[#059669] border-[#059669]/30'
                      : 'bg-[#C83C3C]/15 text-[#C83C3C] border-[#C83C3C]/30'
                  }`}
                >
                  {execution?.status || 'Error'}
                </span>
              </div>
              <p className="text-xs text-[#B9B0A0] mt-0.5 font-mono">
                Run ID: {execution?._id || 'N/A'} • Duration: {execution?.durationMs ?? 0}ms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#0B0D0C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Error Banner if any */}
          {(execution?.error || error) && (
            <div className="p-3.5 rounded-xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 flex items-start space-x-2.5 text-xs text-[#C83C3C]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block">Execution Halt Reason:</span>
                <span>{execution?.error || error}</span>
              </div>
            </div>
          )}

          {/* Top Failover Recovery Callout Banner if failover occurred */}
          {failoverStep && isSuccess && (
            <div className="p-3.5 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.3)] shadow-glow-gold flex items-center justify-between text-xs text-[#E5B45B]">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-[#E5B45B] motion-safe:animate-pulse flex-shrink-0" />
                <div>
                  <span className="font-bold block text-[#F5F0E6]">
                    Automatic Multi-Provider Failover Triggered
                  </span>
                  <span className="text-[11px] text-[#B9B0A0]">
                    AI node encountered upstream outage/deprecation and automatically recovered via{' '}
                    <strong className="text-[#059669]">
                      {failoverStep.output?.provider?.toUpperCase() || 'FALLBACK PROVIDER'}
                    </strong>
                    .
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#E5B45B] bg-[#151715] px-2.5 py-1 rounded-md border border-[rgba(229,180,91,0.25)] flex-shrink-0">
                {failoverStep.output.failoverLog.length} Cascade Attempts
              </span>
            </div>
          )}

          {/* Node Step Telemetry */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#B9B0A0]">
              Step Telemetry ({nodeExecutions.length} {nodeExecutions.length === 1 ? 'Step' : 'Steps'})
            </h4>

            {nodeExecutions.length === 0 ? (
              <p className="text-xs text-[#B9B0A0]/60 italic py-2">
                No step traces available. Graph validation halted execution before node dispatch.
              </p>
            ) : (
              <div className="space-y-2.5">
                {nodeExecutions.map((step, idx) => {
                  const Icon = typeIcons[step.nodeType] || Activity;
                  const stepSuccess = step.status === 'succeeded';
                  const stepFailed = step.status === 'failed';
                  const failoverLog = step.output?.failoverLog || null;

                  return (
                    <div
                      key={step.nodeId || idx}
                      className="p-3.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex flex-col space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.15)] flex items-center justify-center text-[#E5B45B]">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#F5F0E6] block">
                              {step.nodeLabel || step.nodeId}
                            </span>
                            <span className="text-[10px] text-[#B9B0A0] uppercase tracking-wider">
                              {step.nodeType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-mono text-[#B9B0A0]">
                            {step.durationMs}ms
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              stepSuccess
                                ? 'bg-[#059669]/15 text-[#059669] border-[#059669]/30'
                                : stepFailed
                                ? 'bg-[#C83C3C]/15 text-[#C83C3C] border-[#C83C3C]/30'
                                : 'bg-[#151715] text-[#B9B0A0]/60 border-[rgba(185,176,160,0.1)]'
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>
                      </div>

                      {/* AI Provider Attempts & Failover Visualizer */}
                      {(step.nodeType === 'ai' || Boolean(step.output?.failoverLog || step.input?.failoverLog)) && (
                        <div className="mt-1">
                          <AiProviderAttemptsViewer step={step} />
                        </div>
                      )}

                      {/* Error explanation if failed */}
                      {step.error && (
                        <div className="text-[11px] text-[#C83C3C] bg-[#C83C3C]/5 border border-[#C83C3C]/20 p-2.5 rounded-lg font-mono">
                          <span className="font-bold block mb-0.5">Step Error:</span>
                          {sanitizeErrorText(step.error)}
                        </div>
                      )}

                      {/* Skipped indicator */}
                      {step.status === 'skipped' && (
                        <div className="text-[11px] text-[#B9B0A0] bg-[rgba(185,176,160,0.06)] border border-[rgba(185,176,160,0.15)] p-2.5 rounded-lg">
                          <span className="font-semibold text-[#F5F0E6]">Step Skipped:</span> Branch condition not met or node was bypassed.
                        </div>
                      )}

                      {/* Step Inspector (Output & Input & Cascade) */}
                      {(step.output || step.input || step.nodeType === 'ai') && (
                        <div className="space-y-2 pt-1">
                          {/* Tab Header if multiple tabs are present */}
                          <div className="flex items-center justify-between border-b border-[rgba(185,176,160,0.08)] pb-1">
                            <div className="flex items-center space-x-1">
                              {step.output && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTabs((prev) => ({ ...prev, [idx]: 'output' }))}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                                    (activeTabs[idx] || 'output') === 'output'
                                      ? 'bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.3)]'
                                      : 'bg-[#151715] text-[#B9B0A0] hover:text-[#F5F0E6]'
                                  }`}
                                >
                                  Output
                                </button>
                              )}
                              {step.input && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTabs((prev) => ({ ...prev, [idx]: 'input' }))}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                                    activeTabs[idx] === 'input'
                                      ? 'bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.3)]'
                                      : 'bg-[#151715] text-[#B9B0A0] hover:text-[#F5F0E6]'
                                  }`}
                                >
                                  Input
                                </button>
                              )}
                              {(step.nodeType === 'ai' || Boolean(step.output?.failoverLog || step.input?.failoverLog)) && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTabs((prev) => ({ ...prev, [idx]: 'cascade' }))}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                                    activeTabs[idx] === 'cascade'
                                      ? 'bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.3)]'
                                      : 'bg-[#151715] text-[#B9B0A0] hover:text-[#F5F0E6]'
                                  }`}
                                >
                                  Cascade JSON
                                </button>
                              )}
                            </div>

                            {/* Copy button */}
                            {((activeTabs[idx] === 'input' ? step.input : activeTabs[idx] === 'cascade' ? (step.output?.failoverLog || step.output?.telemetry) : step.output)) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const currentTab = activeTabs[idx] || 'output';
                                  const targetData = currentTab === 'input' 
                                    ? step.input 
                                    : currentTab === 'cascade'
                                    ? (step.output?.failoverLog || step.output?.telemetry || { provider: step.output?.provider || 'gemini', status: step.status })
                                    : step.output;
                                  handleCopy(`${idx}-${currentTab}`, targetData);
                                }}
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#B9B0A0] hover:text-[#E5B45B] bg-[#151715] hover:bg-[#1a1d1a] border border-[rgba(185,176,160,0.1)] transition-colors"
                                title="Copy JSON to clipboard"
                              >
                                {copiedKey === `${idx}-${activeTabs[idx] || 'output'}` ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 text-[#059669]" />
                                    <span className="text-[#059669]">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5" />
                                    <span>Copy JSON</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Tab Panel */}
                          {(activeTabs[idx] || 'output') === 'output' && step.output && (
                            <div className="text-[10px] text-[#B9B0A0] bg-[#151715] p-2.5 rounded-lg font-mono space-y-1.5">
                              {step.output.text && (
                                <div className="text-[#F5F0E6] font-sans text-xs">
                                  <span className="text-[10px] font-mono text-[#B9B0A0] uppercase block mb-0.5">
                                    AI Response Preview:
                                  </span>
                                  <p className="line-clamp-3 bg-[#0B0D0C] p-2 rounded border border-[rgba(185,176,160,0.08)]">
                                    {step.output.text}
                                  </p>
                                </div>
                              )}

                              {step.output.structured && (
                                <div>
                                  <span className="text-[10px] font-mono text-[#059669] uppercase block mb-0.5">
                                    Structured Data (JSON):
                                  </span>
                                  <pre className="text-[10px] text-[#059669] bg-[#0B0D0C] p-2 rounded border border-[rgba(185,176,160,0.08)] overflow-x-auto max-h-32">
                                    {JSON.stringify(step.output.structured, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {!step.output.text && !step.output.structured && !failoverLog && (
                                <pre className="text-[10px] text-[#F5F0E6] bg-[#0B0D0C] p-2 rounded border border-[rgba(185,176,160,0.08)] overflow-x-auto max-h-32">
                                  {JSON.stringify(step.output, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}

                          {activeTabs[idx] === 'input' && step.input && (
                            <pre className="text-[10px] text-[#B9B0A0] bg-[#151715] p-2.5 rounded-lg font-mono overflow-x-auto max-h-32 border border-[rgba(185,176,160,0.08)]">
                              {JSON.stringify(step.input, null, 2)}
                            </pre>
                          )}

                          {activeTabs[idx] === 'cascade' && (
                            <div className="p-2.5 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.08)] space-y-1.5">
                              <span className="text-[10px] font-mono text-[#E5B45B] uppercase block font-semibold">
                                Provider Attempt Log
                              </span>
                              <pre className="text-[10px] font-mono text-[#F5F0E6] overflow-x-auto max-h-32">
                                {JSON.stringify(step.output?.failoverLog || step.output?.telemetry || { provider: step.output?.provider || 'gemini', status: step.status }, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[rgba(185,176,160,0.08)] bg-[#0B0D0C] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {onRerun && (
              <button
                onClick={onRerun}
                disabled={isRerunning}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E5B45B] to-[#D49E3F] text-[#0B0D0C] font-semibold text-xs hover:shadow-glow-gold transition-all disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRerunning ? 'motion-safe:animate-spin' : ''}`} />
                <span>{isRerunning ? 'Rerunning...' : 'Rerun Pipeline'}</span>
              </button>
            )}

            {execution && (
              <button
                onClick={handleExportTraceJson}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#151715] hover:bg-[#1a1d1a] border border-[rgba(185,176,160,0.18)] text-xs font-semibold text-[#F5F0E6] hover:text-[#E5B45B] transition-colors"
                title="Download complete JSON execution trace"
              >
                <Download className="w-3.5 h-3.5 text-[#E5B45B]" />
                <span className="hidden sm:inline">Export JSON</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#151715] hover:bg-[#252419] text-[#F5F0E6] hover:text-[#E5B45B] border border-[rgba(185,176,160,0.16)] text-xs font-semibold transition-colors"
          >
            Close Telemetry
          </button>
        </div>
      </div>
    </div>
  );
}
