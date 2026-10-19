import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Zap, 
  Activity, 
  GitBranch, 
  Sparkles, 
  Globe, 
  Send,
  Sliders,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  Loader2,
  Clock
} from 'lucide-react';

const nodeConfigs = {
  trigger: {
    label: 'TRIGGER',
    slug: 'TRIGGER // ENTRY',
    icon: Zap,
    railColor: 'bg-[#E5B45B]',
    badgeColor: 'text-[#E5B45B] bg-[#252419] border-[rgba(229,180,91,0.3)]',
    iconColor: 'text-[#E5B45B]',
    borderDefault: 'border-[rgba(229,180,91,0.25)]',
    defaultTitle: 'Webhook Trigger',
    defaultDesc: 'Listens for incoming HTTP events',
    hasTarget: false,
    hasSource: true,
  },
  action: {
    label: 'ACTION',
    slug: 'PROCESS // TRANSFORM',
    icon: Activity,
    railColor: 'bg-[#D8D1C3]',
    badgeColor: 'text-[#F5F0E6] bg-[#1C1F1C] border-[rgba(185,176,160,0.2)]',
    iconColor: 'text-[#F5F0E6]',
    borderDefault: 'border-[rgba(185,176,160,0.18)]',
    defaultTitle: 'Data Transform',
    defaultDesc: 'Normalizes and formats event payload',
    hasTarget: true,
    hasSource: true,
  },
  condition: {
    label: 'CONDITION',
    slug: 'BRANCH // EVALUATOR',
    icon: GitBranch,
    railColor: 'bg-[#059669]',
    badgeColor: 'text-[#059669] bg-[#059669]/15 border-[#059669]/30',
    iconColor: 'text-[#059669]',
    borderDefault: 'border-[#059669]/30',
    defaultTitle: 'Rule Evaluator',
    defaultDesc: 'Branches execution based on conditions',
    hasTarget: true,
    isCondition: true,
  },
  ai: {
    label: 'AI AGENT',
    slug: 'AI // REASONING',
    icon: Sparkles,
    railColor: 'bg-[#8B5CF6]',
    badgeColor: 'text-[#E5B45B] bg-[#252419] border-[rgba(229,180,91,0.3)]',
    iconColor: 'text-[#E5B45B]',
    borderDefault: 'border-[rgba(229,180,91,0.35)]',
    defaultTitle: 'AI Anomaly Triage',
    defaultDesc: 'Analyzes traces with LLM reasoning',
    hasTarget: true,
    hasSource: true,
  },
  api: {
    label: 'API REQUEST',
    slug: 'NETWORK // HTTP',
    icon: Globe,
    railColor: 'bg-[#06B6D4]',
    badgeColor: 'text-[#06B6D4] bg-[#06B6D4]/15 border-[#06B6D4]/30',
    iconColor: 'text-[#06B6D4]',
    borderDefault: 'border-[rgba(185,176,160,0.2)]',
    defaultTitle: 'HTTP Call',
    defaultDesc: 'Dispatches payload to external endpoint',
    hasTarget: true,
    hasSource: true,
  },
  output: {
    label: 'OUTPUT',
    slug: 'TERMINAL // COMMIT',
    icon: Send,
    railColor: 'bg-[#059669]',
    badgeColor: 'text-[#059669] bg-[#059669]/15 border-[#059669]/30',
    iconColor: 'text-[#059669]',
    borderDefault: 'border-[#059669]/30',
    defaultTitle: 'Return Response',
    defaultDesc: 'Finalizes execution and commits state',
    hasTarget: true,
    hasSource: false,
  },
};

function CustomNode({ data, selected, isConnectable }) {
  const nodeType = data.type || 'action';
  const config = nodeConfigs[nodeType] || nodeConfigs.action;
  const Icon = config.icon;

  const title = data.label || config.defaultTitle;
  const runtimeStatus = data.runtimeStatus;
  const runtimeDurationMs = data.runtimeDurationMs;
  const runtimeError = data.runtimeError;
  const runtimeOutput = data.runtimeOutput;
  const isFailoverRecovered = Array.isArray(runtimeOutput?.failoverLog) && runtimeOutput.failoverLog.length > 1 && runtimeStatus === 'succeeded';

  const subtitle = 
    nodeType === 'api' && (data.url || data.endpoint)
      ? `${(data.method || 'GET').toUpperCase()} ${data.url || data.endpoint}`
      : nodeType === 'condition' && data.field
      ? `If ${data.field} ${data.operator || 'equals'}${data.value !== undefined && data.value !== '' ? ` "${data.value}"` : ''}`
      : nodeType === 'ai' && (data.model || data.prompt)
      ? isFailoverRecovered
        ? `${data.provider || 'gemini'} ➔ ${runtimeOutput.provider} (${runtimeOutput.model || data.model})`
        : `${data.model || 'gemini-3.8-flash'} • ${data.outputFormat === 'json' ? 'JSON' : 'Text'}${data.prompt ? ` • ${data.prompt.slice(0, 18)}${data.prompt.length > 18 ? '...' : ''}` : ''}`
      : nodeType === 'action' && data.operation
      ? data.operation === 'transform' ? 'JSON Transformation' : data.operation === 'filter' ? 'Field Extraction' : 'Passthrough'
      : nodeType === 'output' && data.target
      ? data.target
      : data.description || config.defaultDesc;

  // Determine container styling based on runtime telemetry and selection
  let containerBorderClass = `${config.borderDefault} hover:border-[rgba(229,180,91,0.4)] hover:shadow-card-dark`;
  if (runtimeStatus === 'succeeded') {
    containerBorderClass = `border-[#059669] shadow-lg shadow-[#059669]/15 ${
      selected ? 'ring-2 ring-[#059669]/50 scale-[1.02]' : ''
    }`;
  } else if (runtimeStatus === 'failed') {
    containerBorderClass = `border-[#C83C3C] shadow-lg shadow-[#C83C3C]/20 ${
      selected ? 'ring-2 ring-[#C83C3C]/50 scale-[1.02]' : ''
    }`;
  } else if (runtimeStatus === 'skipped') {
    containerBorderClass = `border-[rgba(185,176,160,0.35)] border-dashed opacity-80 ${
      selected ? 'ring-1 ring-[rgba(185,176,160,0.5)] scale-[1.02]' : ''
    }`;
  } else if (runtimeStatus === 'running') {
    containerBorderClass = `border-[#E5B45B] shadow-glow-gold motion-safe:animate-pulse ${
      selected ? 'ring-2 ring-[#E5B45B]/60 scale-[1.02]' : ''
    }`;
  } else if (runtimeStatus === 'queued' || runtimeStatus === 'pending') {
    containerBorderClass = `border-[rgba(185,176,160,0.25)] ${
      selected ? 'ring-1 ring-[rgba(185,176,160,0.4)] scale-[1.02]' : ''
    }`;
  } else if (selected) {
    containerBorderClass = 'border-[#E5B45B] shadow-glow-gold ring-1 ring-[#E5B45B]/40 scale-[1.02]';
  }

  return (
    <div
      className={`relative w-68 rounded-2xl bg-[#141714] border p-4 shadow-xl shadow-inner-highlight transition-all duration-200 select-none ${containerBorderClass}`}
    >
      {/* Left Colored Hardware Accent Rail */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${config.railColor}`} />

      {/* Target Handle (Left) */}
      {config.hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="!w-3.5 !h-3.5 !-left-2 !bg-[#E5B45B] !border-2 !border-[#0B0D0C] hover:!scale-125 !transition-transform !shadow-sm"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[rgba(185,176,160,0.1)]">
        <div className="flex items-center space-x-2 pl-1.5">
          <div className={`w-7 h-7 rounded-lg bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center ${config.iconColor} shadow-sm`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B9B0A0]">
            {config.slug}
          </span>
        </div>

        {/* Runtime Status Badge */}
        {runtimeStatus === 'succeeded' ? (
          isFailoverRecovered ? (
            <span className="flex items-center space-x-1 text-[10px] text-[#059669] font-mono font-bold bg-[#059669]/10 px-2 py-0.5 rounded-full border border-[#059669]/30">
              <Sparkles className="w-3 h-3 text-[#E5B45B]" />
              <span>Cascade OK</span>
              {runtimeDurationMs !== undefined && (
                <span className="text-[9px] font-mono text-[#059669]/80 font-normal">
                  {runtimeDurationMs}ms
                </span>
              )}
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-[10px] text-[#059669] font-mono font-bold bg-[#059669]/10 px-2 py-0.5 rounded-full border border-[#059669]/30">
              <CheckCircle2 className="w-3 h-3 text-[#059669]" />
              <span>Passed</span>
              {runtimeDurationMs !== undefined && (
                <span className="text-[9px] font-mono text-[#059669]/80 font-normal">
                  {runtimeDurationMs}ms
                </span>
              )}
            </span>
          )
        ) : runtimeStatus === 'failed' ? (
          <span className="flex items-center space-x-1 text-[10px] text-[#C83C3C] font-mono font-bold bg-[#C83C3C]/10 px-2 py-0.5 rounded-full border border-[#C83C3C]/30 motion-safe:animate-pulse">
            <AlertCircle className="w-3 h-3 text-[#C83C3C]" />
            <span>Failed</span>
            {runtimeDurationMs !== undefined && (
              <span className="text-[9px] font-mono text-[#C83C3C]/80 font-normal">
                {runtimeDurationMs}ms
              </span>
            )}
          </span>
        ) : runtimeStatus === 'skipped' ? (
          <span className="flex items-center space-x-1 text-[10px] text-[#B9B0A0] font-mono font-medium bg-[#151715] px-2 py-0.5 rounded-full border border-[rgba(185,176,160,0.2)]">
            <SkipForward className="w-3 h-3 text-[#B9B0A0]" />
            <span>Skipped</span>
          </span>
        ) : runtimeStatus === 'running' ? (
          <span className="flex items-center space-x-1 text-[10px] text-[#E5B45B] font-mono font-bold bg-[#252419] px-2 py-0.5 rounded-full border border-[rgba(229,180,91,0.3)]">
            <Loader2 className="w-3 h-3 motion-safe:animate-spin text-[#E5B45B]" />
            <span>Running</span>
          </span>
        ) : runtimeStatus === 'queued' || runtimeStatus === 'pending' ? (
          <span className="flex items-center space-x-1 text-[10px] text-[#B9B0A0] font-mono font-medium bg-[#151715] px-2 py-0.5 rounded-full border border-[rgba(185,176,160,0.15)]">
            <Clock className="w-3 h-3 text-[#B9B0A0]" />
            <span>Queued</span>
          </span>
        ) : (
          <span className="flex items-center space-x-1 text-[10px] text-[#059669] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            <span>Ready</span>
          </span>
        )}
      </div>

      {/* Body Content */}
      <div className="space-y-1.5 pl-1.5">
        <h4 className="text-sm font-bold text-[#F5F0E6] truncate tracking-tight">
          {title}
        </h4>
        <div className="p-2 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-xs text-[#B9B0A0] font-mono leading-relaxed line-clamp-2">
          {subtitle}
        </div>

        {/* Runtime Failure Banner */}
        {runtimeStatus === 'failed' && runtimeError && (
          <div
            className="mt-2.5 p-2 rounded-xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 text-[10px] font-mono text-[#C83C3C] leading-snug flex items-start space-x-1.5"
            title={runtimeError}
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#C83C3C]" />
            <span className="line-clamp-2">{runtimeError}</span>
          </div>
        )}

        {/* Runtime Skipped Banner */}
        {runtimeStatus === 'skipped' && (
          <div className="mt-2 px-2 py-1 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-[10px] font-mono text-[#B9B0A0]/70 italic leading-tight">
            Skipped due to upstream branch
          </div>
        )}
      </div>

      {/* Condition Node Source Handles (True/False) */}
      {config.isCondition ? (
        <>
          <div className="mt-3 pt-2 border-t border-[rgba(185,176,160,0.1)] flex justify-between items-center text-[10px] font-mono pl-1.5">
            <span className="text-[#059669] font-bold">TRUE PORT</span>
            <span className="text-[#C83C3C] font-bold">FALSE PORT</span>
          </div>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            style={{ top: '65%' }}
            className="!w-3.5 !h-3.5 !-right-2 !bg-[#059669] !border-2 !border-[#0B0D0C] hover:!scale-125 !transition-transform !shadow-sm"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            style={{ top: '85%' }}
            className="!w-3.5 !h-3.5 !-right-2 !bg-[#C83C3C] !border-2 !border-[#0B0D0C] hover:!scale-125 !transition-transform !shadow-sm"
          />
        </>
      ) : (
        /* Standard Source Handle (Right) */
        config.hasSource && (
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            className="!w-3.5 !h-3.5 !-right-2 !bg-[#E5B45B] !border-2 !border-[#0B0D0C] hover:!scale-125 !transition-transform !shadow-sm"
          />
        )
      )}
    </div>
  );
}

export default memo(CustomNode);
