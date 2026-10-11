import React from 'react';
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
  ChevronRight
} from 'lucide-react';

const typeIcons = {
  trigger: Zap,
  action: Activity,
  condition: GitBranch,
  ai: Sparkles,
  api: Globe,
  output: Send,
};

export default function ExecutionResultModal({ isOpen, onClose, execution, error }) {
  if (!isOpen) return null;

  const isSuccess = execution?.status === 'succeeded';
  const nodeExecutions = execution?.nodeExecutions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D0C]/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="max-w-2xl w-full max-h-[85vh] rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.18)] shadow-2xl flex flex-col overflow-hidden">
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
              <div className="space-y-2">
                {nodeExecutions.map((step, idx) => {
                  const Icon = typeIcons[step.nodeType] || Activity;
                  const stepSuccess = step.status === 'succeeded';
                  const stepFailed = step.status === 'failed';

                  return (
                    <div
                      key={step.nodeId || idx}
                      className="p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex flex-col space-y-2"
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

                      {/* Error explanation if failed */}
                      {step.error && (
                        <div className="text-[11px] text-[#C83C3C] bg-[#C83C3C]/5 border border-[#C83C3C]/20 p-2 rounded-lg font-mono">
                          {step.error}
                        </div>
                      )}

                      {/* Output preview if succeeded */}
                      {step.output && (
                        <div className="text-[10px] text-[#B9B0A0] bg-[#151715] p-2 rounded-lg font-mono truncate">
                          Output: {JSON.stringify(step.output)}
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
        <div className="p-4 border-t border-[rgba(185,176,160,0.08)] bg-[#0B0D0C] flex justify-end">
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
