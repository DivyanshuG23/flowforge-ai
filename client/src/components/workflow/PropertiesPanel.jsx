import React, { useState } from 'react';
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
  Clock,
  Check,
  RefreshCw,
  Key,
  ShieldCheck
} from 'lucide-react';
import { sanitizeTelemetryData } from '../../utils/sanitizeTelemetry';

const generateRandomToken = () => {
  const bytes = new Uint8Array(24);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
};

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
  workflowSchedule,
  workflowWebhook,
  onUpdateSchedule,
  onUpdateWebhook,
  workflowId,
}) {
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
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
            <div className="space-y-4">
              {/* Trigger Mode Segmented Tabs */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#F5F0E6] block">Trigger Mode</label>
                <div className="grid grid-cols-3 gap-1 bg-[#151715] p-1 rounded-xl border border-[rgba(185,176,160,0.12)]">
                  {[
                    { id: 'manual', label: 'Manual', icon: Activity },
                    { id: 'schedule', label: 'Schedule', icon: Clock },
                    { id: 'webhook', label: 'Webhook', icon: Globe },
                  ].map((mode) => {
                    const currentMode = selectedNode.data?.triggerMode || (
                      workflowSchedule?.enabled ? 'schedule' : workflowWebhook?.enabled ? 'webhook' : 'manual'
                    );
                    const isSelected = currentMode === mode.id;
                    const ModeIcon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          onUpdateNode(selectedNode.id, {
                            ...selectedNode.data,
                            triggerMode: mode.id,
                          });
                          if (mode.id === 'schedule' && onUpdateSchedule) {
                            onUpdateSchedule({
                              ...(workflowSchedule || {}),
                              enabled: true,
                              cron: workflowSchedule?.cron || '0 9 * * *',
                              timezone: workflowSchedule?.timezone || 'UTC',
                            });
                          } else if (mode.id === 'webhook' && onUpdateWebhook) {
                            const token = workflowWebhook?.token || generateRandomToken();
                            onUpdateWebhook({
                              ...(workflowWebhook || {}),
                              enabled: true,
                              token,
                            });
                          }
                        }}
                        className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.3)] shadow-sm'
                            : 'text-[#B9B0A0] hover:text-[#F5F0E6]'
                        }`}
                      >
                        <ModeIcon className="w-3 h-3" />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mode: Manual */}
              {((selectedNode.data?.triggerMode || (workflowSchedule?.enabled ? 'schedule' : workflowWebhook?.enabled ? 'webhook' : 'manual')) === 'manual') && (
                <div className="p-3 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.1)] space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#F5F0E6]">
                    <Activity className="w-3.5 h-3.5 text-[#E5B45B]" />
                    <span>Manual Execution</span>
                  </div>
                  <p className="text-[11px] text-[#B9B0A0] leading-relaxed">
                    This workflow is triggered manually on-demand from the editor canvas or through the FlowForge dashboard. Downstream nodes receive an empty starting event payload.
                  </p>
                </div>
              )}

              {/* Mode: Schedule */}
              {((selectedNode.data?.triggerMode || (workflowSchedule?.enabled ? 'schedule' : workflowWebhook?.enabled ? 'webhook' : 'manual')) === 'schedule') && (
                <div className="space-y-3.5">
                  {/* Enable Schedule Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.1)]">
                    <div>
                      <span className="text-xs font-semibold text-[#F5F0E6] block">Enable Schedule</span>
                      <span className="text-[10px] text-[#B9B0A0] block">Server-side cron execution</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(workflowSchedule?.enabled)}
                        onChange={(e) => {
                          onUpdateSchedule?.({
                            ...(workflowSchedule || {}),
                            enabled: e.target.checked,
                            cron: workflowSchedule?.cron || '0 9 * * *',
                            timezone: workflowSchedule?.timezone || 'UTC',
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#0B0D0C] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9B0A0] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E5B45B] peer-checked:after:bg-[#0B0D0C]"></div>
                    </label>
                  </div>

                  {/* Schedule Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#F5F0E6] block">Schedule Presets</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: 'Every 15 min', cron: '*/15 * * * *' },
                        { label: 'Hourly', cron: '0 * * * *' },
                        { label: 'Daily at 9 AM', cron: '0 9 * * *' },
                        { label: 'Weekly on Sun', cron: '0 0 * * 0' },
                      ].map((preset) => (
                        <button
                          key={preset.cron}
                          type="button"
                          onClick={() => {
                            onUpdateSchedule?.({
                              ...(workflowSchedule || {}),
                              cron: preset.cron,
                              enabled: true,
                            });
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all text-left ${
                            workflowSchedule?.cron === preset.cron
                              ? 'bg-[#252419] text-[#E5B45B] border-[#E5B45B]/40'
                              : 'bg-[#151715] text-[#B9B0A0] border-[rgba(185,176,160,0.1)] hover:text-[#F5F0E6]'
                          }`}
                        >
                          <div className="font-bold">{preset.label}</div>
                          <div className="font-mono opacity-60 text-[9px]">{preset.cron}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cron Expression Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#F5F0E6] flex items-center justify-between">
                      <span>Cron Expression</span>
                      <span className="text-[10px] text-[#B9B0A0] font-mono">min hour day mon dow</span>
                    </label>
                    <input
                      type="text"
                      value={workflowSchedule?.cron ?? '0 9 * * *'}
                      onChange={(e) => {
                        onUpdateSchedule?.({
                          ...(workflowSchedule || {}),
                          cron: e.target.value,
                        });
                      }}
                      placeholder="0 9 * * *"
                      className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#E5B45B] focus:outline-none focus:border-[#E5B45B]"
                    />
                  </div>

                  {/* Timezone Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#F5F0E6] block">Timezone (IANA)</label>
                    <select
                      value={workflowSchedule?.timezone ?? 'UTC'}
                      onChange={(e) => {
                        onUpdateSchedule?.({
                          ...(workflowSchedule || {}),
                          timezone: e.target.value,
                        });
                      }}
                      className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]"
                    >
                      <option value="UTC">UTC (Universal Coordinated Time)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                    </select>
                  </div>

                  {/* Schedule Info / State */}
                  {workflowSchedule?.lastRunAt && (
                    <div className="p-2.5 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-[10px] space-y-1">
                      <div className="flex justify-between text-[#B9B0A0]">
                        <span>Last Scheduled Run:</span>
                        <span className="font-mono text-[#F5F0E6]">{new Date(workflowSchedule.lastRunAt).toLocaleString()}</span>
                      </div>
                      {workflowSchedule.lastStatus && (
                        <div className="flex justify-between text-[#B9B0A0]">
                          <span>Last Status:</span>
                          <span className={`font-semibold capitalize ${workflowSchedule.lastStatus === 'succeeded' ? 'text-[#059669]' : 'text-[#C83C3C]'}`}>
                            {workflowSchedule.lastStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mode: Webhook */}
              {((selectedNode.data?.triggerMode || (workflowSchedule?.enabled ? 'schedule' : workflowWebhook?.enabled ? 'webhook' : 'manual')) === 'webhook') && (
                <div className="space-y-3.5">
                  {/* Enable Webhook Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.1)]">
                    <div>
                      <span className="text-xs font-semibold text-[#F5F0E6] block">Enable Webhook</span>
                      <span className="text-[10px] text-[#B9B0A0] block">HTTP POST trigger endpoint</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(workflowWebhook?.enabled)}
                        onChange={(e) => {
                          const token = workflowWebhook?.token || generateRandomToken();
                          onUpdateWebhook?.({
                            ...(workflowWebhook || {}),
                            enabled: e.target.checked,
                            token,
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#0B0D0C] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9B0A0] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#059669] peer-checked:after:bg-[#0B0D0C]"></div>
                    </label>
                  </div>

                  {/* Webhook URL with Copy button */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-[#F5F0E6]">Webhook URL</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newToken = generateRandomToken();
                          onUpdateWebhook?.({
                            ...(workflowWebhook || {}),
                            token: newToken,
                          });
                        }}
                        className="text-[10px] text-[#E5B45B] hover:underline flex items-center space-x-1"
                        title="Generate a new secure unguessable token"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Regenerate Token</span>
                      </button>
                    </div>
                    {workflowWebhook?.token ? (
                      <div className="flex items-center space-x-1 bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg p-1.5">
                        <span className="font-mono text-[10px] text-[#059669] truncate flex-1 px-1 select-all">
                          {`${window.location.origin}/api/workflows/webhook/${workflowWebhook.token}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/api/workflows/webhook/${workflowWebhook.token}`;
                            navigator.clipboard.writeText(url);
                            setCopiedWebhookUrl(true);
                            setTimeout(() => setCopiedWebhookUrl(false), 2000);
                          }}
                          className="p-1 rounded bg-[#252419] hover:bg-[#E5B45B] hover:text-[#0B0D0C] text-[#E5B45B] transition-colors"
                          title="Copy Webhook URL"
                        >
                          {copiedWebhookUrl ? <Check className="w-3 h-3 text-[#059669]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#E5B45B]/80 italic bg-[#252419]/40 p-2 rounded-lg border border-[rgba(229,180,91,0.2)]">
                        Save workflow to generate an unguessable webhook token.
                      </p>
                    )}
                  </div>

                  {/* Secret Key Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-[#F5F0E6]">Webhook Secret (Optional)</label>
                      {workflowWebhook?.hasSecret && (
                        <span className="flex items-center space-x-1 text-[10px] text-[#059669] font-semibold">
                          <ShieldCheck className="w-3 h-3 text-[#059669]" />
                          <span>Secret Active</span>
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={workflowWebhook?.secret ?? ''}
                      onChange={(e) => {
                        onUpdateWebhook?.({
                          ...(workflowWebhook || {}),
                          secret: e.target.value,
                        });
                      }}
                      placeholder={
                        workflowWebhook?.hasSecret
                          ? '•••••••• (Secret active — leave blank to keep)'
                          : 'Enter optional secret...'
                      }
                      className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]"
                    />
                    <p className="text-[10px] text-[#B9B0A0]/70 leading-tight">
                      When set, calls must supply <code className="text-[#E5B45B]">X-Webhook-Secret</code> or <code className="text-[#E5B45B]">Authorization: Bearer &lt;secret&gt;</code>.
                    </p>
                  </div>

                  {/* Test cURL Snippet */}
                  {workflowWebhook?.token && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-[#F5F0E6]">Test cURL Command</label>
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/api/workflows/webhook/${workflowWebhook.token}`;
                            const secretHeader = workflowWebhook.secret ? `-H "X-Webhook-Secret: ${workflowWebhook.secret}" ` : '';
                            const curl = `curl -X POST "${url}" -H "Content-Type: application/json" ${secretHeader}-d '{"event":"test","timestamp":"${new Date().toISOString()}"}'`;
                            navigator.clipboard.writeText(curl);
                            setCopiedCurl(true);
                            setTimeout(() => setCopiedCurl(false), 2000);
                          }}
                          className="text-[10px] text-[#E5B45B] hover:underline flex items-center space-x-1"
                        >
                          {copiedCurl ? <Check className="w-2.5 h-2.5 text-[#059669]" /> : <Copy className="w-2.5 h-2.5" />}
                          <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                        </button>
                      </div>
                      <pre className="p-2 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-[10px] font-mono text-[#B9B0A0] overflow-x-auto whitespace-pre-wrap select-all">
                        {`curl -X POST "${window.location.origin}/api/workflows/webhook/${workflowWebhook.token}" \\\n  -H "Content-Type: application/json" ${workflowWebhook.secret ? `\\\n  -H "X-Webhook-Secret: ${workflowWebhook.secret}" ` : ''}\\\n  -d '{"event":"test","timestamp":"${new Date().toISOString()}"}'`}
                      </pre>
                    </div>
                  )}

                  {/* Webhook Telemetry */}
                  {workflowWebhook?.totalTriggers !== undefined && (
                    <div className="p-2 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-[10px] flex justify-between text-[#B9B0A0]">
                      <span>Total Webhook Invocations:</span>
                      <span className="font-mono text-[#059669] font-bold">{workflowWebhook.totalTriggers}</span>
                    </div>
                  )}
                </div>
              )}
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
                    let newModel = 'gemini-2.5-flash';
                    if (newProvider === 'groq') newModel = 'llama-3.3-70b-versatile';
                    else if (newProvider === 'mistral') newModel = 'mistral-small-latest';
                    else if (newProvider === 'openai' || newProvider === 'openai-compatible') newModel = 'gpt-4o-mini';

                    onUpdateNode(selectedNode.id, {
                      ...selectedNode.data,
                      provider: newProvider,
                      model: newModel
                    });
                  }}
                  className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#E5B45B] font-semibold focus:outline-none focus:border-[#E5B45B] transition-colors"
                >
                  <option value="gemini">Google Gemini (REST API)</option>
                  <option value="groq">Groq (Llama 3.3 / Mixtral)</option>
                  <option value="openai">OpenAI (Chat Completions)</option>
                  <option value="mistral">Mistral AI (Mistral Small / Large)</option>
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
                      const defaultPreset =
                        selectedNode.data?.provider === 'groq' ? 'llama-3.3-70b-versatile' :
                        selectedNode.data?.provider === 'mistral' ? 'mistral-small-latest' :
                        selectedNode.data?.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini';
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        _isCustomModel: !isCustom,
                        model: !isCustom ? '' : defaultPreset
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
                    placeholder={
                      selectedNode.data?.provider === 'groq' ? 'llama-3.3-70b-versatile' :
                      selectedNode.data?.provider === 'mistral' ? 'mistral-small-latest' :
                      selectedNode.data?.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'
                    }
                    className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F5F0E6] placeholder-[#B9B0A0]/30 focus:outline-none focus:border-[#E5B45B]"
                  />
                ) : (
                  <select
                    value={selectedNode.data?.model || (
                      selectedNode.data?.provider === 'groq' ? 'llama-3.3-70b-versatile' :
                      selectedNode.data?.provider === 'mistral' ? 'mistral-small-latest' :
                      selectedNode.data?.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'
                    )}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        ...selectedNode.data,
                        model: e.target.value
                      })
                    }
                    className="w-full bg-[#151715] border border-[rgba(185,176,160,0.16)] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F0E6] focus:outline-none focus:border-[#E5B45B]"
                  >
                    {selectedNode.data?.provider === 'gemini' && (
                      <>
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Fast &amp; Verified Stable)</option>
                        <option value="gemini-flash-latest">gemini-flash-latest (Latest Release)</option>
                        <option value="gemini-3.8-flash">gemini-3.8-flash (Reasoning / High Capability)</option>
                        <option value="gemini-3.5-flash">gemini-3.5-flash (Legacy)</option>
                      </>
                    )}
                    {selectedNode.data?.provider === 'groq' && (
                      <>
                        <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Flagship Llama 3.3 128k)</option>
                        <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Sub-100ms Ultra-Fast)</option>
                        <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (MoE Architecture)</option>
                      </>
                    )}
                    {selectedNode.data?.provider === 'mistral' && (
                      <>
                        <option value="mistral-small-latest">mistral-small-latest (Fast Reasoning &amp; Triage)</option>
                        <option value="mistral-large-latest">mistral-large-latest (Top-tier Flagship)</option>
                        <option value="codestral-latest">codestral-latest (Code &amp; Systems Logic)</option>
                      </>
                    )}
                    {(selectedNode.data?.provider === 'openai' || selectedNode.data?.provider === 'openai-compatible' || !selectedNode.data?.provider) && (
                      <>
                        <option value="gpt-4o-mini">gpt-4o-mini (Fast &amp; Intelligent)</option>
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

              {/* Automatic Multi-Provider Failover */}
              <div className="pt-2 border-t border-[rgba(185,176,160,0.08)] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#F5F0E6] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#E5B45B]" />
                      Automatic Multi-Provider Failover
                    </span>
                    <p className="text-[10px] text-[#B9B0A0]/70">
                      Cascades across backup providers on transient errors (429, 5xx, timeouts)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedNode.data?.enableFailover}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          ...selectedNode.data,
                          enableFailover: e.target.checked
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#151715] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9B0A0] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#059669] peer-checked:after:bg-[#F5F0E6]"></div>
                  </label>
                </div>

                {selectedNode.data?.enableFailover && (
                  <div className="p-2.5 rounded-lg bg-[#151715] border border-[rgba(5,150,105,0.25)] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669] block">
                      Cascade Priority Order
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-[#F5F0E6] font-mono flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-[rgba(229,180,91,0.15)] text-[#E5B45B] border border-[rgba(229,180,91,0.3)]">
                        1. {selectedNode.data?.provider === 'groq' ? 'Groq' : selectedNode.data?.provider === 'mistral' ? 'Mistral' : selectedNode.data?.provider === 'openai' ? 'OpenAI' : 'Gemini'}
                      </span>
                      <span className="text-[#B9B0A0]">&rarr;</span>
                      <span className="px-1.5 py-0.5 rounded bg-[rgba(185,176,160,0.1)] text-[#B9B0A0] border border-[rgba(185,176,160,0.2)]">
                        2. {selectedNode.data?.provider === 'groq' ? 'Gemini' : 'Groq'}
                      </span>
                      <span className="text-[#B9B0A0]">&rarr;</span>
                      <span className="px-1.5 py-0.5 rounded bg-[rgba(185,176,160,0.1)] text-[#B9B0A0] border border-[rgba(185,176,160,0.2)]">
                        3. {selectedNode.data?.provider === 'openai' ? 'Groq' : 'OpenAI'}
                      </span>
                      <span className="text-[#B9B0A0]">&rarr;</span>
                      <span className="px-1.5 py-0.5 rounded bg-[rgba(185,176,160,0.1)] text-[#B9B0A0] border border-[rgba(185,176,160,0.2)]">
                        4. {selectedNode.data?.provider === 'mistral' ? 'OpenAI' : 'Mistral'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#B9B0A0]/80 leading-relaxed">
                      Permanent errors (400, 401, 403, 404, safety filter blocks) fail immediately without cascading. Unconfigured fallback API keys are skipped gracefully.
                    </p>
                  </div>
                )}
              </div>

              {/* Server-Side Credentials Security Notice */}
              <div className="p-2.5 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-start space-x-2 text-[11px] text-[#B9B0A0]">
                <Info className="w-3.5 h-3.5 text-[#E5B45B] flex-shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-semibold text-[#E5B45B] block mb-0.5">Server-Side Credentials</span>
                  <span>API keys are loaded securely from server environment variables (<code className="text-[#F5F0E6]">GEMINI_API_KEY</code>, <code className="text-[#F5F0E6]">GROQ_API_KEY</code>, <code className="text-[#F5F0E6]">OPENAI_API_KEY</code>, <code className="text-[#F5F0E6]">MISTRAL_API_KEY</code>). Secrets are never stored in node definitions or browser bundles.</span>
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
