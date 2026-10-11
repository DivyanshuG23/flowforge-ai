import React from 'react';
import { 
  X, 
  Trash2, 
  Sliders, 
  Settings, 
  Zap, 
  Activity, 
  GitBranch, 
  Sparkles, 
  Globe, 
  Send,
  HelpCircle,
  Copy,
  Info,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  Loader2,
  Clock
} from 'lucide-react';
import { sanitizeTelemetryData } from '../../utils/sanitizeTelemetry';

const typeIcons = {
  trigger: Zap,
  action: Activity,
  condition: GitBranch,
  ai: Sparkles,
  api: Globe,
  output: Send,
};

const typeLabels = {
  trigger: 'Trigger Node',
  action: 'Action Node',
  condition: 'Condition Node',
  ai: 'AI Agent Node',
  api: 'API Request Node',
  output: 'Output Node',
};

export default function PropertiesPanel({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onClose,
}) {
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-[#0B0D0C] border-l border-[rgba(185,176,160,0.12)] p-6 flex flex-col items-center justify-center text-center select-none hidden xl:flex">
        <div className="w-12 h-12 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.14)] flex items-center justify-center text-[#B9B0A0] mb-4">
          <Sliders className="w-6 h-6 text-[#E5B45B]" />
        </div>
        <h3 className="text-sm font-bold text-[#F5F0E6] mb-1">Node Inspector</h3>
        <p className="text-xs text-[#B9B0A0] leading-relaxed max-w-xs mb-6">
          Select any node on the canvas to inspect and configure its inputs, execution logic, and parameters.
        </p>
        <div className="w-full p-3.5 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.08)] text-left space-y-2">
          <div className="flex items-center space-x-2 text-[11px] font-semibold text-[#E5B45B]">
            <Info className="w-3.5 h-3.5" />
            <span>Canvas Shortcuts</span>
          </div>
          <ul className="text-[11px] text-[#B9B0A0] space-y-1.5 pl-1">
            <li>• Drag handles to connect nodes</li>
            <li>• Click node or backspace to delete</li>
            <li>• Scroll to zoom, drag background to pan</li>
          </ul>
        </div>
      </aside>
    );
  }

  const nodeType = selectedNode.data?.type || 'action';
  const Icon = typeIcons[nodeType] || Activity;
  const label = selectedNode.data?.label || '';
  const description = selectedNode.data?.description || '';

  const handleLabelChange = (e) => {
    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      label: e.target.value,
    });
  };

  const handleDescriptionChange = (e) => {
    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      description: e.target.value,
    });
  };

  return (
    <aside className="w-80 bg-[#0B0D0C] border-l border-[rgba(185,176,160,0.12)] flex flex-col z-20 overflow-y-auto">
      {/* Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[rgba(185,176,160,0.08)] bg-[#0B0D0C] sticky top-0 z-10">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B]">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5B45B] block">
              {typeLabels[nodeType]}
            </span>
            <span className="text-xs font-mono text-[#B9B0A0]">
              ID: {selectedNode.id}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Settings Form */}
      <div className="p-5 space-y-5 flex-1">
        {/* Title Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#F5F0E6] block">
            Node Label
          </label>
          <input
            type="text"
            value={label}
            onChange={handleLabelChange}
            placeholder="Enter node title..."
            className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-xl px-3 py-2 text-xs text-[#F5F0E6] placeholder-[#B9B0A0]/40 focus:outline-none focus:border-[#E5B45B] focus:ring-1 focus:ring-[#E5B45B] transition-colors"
          />
        </div>

        {/* Description Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#F5F0E6] block">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Enter brief description of node responsibility..."
            className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-xl p-3 text-xs text-[#F5F0E6] placeholder-[#B9B0A0]/40 focus:outline-none focus:border-[#E5B45B] focus:ring-1 focus:ring-[#E5B45B] transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Runtime Execution Telemetry Card */}
        {selectedNode.data?.runtimeStatus && (
          <div className="p-3.5 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.16)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B9B0A0]">
                Runtime Telemetry
              </span>
              {selectedNode.data.runtimeStatus === 'succeeded' ? (
                <span className="flex items-center space-x-1 text-[10px] text-[#059669] font-bold bg-[#059669]/10 px-2 py-0.5 rounded-full border border-[#059669]/30">
                  <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                  <span>Succeeded</span>
                </span>
              ) : selectedNode.data.runtimeStatus === 'failed' ? (
                <span className="flex items-center space-x-1 text-[10px] text-[#C83C3C] font-bold bg-[#C83C3C]/10 px-2 py-0.5 rounded-full border border-[#C83C3C]/30">
                  <AlertCircle className="w-3 h-3 text-[#C83C3C]" />
                  <span>Failed</span>
                </span>
              ) : selectedNode.data.runtimeStatus === 'skipped' ? (
                <span className="flex items-center space-x-1 text-[10px] text-[#B9B0A0] font-medium bg-[#0B0D0C] px-2 py-0.5 rounded-full border border-[rgba(185,176,160,0.2)]">
                  <SkipForward className="w-3 h-3 text-[#B9B0A0]" />
                  <span>Skipped</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-[10px] text-[#E5B45B] font-semibold bg-[#252419] px-2 py-0.5 rounded-full border border-[rgba(229,180,91,0.3)]">
                  <Loader2 className="w-3 h-3 animate-spin text-[#E5B45B]" />
                  <span>{selectedNode.data.runtimeStatus}</span>
                </span>
              )}
            </div>

            {selectedNode.data.runtimeDurationMs !== undefined && (
              <div className="flex items-center justify-between text-xs text-[#B9B0A0]">
                <span>Execution Duration</span>
                <span className="font-mono text-[#F5F0E6]">{selectedNode.data.runtimeDurationMs}ms</span>
              </div>
            )}

            {/* Sanitized Error display */}
            {selectedNode.data.runtimeError && (
              <div className="p-2.5 rounded-xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 text-[11px] font-mono text-[#C83C3C] leading-snug">
                <span className="font-bold block text-[10px] uppercase tracking-wider text-[#C83C3C]/80 mb-0.5">Failure Reason:</span>
                {selectedNode.data.runtimeError}
              </div>
            )}

            {/* Condition Branch Outcome */}
            {nodeType === 'condition' && selectedNode.data?.runtimeOutput?.evaluatedBranch && (
              <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#B9B0A0]">Evaluated Branch</span>
                  <span
                    className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                      selectedNode.data.runtimeOutput.evaluatedBranch === 'true'
                        ? 'bg-[#059669]/15 text-[#059669] border border-[#059669]/30'
                        : 'bg-[#C83C3C]/15 text-[#C83C3C] border border-[#C83C3C]/30'
                    }`}
                  >
                    {selectedNode.data.runtimeOutput.evaluatedBranch === 'true' ? 'True Route Taken' : 'False Route Taken'}
                  </span>
                </div>
                {selectedNode.data.runtimeOutput.field && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#B9B0A0]">
                    <span>Field Evaluated:</span>
                    <span className="text-[#F5F0E6]">{selectedNode.data.runtimeOutput.field}</span>
                  </div>
                )}
                {selectedNode.data.runtimeOutput.actualValue !== undefined && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#B9B0A0]">
                    <span>Actual Value:</span>
                    <span className="text-[#F5F0E6]">
                      {JSON.stringify(selectedNode.data.runtimeOutput.actualValue)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* AI Model Inference Telemetry */}
            {nodeType === 'ai' && selectedNode.data?.runtimeOutput && (
              <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#B9B0A0]">Inference Engine</span>
                  <span className="text-[10px] font-mono text-[#E5B45B] font-semibold">
                    {selectedNode.data.runtimeOutput.model || 'Model'} ({selectedNode.data.runtimeOutput.provider || 'gemini'})
                  </span>
                </div>

                {selectedNode.data.runtimeOutput.usage && (
                  <div className="flex items-center justify-between text-[10px] text-[#B9B0A0] pt-1.5 border-t border-[rgba(185,176,160,0.06)]">
                    <span>Token Usage:</span>
                    <span className="font-mono text-[#F5F0E6]">
                      {selectedNode.data.runtimeOutput.usage.totalTokens ?? 0} tokens
                      <span className="text-[#B9B0A0]/60 text-[9px] ml-1">
                        ({selectedNode.data.runtimeOutput.usage.promptTokens ?? 0} in / {selectedNode.data.runtimeOutput.usage.completionTokens ?? 0} out)
                      </span>
                    </span>
                  </div>
                )}

                {selectedNode.data.runtimeOutput.structured ? (
                  <div className="space-y-1 pt-1.5 border-t border-[rgba(185,176,160,0.06)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#059669]">Parsed Structured Output</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#059669]/15 text-[#059669] font-mono font-bold border border-[#059669]/30">
                        JSON
                      </span>
                    </div>
                    <pre className="p-2 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.1)] text-[10px] font-mono text-[#059669] overflow-x-auto max-h-32">
                      {JSON.stringify(sanitizeTelemetryData(selectedNode.data.runtimeOutput.structured), null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="pt-1.5 border-t border-[rgba(185,176,160,0.06)]">
                    <span className="text-[10px] font-medium text-[#B9B0A0]/70 italic block">
                      Plain Text Mode (No structured JSON parsed)
                    </span>
                  </div>
                )}

                {selectedNode.data.runtimeOutput.text && (
                  <div className="space-y-1 pt-1.5 border-t border-[rgba(185,176,160,0.06)]">
                    <span className="text-[10px] uppercase font-bold text-[#B9B0A0] block">Generated Text Response</span>
                    <div className="p-2 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.1)] text-[10px] font-mono text-[#F5F0E6] overflow-y-auto max-h-32 leading-relaxed whitespace-pre-wrap">
                      {selectedNode.data.runtimeOutput.text}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Output preview for other nodes */}
            {nodeType !== 'ai' && selectedNode.data.runtimeOutput !== undefined && selectedNode.data.runtimeOutput !== null && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#B9B0A0] tracking-wider block">Output Preview</span>
                <pre className="p-2 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-[10px] font-mono text-[#B9B0A0] overflow-x-auto max-h-28">
                  {JSON.stringify(sanitizeTelemetryData(selectedNode.data.runtimeOutput), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Type-Specific Properties Preview */}
        <div className="pt-2 border-t border-[rgba(185,176,160,0.08)] space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#B9B0A0] block">
            Configuration
          </span>

          {nodeType === 'trigger' && (
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-[#B9B0A0] block mb-1">Trigger Type</label>
                <select className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]">
                  <option>Incoming Webhook (HTTP POST)</option>
                  <option>Cron Schedule (Every 5m)</option>
                  <option>Manual Console Trigger</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#B9B0A0] block mb-1">Webhook Endpoint Path</label>
                <div className="px-2.5 py-1.5 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-[11px] font-mono text-[#E5B45B] truncate">
                  /api/v1/hooks/{selectedNode.id}
                </div>
              </div>
            </div>
          )}

          {nodeType === 'condition' && (
            <div className="space-y-3.5">
              {/* Field Path Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#F5F0E6] flex items-center justify-between">
                  <span>Field Path</span>
                  <span className="text-[10px] text-[#B9B0A0] font-normal font-mono">e.g. status, payload.code</span>
                </label>
                <input
                  type="text"
                  value={selectedNode.data?.field ?? ''}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      ...selectedNode.data,
                      field: e.target.value
                    })
                  }
                  placeholder="status"
                  className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F5F0E6] placeholder-[#B9B0A0]/30 focus:outline-none focus:border-[#E5B45B] focus:ring-1 focus:ring-[#E5B45B] transition-colors"
                />
                {!(selectedNode.data?.field || '').trim() && (
                  <p className="text-[10px] text-[#E5B45B]/80 italic">
                    Field path is required for condition evaluation.
                  </p>
                )}
                {/(?:__proto__|constructor|prototype)/i.test(selectedNode.data?.field || '') && (
                  <p className="text-[10px] text-[#C83C3C] font-semibold">
                    Unsafe prototype access tokens are prohibited.
                  </p>
                )}
              </div>

              {/* Operator Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#F5F0E6] block">
                  Comparison Operator
                </label>
                <select
                  value={selectedNode.data?.operator || 'equals'}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      ...selectedNode.data,
                      operator: e.target.value
                    })
                  }
                  className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#E5B45B] font-semibold focus:outline-none focus:border-[#E5B45B] transition-colors"
                >
                  <optgroup label="Equality & Relational">
                    <option value="equals">Equals (==)</option>
                    <option value="strict_equals">Strict Equals (===)</option>
                    <option value="not_equals">Not Equals (!=)</option>
                    <option value="greater_than">Greater Than (&gt;)</option>
                    <option value="greater_than_or_equal">Greater Than or Equal (&gt;=)</option>
                    <option value="less_than">Less Than (&lt;)</option>
                    <option value="less_than_or_equal">Less Than or Equal (&lt;=)</option>
                  </optgroup>
                  <optgroup label="Text & Array Content">
                    <option value="contains">Contains (substring/array)</option>
                    <option value="not_contains">Does Not Contain</option>
                    <option value="starts_with">Starts With</option>
                    <option value="ends_with">Ends With</option>
                  </optgroup>
                  <optgroup label="Nullability & Boolean">
                    <option value="is_empty">Is Empty / Null / Blank</option>
                    <option value="is_not_empty">Is Not Empty</option>
                    <option value="is_true">Is True</option>
                    <option value="is_false">Is False</option>
                  </optgroup>
                </select>
              </div>

              {/* Target Value Input (omitted for unary operators) */}
              {!['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(selectedNode.data?.operator || 'equals') && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#F5F0E6] flex items-center justify-between">
                    <span>Compare Value</span>
                    <span className="text-[10px] text-[#B9B0A0] font-normal font-mono">number, string, or boolean</span>
                  </label>
                  <input
                    type="text"
                    value={
                      selectedNode.data?.value !== undefined && selectedNode.data?.value !== null
                        ? String(selectedNode.data.value)
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      let parsed = raw;
                      const trimmed = raw.trim();
                      if (trimmed.toLowerCase() === 'true') parsed = true;
                      else if (trimmed.toLowerCase() === 'false') parsed = false;
                      else if (trimmed.toLowerCase() === 'null') parsed = null;
                      else if (
                        trimmed !== '' &&
                        !isNaN(trimmed) &&
                        !isNaN(parseFloat(trimmed)) &&
                        !/^0\d+/.test(trimmed)
                      ) {
                        parsed = Number(trimmed);
                      }
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        value: parsed
                      });
                    }}
                    placeholder="200"
                    className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F5F0E6] placeholder-[#B9B0A0]/30 focus:outline-none focus:border-[#E5B45B] focus:ring-1 focus:ring-[#E5B45B] transition-colors"
                  />
                </div>
              )}

              {/* Handle Routing Map Cards */}
              <div className="p-3 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.1)] space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-[#059669] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#059669]" />
                    <span>True Branch</span>
                  </span>
                  <span className="text-[10px] text-[#B9B0A0] font-mono">Top Handle (65%)</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-[rgba(185,176,160,0.06)]">
                  <span className="flex items-center space-x-1.5 text-[#C83C3C] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#C83C3C]" />
                    <span>False Branch</span>
                  </span>
                  <span className="text-[10px] text-[#B9B0A0] font-mono">Bottom Handle (85%)</span>
                </div>
              </div>
            </div>
          )}

          {nodeType === 'ai' && (
            <div className="space-y-3.5">
              {/* Provider Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#F5F0E6] block">
                  AI Inference Provider
                </label>
                <select
                  value={selectedNode.data?.provider || 'gemini'}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    const newModel = newProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini';
                    onUpdateNode(selectedNode.id, {
                      ...selectedNode.data,
                      provider: newProvider,
                      model: newModel
                    });
                  }}
                  className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#E5B45B] font-semibold focus:outline-none focus:border-[#E5B45B] transition-colors"
                >
                  <option value="gemini">Google Gemini (REST API)</option>
                  <option value="openai">OpenAI (Chat Completions)</option>
                  <option value="openai-compatible">OpenAI-Compatible Gateway</option>
                </select>
              </div>

              {/* Model Selection */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#F5F0E6]">
                    Model
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const isCustom = !!selectedNode.data?._isCustomModel;
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        _isCustomModel: !isCustom,
                        model: !isCustom ? '' : (selectedNode.data?.provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini')
                      });
                    }}
                    className="text-[10px] text-[#E5B45B] hover:underline"
                  >
                    {selectedNode.data?._isCustomModel ? 'Use presets' : 'Enter custom'}
                  </button>
                </div>
                {selectedNode.data?._isCustomModel ? (
                  <input
                    type="text"
                    value={selectedNode.data?.model ?? ''}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        model: e.target.value
                      })
                    }
                    placeholder={selectedNode.data?.provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'}
                    className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F5F0E6] placeholder-[#B9B0A0]/30 focus:outline-none focus:border-[#E5B45B]"
                  />
                ) : (
                  <select
                    value={selectedNode.data?.model || (selectedNode.data?.provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini')}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        model: e.target.value
                      })
                    }
                    className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]"
                  >
                    {selectedNode.data?.provider === 'gemini' ? (
                      <>
                        <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Lightweight)</option>
                        <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Reasoning)</option>
                        <option value="gemini-2.0-flash">gemini-2.0-flash (High Speed)</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-4o-mini">gpt-4o-mini (Fast & Intelligent)</option>
                        <option value="gpt-4o">gpt-4o (High Capability)</option>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy)</option>
                      </>
                    )}
                  </select>
                )}
              </div>

              {/* Custom Base URL (if openai-compatible) */}
              {selectedNode.data?.provider === 'openai-compatible' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#F5F0E6] block">
                    Gateway Base URL
                  </label>
                  <input
                    type="url"
                    value={selectedNode.data?.baseUrl ?? ''}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        baseUrl: e.target.value
                      })
                    }
                    placeholder="https://api.groq.com/openai/v1"
                    className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F5F0E6] placeholder-[#B9B0A0]/30 focus:outline-none focus:border-[#E5B45B]"
                  />
                  <p className="text-[10px] text-[#B9B0A0]/70">
                    Must be an approved HTTPS endpoint.
                  </p>
                </div>
              )}

              {/* Task Prompt / Instruction */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#F5F0E6] flex items-center justify-between">
                  <span>Task Prompt / Instruction</span>
                  <span className="text-[10px] text-[#E5B45B] font-normal">Required</span>
                </label>
                <textarea
                  rows={3}
                  value={selectedNode.data?.prompt ?? ''}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      ...selectedNode.data,
                      prompt: e.target.value
                    })
                  }
                  placeholder="e.g. Analyze incoming trace events for anomalies. Formulate recovery recommendation."
                  className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg p-2.5 text-xs text-[#F5F0E6] placeholder-[#B9B0A0]/30 focus:outline-none focus:border-[#E5B45B] resize-none leading-relaxed"
                />
                {!(selectedNode.data?.prompt || '').trim() && (
                  <p className="text-[10px] text-[#E5B45B]/80 italic">
                    Prompt is required for LLM inference execution.
                  </p>
                )}
              </div>

              {/* System Directive */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#B9B0A0] block">
                  System Role Directive (Optional)
                </label>
                <textarea
                  rows={2}
                  value={selectedNode.data?.systemPrompt ?? ''}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      ...selectedNode.data,
                      systemPrompt: e.target.value
                    })
                  }
                  placeholder="e.g. You are an autonomous Site Reliability Engineer..."
                  className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg p-2 text-xs text-[#B9B0A0] placeholder-[#B9B0A0]/30 focus:outline-none focus:border-[#E5B45B] resize-none leading-snug"
                />
              </div>

              {/* Expected Output Format */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#F5F0E6] block">
                  Expected Output Format
                </label>
                <select
                  value={selectedNode.data?.outputFormat || 'text'}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      ...selectedNode.data,
                      outputFormat: e.target.value
                    })
                  }
                  className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]"
                >
                  <option value="text">Plain Text Response</option>
                  <option value="json">Structured JSON (Enables downstream field lookups)</option>
                </select>
                {selectedNode.data?.outputFormat === 'json' && (
                  <p className="text-[10px] text-[#059669]">
                    Downstream Condition nodes can inspect output fields via data.fieldName or structured.fieldName.
                  </p>
                )}
              </div>

              {/* Generation Hyperparameters */}
              <div className="pt-2 border-t border-[rgba(185,176,160,0.08)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B9B0A0] block mb-2">
                  Hyperparameters
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[#B9B0A0] block mb-1 truncate">Temp (0-2)</label>
                    <input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={selectedNode.data?.temperature ?? 0.2}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          ...selectedNode.data,
                          temperature: parseFloat(e.target.value) || 0
                        })
                      }
                      className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2 py-1 text-xs font-mono text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#B9B0A0] block mb-1 truncate">Max Tokens</label>
                    <input
                      type="number"
                      min={64}
                      max={4096}
                      step={64}
                      value={selectedNode.data?.maxTokens ?? 1024}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          ...selectedNode.data,
                          maxTokens: parseInt(e.target.value, 10) || 1024
                        })
                      }
                      className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2 py-1 text-xs font-mono text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#B9B0A0] block mb-1 truncate">Timeout (ms)</label>
                    <input
                      type="number"
                      min={1000}
                      max={60000}
                      step={1000}
                      value={selectedNode.data?.timeoutMs ?? 15000}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          ...selectedNode.data,
                          timeoutMs: parseInt(e.target.value, 10) || 15000
                        })
                      }
                      className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2 py-1 text-xs font-mono text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]"
                    />
                  </div>
                </div>
              </div>

              {/* Server-Side Credentials Security Notice */}
              <div className="p-2.5 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-start space-x-2 text-[11px] text-[#B9B0A0]">
                <Info className="w-3.5 h-3.5 text-[#E5B45B] flex-shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-semibold text-[#E5B45B] block mb-0.5">Server-Side Credentials</span>
                  <span>API keys are loaded securely from server environment variables (<code className="text-[#F5F0E6]">GEMINI_API_KEY</code> / <code className="text-[#F5F0E6]">OPENAI_API_KEY</code>). Secrets are never stored in node definitions or browser bundles.</span>
                </div>
              </div>
            </div>
          )}

          {nodeType === 'api' && (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <div className="w-28">
                  <label className="text-[11px] text-[#B9B0A0] block mb-1">Method</label>
                  <select
                    value={selectedNode.data?.method || 'GET'}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        method: e.target.value
                      })
                    }
                    className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2 py-1.5 text-xs text-[#E5B45B] font-semibold focus:outline-none focus:border-[#E5B45B]"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[11px] text-[#B9B0A0] block mb-1">Timeout (ms)</label>
                  <input
                    type="number"
                    min={500}
                    max={30000}
                    step={500}
                    value={selectedNode.data?.timeoutMs ?? 5000}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        timeoutMs: Number(e.target.value)
                      })
                    }
                    placeholder="5000"
                    className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#B9B0A0] block mb-1">Destination URL</label>
                <input
                  type="url"
                  value={selectedNode.data?.url ?? selectedNode.data?.endpoint ?? ''}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      ...selectedNode.data,
                      url: e.target.value
                    })
                  }
                  placeholder="https://api.example.com/v1/data"
                  className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F5F0E6] placeholder-[#B9B0A0]/40 focus:outline-none focus:border-[#E5B45B]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#B9B0A0] block mb-1">Headers (JSON)</label>
                <textarea
                  rows={2}
                  value={
                    typeof selectedNode.data?.headers === 'object'
                      ? JSON.stringify(selectedNode.data.headers, null, 2)
                      : selectedNode.data?.headers || ''
                  }
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      ...selectedNode.data,
                      headers: e.target.value
                    })
                  }
                  placeholder='{"Content-Type": "application/json"}'
                  className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg p-2 text-xs font-mono text-[#B9B0A0] placeholder-[#B9B0A0]/30 focus:outline-none focus:border-[#E5B45B] resize-none leading-snug"
                />
              </div>

              {['POST', 'PUT', 'PATCH'].includes(selectedNode.data?.method || 'GET') && (
                <div>
                  <label className="text-[11px] text-[#B9B0A0] block mb-1">Request Body (JSON)</label>
                  <textarea
                    rows={3}
                    value={
                      typeof selectedNode.data?.body === 'object'
                        ? JSON.stringify(selectedNode.data.body, null, 2)
                        : selectedNode.data?.body || ''
                    }
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        body: e.target.value
                      })
                    }
                    placeholder='{"key": "value"}'
                    className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg p-2 text-xs font-mono text-[#B9B0A0] placeholder-[#B9B0A0]/30 focus:outline-none focus:border-[#E5B45B] resize-none leading-snug"
                  />
                </div>
              )}
            </div>
          )}

          {nodeType === 'action' && (
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-[#B9B0A0] block mb-1">Operation Type</label>
                <select className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F0E6] focus:outline-none">
                  <option>JSON Transformation / Mapping</option>
                  <option>Custom JavaScript Evaluator</option>
                  <option>Variable Assignment</option>
                </select>
              </div>
            </div>
          )}

          {nodeType === 'output' && (
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-[#B9B0A0] block mb-1">Delivery Target</label>
                <select className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#059669] focus:outline-none">
                  <option>Return HTTP 200 Response</option>
                  <option>Publish to Event Stream</option>
                  <option>Log & Terminate Flow</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Delete Action */}
        <div className="pt-4 border-t border-[rgba(185,176,160,0.08)]">
          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-[#C83C3C]/10 text-[#C83C3C] hover:bg-[#C83C3C]/20 border border-[#C83C3C]/30 hover:border-[#C83C3C]/60 text-xs font-semibold transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected Node</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
