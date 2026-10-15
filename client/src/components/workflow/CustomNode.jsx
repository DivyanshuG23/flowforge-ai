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
    icon: Zap,
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
    icon: Activity,
    badgeColor: 'text-[#F5F0E6] bg-[#1C1F1C] border-[rgba(185,176,160,0.2)]',
    iconColor: 'text-[#F5F0E6]',
    borderDefault: 'border-[rgba(185,176,160,0.16)]',
    defaultTitle: 'Data Transform',
    defaultDesc: 'Normalizes and formats event payload',
    hasTarget: true,
    hasSource: true,
  },
  condition: {
    label: 'CONDITION',
    icon: GitBranch,
    badgeColor: 'text-[#059669] bg-[#059669]/15 border-[#059669]/30',
    iconColor: 'text-[#059669]',
    borderDefault: 'border-[#059669]/25',
    defaultTitle: 'Rule Evaluator',
    defaultDesc: 'Branches execution based on conditions',
    hasTarget: true,
    isCondition: true,
  },
  ai: {
    label: 'AI AGENT',
    icon: Sparkles,
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
    icon: Globe,
    badgeColor: 'text-[#B9B0A0] bg-[#1C1F1C] border-[rgba(185,176,160,0.2)]',
    iconColor: 'text-[#E5B45B]',
    borderDefault: 'border-[rgba(185,176,160,0.16)]',
    defaultTitle: 'HTTP Call',
    defaultDesc: 'Dispatches payload to external endpoint',
    hasTarget: true,
    hasSource: true,
  },
  output: {
    label: 'OUTPUT',
    icon: Send,
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
        : `${data.model || 'gemini-2.5-flash'} • ${data.outputFormat === 'json' ? 'JSON' : 'Text'}${data.prompt ? ` • ${data.prompt.slice(0, 18)}${data.prompt.length > 18 ? '...' : ''}` : ''}`
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
    containerBorderClass = `border-[rgba(185,176,160,0.35)] shadow-none opacity-85 ${
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
      className={`relative w-64 rounded-2xl bg-[#151715] border p-4 shadow-xl transition-all duration-200 ${containerBorderClass}`}
    >
      {/* Target Handle (Left) */}
      {config.hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="!w-3 !h-3 !-left-1.5 !bg-[#E5B45B] !border-2 !border-[#0B0D0C] hover:!scale-125 !transition-transform"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[rgba(185,176,160,0.08)]">
        <div className="flex items-center space-x-2.5">
          <div className={`w-8 h-8 rounded-lg bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center ${config.iconColor} shadow-sm`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.badgeColor}`}>
            {config.label}
          </span>
        </div>

        {/* Runtime Status Badge */}
        {runtimeStatus === 'succeeded' ? (
          isFailoverRecovered ? (
            <span className="flex items-center space-x-1 text-[10px] text-[#059669] font-bold bg-[#059669]/10 px-2 py-0.5 rounded-full border border-[#059669]/30">
              <Sparkles className="w-3 h-3 text-[#E5B45B]" />
              <span>Failover OK</span>
              {runtimeDurationMs !== undefined && (
                <span className="text-[9px] font-mono text-[#059669]/80 font-normal">
                  {runtimeDurationMs}ms
                </span>
              )}
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-[10px] text-[#059669] font-bold bg-[#059669]/10 px-2 py-0.5 rounded-full border border-[#059669]/30">
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
          <span className="flex items-center space-x-1 text-[10px] text-[#C83C3C] font-bold bg-[#C83C3C]/10 px-2 py-0.5 rounded-full border border-[#C83C3C]/30 motion-safe:animate-pulse">
            <AlertCircle className="w-3 h-3 text-[#C83C3C]" />
            <span>Failed</span>
            {runtimeDurationMs !== undefined && (
              <span className="text-[9px] font-mono text-[#C83C3C]/80 font-normal">
                {runtimeDurationMs}ms
              </span>
            )}
          </span>
        ) : runtimeStatus === 'skipped' ? (
          <span className="flex items-center space-x-1 text-[10px] text-[#B9B0A0] font-medium bg-[#151715] px-2 py-0.5 rounded-full border border-[rgba(185,176,160,0.2)]">
            <SkipForward className="w-3 h-3 text-[#B9B0A0]" />
            <span>Skipped</span>
          </span>
        ) : runtimeStatus === 'running' ? (
          <span className="flex items-center space-x-1 text-[10px] text-[#E5B45B] font-bold bg-[#252419] px-2 py-0.5 rounded-full border border-[rgba(229,180,91,0.3)]">
            <Loader2 className="w-3 h-3 motion-safe:animate-spin text-[#E5B45B]" />
            <span>Running</span>
          </span>
        ) : runtimeStatus === 'queued' || runtimeStatus === 'pending' ? (
          <span className="flex items-center space-x-1 text-[10px] text-[#B9B0A0] font-medium bg-[#151715] px-2 py-0.5 rounded-full border border-[rgba(185,176,160,0.15)]">
            <Clock className="w-3 h-3 text-[#B9B0A0]" />
            <span>Queued</span>
          </span>
        ) : (
          <span className="flex items-center space-x-1 text-[10px] text-[#059669] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            <span>Ready</span>
          </span>
        )}
      </div>

      {/* Body Content */}
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-[#F5F0E6] truncate tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-[#B9B0A0] leading-relaxed line-clamp-2">
          {subtitle}
        </p>

        {/* Runtime Failure Banner */}
        {runtimeStatus === 'failed' && runtimeError && (
          <div
            className="mt-2.5 p-2 rounded-xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 text-[10px] font-mono text-[#C83C3C] leading-snug flex items-start space-x-1.5"
            title={runtimeError}
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-[#C83C3C]" />
            <span className="line-clamp-2">{runtimeError}</span>
          </div>
        )}

        {/* Runtime Skipped Banner */}
        {runtimeStatus === 'skipped' && (
          <div className="mt-2 px-2 py-1 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.1)] text-[10px] text-[#B9B0A0]/70 italic leading-tight">
            Skipped due to upstream halt
          </div>
        )}
      </div>

      {/* Condition Node Source Handles (True/False) */}
      {config.isCondition ? (
        <>
          <div className="mt-3 pt-2 border-t border-[rgba(185,176,160,0.08)] flex justify-between items-center text-[10px] text-[#B9B0A0]">
            <span className="text-[#059669] font-semibold">True</span>
            <span className="text-[#C83C3C] font-semibold">False</span>
          </div>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            style={{ top: '65%' }}
            className="!w-3 !h-3 !-right-1.5 !bg-[#059669] !border-2 !border-[#0B0D0C] hover:!scale-125 !transition-transform"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            style={{ top: '85%' }}
            className="!w-3 !h-3 !-right-1.5 !bg-[#C83C3C] !border-2 !border-[#0B0D0C] hover:!scale-125 !transition-transform"
          />
        </>
      ) : (
        /* Standard Source Handle (Right) */
        config.hasSource && (
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            className="!w-3 !h-3 !-right-1.5 !bg-[#E5B45B] !border-2 !border-[#0B0D0C] hover:!scale-125 !transition-transform"
          />
        )
      )}
    </div>
  );
}

export default memo(CustomNode);
