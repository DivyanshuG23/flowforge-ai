import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Check, 
  Edit3, 
  AlertCircle, 
  Sparkles,
  Layers,
  Loader2,
  CloudCheck,
  AlertTriangle,
  Copy,
  Clock,
  Globe
} from 'lucide-react';

export default function EditorToolbar({ 
  workflowName, 
  onRename, 
  onSave, 
  isSaving,
  onRun,
  isRunning,
  saveFeedback,
  workflowId,
  isDirty, 
  nodeCount, 
  edgeCount,
  activeExecution,
  onOpenTelemetry,
  onDuplicate,
  isDuplicating,
  workflowSchedule,
  workflowWebhook,
  onSelectTrigger
}) {

  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(workflowName);
  const [runTooltip, setRunTooltip] = useState(false);

  useEffect(() => {
    setTempTitle(workflowName);
  }, [workflowName]);

  const handleTitleSubmit = (e) => {
    e.preventDefault();
    if (tempTitle.trim()) {
      onRename(tempTitle.trim());
    } else {
      setTempTitle(workflowName);
    }
    setIsEditingTitle(false);
  };

  const handleBackToDashboard = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        'You have unsaved changes in this workflow. Are you sure you want to exit to Dashboard?'
      );
      if (!confirmLeave) return;
    }
    navigate('/dashboard');
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#0B0D0C] border-b border-[rgba(185,176,160,0.12)] flex items-center justify-between z-30 select-none shadow-inner-highlight">
      {/* Left: Back button & Workflow Name */}
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        <button
          onClick={handleBackToDashboard}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#151715] hover:bg-[#252419] text-[#B9B0A0] hover:text-[#E5B45B] border border-[rgba(185,176,160,0.14)] hover:border-[#E5B45B]/40 transition-all duration-200 text-xs font-medium group"
          title="Return to Dashboard"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        <div className="h-5 w-px bg-[rgba(185,176,160,0.14)] hidden sm:block" />

        {/* Editable Title */}
        <div className="flex items-center space-x-2 min-w-0">
          {isEditingTitle ? (
            <form onSubmit={handleTitleSubmit} className="flex items-center space-x-1.5">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                autoFocus
                className="bg-[#151715] text-[#F5F0E6] text-sm font-bold px-2.5 py-1 rounded-lg border border-[#E5B45B] focus:outline-none focus:ring-1 focus:ring-[#E5B45B] w-48 sm:w-64"
                maxLength={45}
              />
              <button
                type="submit"
                className="p-1 rounded bg-[#252419] text-[#E5B45B] hover:bg-[#E5B45B] hover:text-[#0B0D0C] transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div
              onClick={() => {
                setTempTitle(workflowName);
                setIsEditingTitle(true);
              }}
              className="flex items-center space-x-2 group cursor-pointer px-2 py-1 rounded-lg hover:bg-[#151715] transition-colors"
              title="Click to rename workflow"
            >
              <h1 className="text-sm sm:text-base font-bold text-[#F5F0E6] truncate group-hover:text-[#E5B45B] transition-colors max-w-[160px] sm:max-w-xs">
                {workflowName}
              </h1>
              <Edit3 className="w-3.5 h-3.5 text-[#B9B0A0]/60 group-hover:text-[#E5B45B] transition-colors flex-shrink-0" />
            </div>
          )}

          {/* Sync Status Badge */}
          {isSaving ? (
            <span className="hidden md:inline-flex items-center space-x-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)]">
              <Loader2 className="w-3 h-3 motion-safe:animate-spin text-[#E5B45B]" />
              <span>Saving to MongoDB...</span>
            </span>
          ) : isDirty ? (
            <span className="hidden md:inline-flex items-center space-x-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B45B] motion-safe:animate-pulse" />
              <span>Unsaved Changes</span>
            </span>
          ) : workflowId ? (
            <span className="hidden md:inline-flex items-center space-x-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#059669]/15 text-[#059669] border border-[#059669]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
              <span>Saved to Cloud</span>
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center space-x-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#151715] text-[#B9B0A0] border border-[rgba(185,176,160,0.16)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B9B0A0]" />
              <span>New Draft</span>
            </span>
          )}
        </div>
      </div>

      {/* Middle: Canvas Stats & Trigger Indicator */}
      <div className="hidden lg:flex items-center space-x-3 text-xs text-[#B9B0A0]">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.08)]">
          <Layers className="w-3.5 h-3.5 text-[#E5B45B]" />
          <span>{nodeCount} {nodeCount === 1 ? 'Node' : 'Nodes'}</span>
          <span className="text-[rgba(185,176,160,0.3)]">|</span>
          <span>{edgeCount} {edgeCount === 1 ? 'Connection' : 'Connections'}</span>
        </div>

        {/* Trigger Status Badge */}
        {workflowSchedule?.enabled ? (
          <button
            type="button"
            onClick={onSelectTrigger}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#E5B45B]/10 hover:bg-[#E5B45B]/20 text-[#E5B45B] border border-[#E5B45B]/30 transition-colors text-xs font-medium cursor-pointer"
            title={`Schedule active: ${workflowSchedule.cron || 'Cron'} (${workflowSchedule.timezone || 'UTC'}). Click to configure.`}
          >
            <Clock className="w-3.5 h-3.5 text-[#E5B45B]" />
            <span className="font-mono text-[11px]">Schedule: {workflowSchedule.cron}</span>
          </button>
        ) : workflowWebhook?.enabled ? (
          <button
            type="button"
            onClick={onSelectTrigger}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#059669]/10 hover:bg-[#059669]/20 text-[#059669] border border-[#059669]/30 transition-colors text-xs font-medium cursor-pointer"
            title="Incoming Webhook trigger active. Click to view endpoint and token."
          >
            <Globe className="w-3.5 h-3.5 text-[#059669]" />
            <span className="text-[11px]">Webhook Active</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSelectTrigger}
            className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#151715] hover:bg-[#252419] text-[#B9B0A0] hover:text-[#E5B45B] border border-[rgba(185,176,160,0.08)] transition-colors text-xs font-medium cursor-pointer"
            title="Configure Schedule or Webhook triggers for automated runs"
          >
            <Clock className="w-3.5 h-3.5 opacity-60" />
            <span className="text-[11px]">Trigger: Manual</span>
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Save Feedback Banner */}
        {saveFeedback && (
          <div
            className={`hidden sm:flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-xl border animate-fade-in ${
              saveFeedback.type === 'success'
                ? 'text-[#059669] bg-[#059669]/10 border-[#059669]/30'
                : 'text-[#C83C3C] bg-[#C83C3C]/10 border-[#C83C3C]/30'
            }`}
          >
            {saveFeedback.type === 'success' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{saveFeedback.message}</span>
          </div>
        )}

        {/* Telemetry quick toggle if execution completed */}
        {activeExecution && (
          <button
            type="button"
            onClick={onOpenTelemetry}
            className={`hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              activeExecution.status === 'succeeded'
                ? 'bg-[#059669]/10 hover:bg-[#059669]/20 text-[#059669] border-[#059669]/30'
                : 'bg-[#C83C3C]/10 hover:bg-[#C83C3C]/20 text-[#C83C3C] border-[#C83C3C]/30'
            }`}
            title="Click to view full execution telemetry trace"
          >
            {activeExecution.status === 'succeeded' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{activeExecution.status === 'succeeded' ? 'Passed' : 'Failed'} ({activeExecution.durationMs || 0}ms)</span>
          </button>
        )}

        {/* Duplicate Workflow Button */}
        {workflowId && onDuplicate && (
          <button
            type="button"
            onClick={onDuplicate}
            disabled={isDuplicating || isSaving || isRunning}
            className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border ${
              isDuplicating
                ? 'bg-[#151715] text-[#B9B0A0] border-[rgba(185,176,160,0.1)] cursor-wait opacity-80'
                : 'bg-[#151715] hover:bg-[#252419] text-[#B9B0A0] hover:text-[#E5B45B] border-[rgba(185,176,160,0.16)] hover:border-[#E5B45B]/40'
            }`}
            title="Duplicate this workflow as a new copy"
            aria-label="Duplicate workflow"
          >
            {isDuplicating ? (
              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin text-[#E5B45B]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isDuplicating ? 'Duplicating...' : 'Duplicate'}</span>
          </button>
        )}

        {/* Save to Cloud Button */}

        <button
          onClick={onSave}
          disabled={isSaving}
          className={`flex items-center space-x-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm ${
            isSaving
              ? 'bg-[#151715] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)] cursor-wait opacity-80'
              : isDirty
              ? 'bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] shadow-lg shadow-[#E5B45B]/20 font-bold hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-[#151715] hover:bg-[#252419] text-[#F5F0E6] hover:text-[#E5B45B] border border-[rgba(185,176,160,0.16)] hover:border-[#E5B45B]/40'
          }`}
          title={workflowId ? 'Update workflow in database' : 'Save workflow to database'}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 motion-safe:animate-spin text-current" />
          ) : (
            <Save className={`w-4 h-4 ${isDirty ? 'text-[#0B0D0C]' : 'text-[#E5B45B]'}`} />
          )}
          <span>{isSaving ? 'Saving...' : workflowId ? 'Save' : 'Save Workflow'}</span>
        </button>

        {/* Run Pipeline Button */}
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning || isSaving}
          className={`flex items-center space-x-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm ${
            isRunning
              ? 'bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.3)] cursor-wait opacity-90'
              : 'bg-[#252419] hover:bg-[#E5B45B] text-[#E5B45B] hover:text-[#0B0D0C] border border-[rgba(229,180,91,0.35)] shadow-glow-gold'
          }`}
          title={workflowId ? 'Execute workflow with foundation engine' : 'Save workflow first to execute'}
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 motion-safe:animate-spin text-current" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </button>
      </div>
    </header>
  );
}
