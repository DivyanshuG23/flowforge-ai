import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  RotateCw,
  Search,
  Filter,
  ExternalLink,
  Terminal,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  ArrowUpRight,
  Cpu,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Globe,
  Sparkles,
  Trash2,
  Download,
  SlidersHorizontal
} from 'lucide-react';
import FailoverCascadeViewer from '../components/workflow/FailoverCascadeViewer';
import AiProviderAttemptsViewer, { sanitizeErrorText, deepSanitizeExportObject } from '../components/workflow/AiProviderAttemptsViewer';
import { useAuth } from '../context/AuthContext';
import {
  getUserExecutions,
  getUserExecutionStats,
  getExecutionById,
  rerunExecution,
  deleteExecution,
  purgeFailedExecutions,
  getErrorMessage
} from '../services/api';
import Sidebar from '../components/dashboard/Sidebar';
import TopNav from '../components/dashboard/TopNav';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/dashboard/StatusBadge';

const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '—';
  }
};

const formatDuration = (ms) => {
  if (typeof ms !== 'number' || isNaN(ms)) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export default function Executions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    succeeded: 0,
    failed: 0,
    running: 0,
    queued: 0,
    successRate: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Executions list state
  const [executions, setExecutions] = useState([]);
  const [totalExecutions, setTotalExecutions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [triggerFilter, setTriggerFilter] = useState(searchParams.get('trigger') || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Execution Trace Modal state
  const [selectedExecutionId, setSelectedExecutionId] = useState(searchParams.get('id') || null);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [copiedId, setCopiedId] = useState(false);
  const [rerunningId, setRerunningId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [activeStepTabs, setActiveStepTabs] = useState({});
  const [copiedStepKey, setCopiedStepKey] = useState(null);

  // Deletion and Purge state
  const [deletingId, setDeletingId] = useState(null);
  const [isPurging, setIsPurging] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);
  const [confirmPurgeModal, setConfirmPurgeModal] = useState(false);

  // Fetch execution statistics
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await getUserExecutionStats();
      if (response?.success && response.stats) {
        setStats(response.stats);
      }
    } catch (err) {
      console.error('Failed to fetch execution stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch execution list
  const fetchExecutions = useCallback(async (page = 1, status = 'all', trigger = 'all') => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (status && status !== 'all') {
        params.status = status;
      }
      if (trigger && trigger !== 'all') {
        params.triggerSource = trigger;
      }
      const response = await getUserExecutions(params);
      if (response?.success) {
        setExecutions(response.executions || []);
        setTotalExecutions(response.totalExecutions || 0);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.currentPage || 1);
      } else {
        setError('Failed to retrieve executions.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Initial load & trigger on filters
  useEffect(() => {
    fetchStats();
    fetchExecutions(1, statusFilter, triggerFilter);
  }, [fetchStats, fetchExecutions, statusFilter, triggerFilter]);

  // Fetch execution details when modal is triggered
  const fetchExecutionDetail = useCallback(async (id) => {
    if (!id) return;
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const response = await getExecutionById(id);
      if (response?.success && response.execution) {
        setSelectedExecution(response.execution);
        // Expand all node traces by default
        const nodeMap = {};
        (response.execution.nodeExecutions || []).forEach((_, idx) => {
          nodeMap[idx] = true;
        });
        setExpandedNodes(nodeMap);
      } else {
        setDetailError('Execution record not found.');
      }
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedExecutionId) {
      fetchExecutionDetail(selectedExecutionId);
    } else {
      setSelectedExecution(null);
    }
  }, [selectedExecutionId, fetchExecutionDetail]);

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (status === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', status);
    }
    setSearchParams(newParams);
  };

  const handleTriggerFilterChange = (trigger) => {
    setTriggerFilter(trigger);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (trigger === 'all') {
      newParams.delete('trigger');
    } else {
      newParams.set('trigger', trigger);
    }
    setSearchParams(newParams);
  };

  const handleOpenDetail = (id) => {
    setSelectedExecutionId(id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('id', id);
    setSearchParams(newParams);
  };

  const handleCloseDetail = () => {
    setSelectedExecutionId(null);
    setSelectedExecution(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('id');
    setSearchParams(newParams);
  };

  const toggleNodeExpand = (index) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleCopyExecutionId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyStepJson = (stepKey, data) => {
    try {
      const sanitized = deepSanitizeExportObject(data);
      const text = typeof sanitized === 'object' ? JSON.stringify(sanitized, null, 2) : String(sanitized ?? '');
      navigator.clipboard.writeText(text);
      setCopiedStepKey(stepKey);
      setTimeout(() => setCopiedStepKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy step data:', err);
    }
  };

  const setStepTab = (stepIdx, tab) => {
    setActiveStepTabs((prev) => ({
      ...prev,
      [stepIdx]: tab
    }));
  };

  const handleRerunExecution = async (executionId, isFromModal = false) => {
    if (!executionId || rerunningId) return;
    setRerunningId(executionId);
    setActionFeedback(null);
    try {
      const response = await rerunExecution(executionId);
      if (response?.success && response.execution) {
        setActionFeedback({
          type: 'success',
          message: `Rerun #${response.execution._id?.slice(-8)} launched successfully with status: ${response.execution.status}.`
        });
        fetchStats();
        fetchExecutions(1, statusFilter, triggerFilter);
        // Load the new execution trace directly into view
        setSelectedExecution(response.execution);
        setSelectedExecutionId(response.execution._id);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('id', response.execution._id);
        setSearchParams(newParams);
      } else {
        setActionFeedback({
          type: 'error',
          message: response?.message || 'Failed to rerun workflow execution.'
        });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: getErrorMessage(err) || 'Failed to rerun workflow execution.'
      });
    } finally {
      setRerunningId(null);
    }
  };

  const handleDeleteExecution = async (id) => {
    if (!id || deletingId) return;
    setDeletingId(id);
    setActionFeedback(null);
    try {
      const response = await deleteExecution(id);
      if (response?.success) {
        setActionFeedback({
          type: 'success',
          message: `Execution #${id.slice(-8)} deleted successfully.`
        });
        if (selectedExecutionId === id) {
          handleCloseDetail();
        }
        setConfirmDeleteModal(null);
        fetchStats();
        fetchExecutions(currentPage, statusFilter, triggerFilter);
      } else {
        setActionFeedback({
          type: 'error',
          message: response?.message || 'Failed to delete execution record.'
        });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: getErrorMessage(err) || 'Failed to delete execution record.'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePurgeFailed = async () => {
    if (isPurging) return;
    setIsPurging(true);
    setActionFeedback(null);
    try {
      const response = await purgeFailedExecutions();
      if (response?.success) {
        setActionFeedback({
          type: 'success',
          message: response.message || `Purged ${response.purgedCount || 0} failed execution(s).`
        });
        setConfirmPurgeModal(false);
        fetchStats();
        fetchExecutions(1, statusFilter, triggerFilter);
      } else {
        setActionFeedback({
          type: 'error',
          message: response?.message || 'Failed to purge failed execution records.'
        });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: getErrorMessage(err) || 'Failed to purge failed execution records.'
      });
    } finally {
      setIsPurging(false);
    }
  };

  const handleExportTraceJson = (execution) => {
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
          workflow: {
            id: execution.workflow?._id || execution.workflow,
            name: execution.workflow?.name || 'Untitled Workflow',
            description: execution.workflow?.description || ''
          },
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

      setActionFeedback({
        type: 'success',
        message: `Execution trace #${execution._id?.slice(-8)} exported as JSON.`
      });
    } catch (err) {
      console.error('Failed to export trace JSON:', err);
      setActionFeedback({
        type: 'error',
        message: 'Failed to generate JSON export for this execution.'
      });
    }
  };

  // Filter client-side by search query (workflow name or ID)
  const filteredExecutions = executions.filter((exec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const wfName = (exec.workflow?.name || 'Untitled Workflow').toLowerCase();
    const execId = (exec._id || '').toLowerCase();
    return wfName.includes(q) || execId.includes(q);
  });

  return (
    <div className="min-h-screen bg-[#0B0D0C] text-[#F5F0E6] flex">
      {/* Reusable Sidebar Navigation */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <TopNav onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[rgba(185,176,160,0.1)]">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#151715] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B] shadow-glow-gold">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F0E6]">
                    Execution History
                  </h1>
                  <p className="text-xs text-[#B9B0A0] mt-0.5">
                    Real-time execution telemetry, node traces, and runtime performance.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {stats.failed > 0 && (
                <button
                  onClick={() => setConfirmPurgeModal(true)}
                  disabled={isPurging}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#C83C3C]/10 hover:bg-[#C83C3C]/20 border border-[#C83C3C]/30 text-xs font-semibold text-[#C83C3C] transition-all disabled:opacity-50"
                  title="Purge all failed executions for your account"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#C83C3C]" />
                  <span>Purge Failed ({stats.failed})</span>
                </button>
              )}

              <button
                onClick={() => {
                  fetchStats();
                  fetchExecutions(currentPage, statusFilter, triggerFilter);
                }}
                disabled={isLoading}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#151715] hover:bg-[#1a1d1a] border border-[rgba(185,176,160,0.15)] text-xs font-semibold text-[#F5F0E6] transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#E5B45B] ${isLoading ? 'motion-safe:animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => navigate('/workflows/new')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E5B45B] to-[#D49E3F] text-[#0B0D0C] font-semibold text-xs hover:shadow-glow-gold transition-all"
              >
                <span>New Workflow</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Statistics Summary Cards */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#B9B0A0]">
                Telemetry Overview
              </h2>
              <span className="text-[11px] text-[#B9B0A0]/70 font-mono">
                Authenticated User Runs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Executions"
                value={isLoadingStats ? '...' : stats.total.toString()}
                note={isLoadingStats ? 'Syncing...' : `${stats.total} total pipeline runs`}
                icon={PlayCircle}
                accentColor="gold"
                badge="History"
              />
              <StatCard
                label="Successful Runs"
                value={isLoadingStats ? '...' : stats.succeeded.toString()}
                note={
                  isLoadingStats
                    ? 'Calculating...'
                    : `${stats.successRate}% completion rate`
                }
                icon={CheckCircle2}
                accentColor="emerald"
                badge={stats.total > 0 && stats.failed === 0 ? '100% Health' : 'Completed'}
              />
              <StatCard
                label="Failed Runs"
                value={isLoadingStats ? '...' : stats.failed.toString()}
                note={
                  isLoadingStats
                    ? 'Syncing...'
                    : `${stats.failed} runtime anomalies`
                }
                icon={AlertCircle}
                accentColor="ruby"
                badge={stats.failed === 0 ? 'Zero Errors' : 'Anomalies'}
              />
              <StatCard
                label="In-Flight / Queued"
                value={isLoadingStats ? '...' : (stats.running + stats.queued).toString()}
                note={`${stats.running} active, ${stats.queued} queued`}
                icon={Activity}
                accentColor="neutral"
                badge="Live"
              />
            </div>
          </section>

          {/* Execution Table & Filter Section */}
          <section className="rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] p-5 sm:p-6 shadow-xl shadow-inner-highlight space-y-5">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[rgba(185,176,160,0.08)]">
              {/* Status Filter Tabs */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'All Runs', count: stats.total },
                  { id: 'succeeded', label: 'Succeeded', count: stats.succeeded },
                  { id: 'failed', label: 'Failed', count: stats.failed },
                  { id: 'running', label: 'Running', count: stats.running },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleStatusFilterChange(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                      statusFilter === tab.id
                        ? 'bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.3)] shadow-glow-gold'
                        : 'bg-[#0B0D0C] text-[#B9B0A0] hover:text-[#F5F0E6] border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(185,176,160,0.1)] font-mono">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Trigger Filter & Search Controls */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.14)] text-xs text-[#B9B0A0] flex-1 sm:flex-none">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#E5B45B] flex-shrink-0" />
                  <span className="text-[11px] font-medium hidden sm:inline">Trigger:</span>
                  <select
                    value={triggerFilter}
                    onChange={(e) => handleTriggerFilterChange(e.target.value)}
                    className="bg-transparent text-[#F5F0E6] text-xs focus:outline-none cursor-pointer pr-1 w-full"
                    aria-label="Filter executions by trigger source"
                  >
                    <option value="all" className="bg-[#151715] text-[#F5F0E6]">All Triggers</option>
                    <option value="manual" className="bg-[#151715] text-[#F5F0E6]">Manual</option>
                    <option value="webhook" className="bg-[#151715] text-[#F5F0E6]">Webhook</option>
                    <option value="scheduled" className="bg-[#151715] text-[#F5F0E6]">Scheduled</option>
                    <option value="rerun" className="bg-[#151715] text-[#F5F0E6]">Rerun</option>
                  </select>
                </div>

                {/* Local Search Input */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-[#B9B0A0] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by workflow or ID..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.12)] text-[#F5F0E6] placeholder-[#B9B0A0]/50 focus:outline-none focus:border-[#E5B45B] focus:ring-1 focus:ring-[#E5B45B]/30 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 text-[#C83C3C] text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Feedback Banner (Rerun status / notifications) */}
            {actionFeedback && (
              <div
                className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
                  actionFeedback.type === 'success'
                    ? 'bg-[#059669]/10 border-[#059669]/30 text-[#059669]'
                    : 'bg-[#C83C3C]/10 border-[#C83C3C]/30 text-[#C83C3C]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {actionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
                <button
                  onClick={() => setActionFeedback(null)}
                  className="p-1 rounded hover:bg-black/20 text-current transition-colors"
                  aria-label="Dismiss message"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Executions Table */}
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-[#E5B45B] motion-safe:animate-spin mx-auto" />
                <p className="text-xs text-[#B9B0A0]">Retrieving execution telemetry...</p>
              </div>
            ) : filteredExecutions.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Terminal className="w-8 h-8 text-[#B9B0A0]/40 mx-auto" />
                <h3 className="text-sm font-semibold text-[#F5F0E6]">No Executions Found</h3>
                <p className="text-xs text-[#B9B0A0] max-w-sm mx-auto">
                  {statusFilter !== 'all'
                    ? `There are no ${statusFilter} executions recorded for your workflows.`
                    : 'You haven’t executed any workflows yet. Trigger a run from the workflow canvas to record telemetry.'}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/workflows/new')}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.3)] text-[#E5B45B] text-xs font-semibold hover:bg-[#2e2c1e] transition-all"
                  >
                    <span>Open Workflow Canvas</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Execution Cards (< 768px) */}
                <div className="md:hidden space-y-3">
                  {filteredExecutions.map((exec) => {
                    const wfName = exec.workflow?.name || 'Untitled Workflow';
                    const wfId = exec.workflow?._id || exec.workflow;
                    const isSuccess = exec.status === 'succeeded';
                    const isFailed = exec.status === 'failed';
                    const isRunning = exec.status === 'running';

                    return (
                      <div
                        key={exec._id}
                        className="p-4 rounded-2xl bg-[#111311] border border-[rgba(185,176,160,0.14)] space-y-3 shadow-sm hover:border-[#E5B45B]/40 transition-colors"
                      >
                        {/* Top Header: Workflow Name & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[#F5F0E6] truncate">
                              {wfName}
                            </h4>
                            <span className="text-[10px] text-[#B9B0A0]/70 font-mono">
                              ID: {exec._id?.slice(-8)}
                            </span>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <StatusBadge
                              status={
                                isSuccess
                                  ? 'success'
                                  : isFailed
                                  ? 'failure'
                                  : isRunning
                                  ? 'running'
                                  : 'pending'
                              }
                              label={
                                isSuccess
                                  ? 'Succeeded'
                                  : isFailed
                                  ? 'Failed'
                                  : isRunning
                                  ? 'Running'
                                  : 'Queued'
                              }
                            />
                            {Array.isArray(exec.nodeExecutions) && exec.nodeExecutions.some(
                              (n) => Array.isArray(n.output?.failoverLog) && n.output.failoverLog.length > 1 && n.status === 'succeeded'
                            ) && (
                              <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E5B45B]/15 text-[#E5B45B] border border-[rgba(229,180,91,0.3)]">
                                <Sparkles className="w-2.5 h-2.5 text-[#E5B45B]" />
                                <span>Failover OK</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metadata Chips Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[rgba(185,176,160,0.08)]">
                          <div className="flex items-center space-x-1.5 text-[#B9B0A0]">
                            <span className="text-[10px] uppercase font-mono text-[#B9B0A0]/60">Trigger:</span>
                            <span className="text-[#F5F0E6] font-medium capitalize">{exec.triggerSource || 'Manual'}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[#B9B0A0]">
                            <Clock className="w-3 h-3 text-[#B9B0A0]/60" />
                            <span className="font-mono text-[#F5F0E6]">{formatDuration(exec.durationMs)}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[#B9B0A0]">
                            <Layers className="w-3 h-3 text-[#B9B0A0]/60" />
                            <span>{exec.nodeExecutions?.length || 0} nodes</span>
                          </div>
                          <div className="text-[10px] text-[#B9B0A0] truncate">
                            {formatDateTime(exec.createdAt || exec.startedAt)}
                          </div>
                        </div>

                        {/* Mobile Actions Toolbar */}
                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[rgba(185,176,160,0.08)]">
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleRerunExecution(exec._id)}
                              disabled={rerunningId === exec._id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.18)] text-[#F5F0E6] hover:bg-[#252419] hover:border-[rgba(229,180,91,0.3)] hover:text-[#E5B45B] text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <RotateCw className={`w-3 h-3 text-[#E5B45B] ${rerunningId === exec._id ? 'motion-safe:animate-spin' : ''}`} />
                              <span>{rerunningId === exec._id ? 'Running...' : 'Rerun'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenDetail(exec._id)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] hover:bg-[#2e2c1e] text-xs font-semibold transition-colors"
                            >
                              Trace
                            </button>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleExportTraceJson(exec)}
                              className="p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#E5B45B] hover:bg-[#151715] transition-colors"
                              title="Export Trace JSON"
                              aria-label="Export Trace JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setConfirmDeleteModal(exec._id)}
                              disabled={deletingId === exec._id}
                              className="p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#C83C3C] hover:bg-[#151715] transition-colors disabled:opacity-50"
                              title="Delete Execution Record"
                              aria-label="Delete Execution Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {wfId && (
                              <Link
                                to={`/workflows/${wfId}`}
                                className="p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-colors"
                                title="Open in Workflow Editor"
                                aria-label="Open in Workflow Editor"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop / Tablet 7-Column Table (Hidden on < 768px) */}
                <div className="hidden md:block overflow-x-auto -mx-5 sm:mx-0">
                  <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[rgba(185,176,160,0.1)] text-[#B9B0A0] uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-semibold">Workflow</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Trigger</th>
                      <th className="py-3 px-4 font-semibold">Duration</th>
                      <th className="py-3 px-4 font-semibold">Nodes</th>
                      <th className="py-3 px-4 font-semibold">Executed At</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(185,176,160,0.06)]">
                    {filteredExecutions.map((exec) => {
                      const wfName = exec.workflow?.name || 'Untitled Workflow';
                      const wfId = exec.workflow?._id || exec.workflow;
                      const isSuccess = exec.status === 'succeeded';
                      const isFailed = exec.status === 'failed';
                      const isRunning = exec.status === 'running';

                      return (
                        <tr
                          key={exec._id}
                          className="hover:bg-[#1a1d1a]/50 transition-colors group"
                        >
                          {/* Workflow Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#F5F0E6] group-hover:text-[#E5B45B] transition-colors">
                                {wfName}
                              </span>
                              <span className="text-[10px] text-[#B9B0A0]/60 font-mono mt-0.5">
                                ID: {exec._id?.slice(-8)}
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            <StatusBadge
                              status={
                                isSuccess
                                  ? 'success'
                                  : isFailed
                                  ? 'failure'
                                  : isRunning
                                  ? 'running'
                                  : 'pending'
                              }
                              label={
                                isSuccess
                                  ? 'Succeeded'
                                  : isFailed
                                  ? 'Failed'
                                  : isRunning
                                  ? 'Running'
                                  : 'Queued'
                              }
                            />
                            {Array.isArray(exec.nodeExecutions) && exec.nodeExecutions.some(
                              (n) => Array.isArray(n.output?.failoverLog) && n.output.failoverLog.length > 1 && n.status === 'succeeded'
                            ) && (
                              <div className="mt-1">
                                <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E5B45B]/15 text-[#E5B45B] border border-[rgba(229,180,91,0.3)]">
                                  <Sparkles className="w-2.5 h-2.5 text-[#E5B45B]" />
                                  <span>Failover OK</span>
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Trigger Source */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              exec.triggerSource === 'scheduled'
                                ? 'bg-[#E5B45B]/10 text-[#E5B45B] border-[#E5B45B]/30'
                                : exec.triggerSource === 'webhook'
                                ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/30'
                                : exec.triggerSource === 'rerun'
                                ? 'bg-[#252419] text-[#E5B45B] border-[rgba(229,180,91,0.35)] shadow-glow-gold'
                                : 'bg-[#151715] text-[#B9B0A0] border-[rgba(185,176,160,0.16)]'
                            }`}>
                              {exec.triggerSource === 'scheduled' ? (
                                <>
                                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                                  <span>Scheduled</span>
                                </>
                              ) : exec.triggerSource === 'webhook' ? (
                                <>
                                  <Globe className="w-2.5 h-2.5 mr-0.5" />
                                  <span>Webhook</span>
                                </>
                              ) : exec.triggerSource === 'rerun' ? (
                                <>
                                  <RotateCw className="w-2.5 h-2.5 mr-0.5 text-[#E5B45B]" />
                                  <span>Rerun</span>
                                </>
                              ) : (
                                <span>Manual</span>
                              )}
                            </span>
                          </td>

                          {/* Duration */}
                          <td className="py-3.5 px-4 font-mono text-[#F5F0E6]">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-[#B9B0A0]/60" />
                              <span>{formatDuration(exec.durationMs)}</span>
                            </div>
                          </td>

                          {/* Nodes count */}
                          <td className="py-3.5 px-4 text-[#B9B0A0]">
                            <div className="flex items-center space-x-1">
                              <Layers className="w-3 h-3 text-[#B9B0A0]/60" />
                              <span>{exec.nodeExecutions?.length || 0} nodes</span>
                            </div>
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 px-4 text-[#B9B0A0] text-[11px] whitespace-nowrap">
                            {formatDateTime(exec.createdAt || exec.startedAt)}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleRerunExecution(exec._id)}
                                disabled={rerunningId === exec._id}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.18)] text-[#F5F0E6] hover:bg-[#252419] hover:border-[rgba(229,180,91,0.3)] hover:text-[#E5B45B] text-[11px] font-medium transition-colors disabled:opacity-50"
                                title="Rerun workflow with original trigger payload"
                              >
                                <RotateCw className={`w-3 h-3 text-[#E5B45B] ${rerunningId === exec._id ? 'motion-safe:animate-spin' : ''}`} />
                                <span>{rerunningId === exec._id ? 'Running...' : 'Rerun'}</span>
                              </button>

                              <button
                                onClick={() => handleOpenDetail(exec._id)}
                                className="px-2.5 py-1 rounded-lg bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] hover:bg-[#2e2c1e] text-[11px] font-semibold transition-colors"
                              >
                                View Trace
                              </button>

                              <button
                                onClick={() => handleExportTraceJson(exec)}
                                className="p-1 rounded-lg text-[#B9B0A0] hover:text-[#E5B45B] hover:bg-[#0B0D0C] transition-colors"
                                title="Export Trace JSON"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setConfirmDeleteModal(exec._id)}
                                disabled={deletingId === exec._id}
                                className="p-1 rounded-lg text-[#B9B0A0] hover:text-[#C83C3C] hover:bg-[#0B0D0C] transition-colors disabled:opacity-50"
                                title="Delete Execution Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {wfId && (
                                <Link
                                  to={`/workflows/${wfId}`}
                                  className="p-1 rounded-lg text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#0B0D0C] transition-colors"
                                  title="Open in Workflow Editor"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[rgba(185,176,160,0.08)]">
                <span className="text-xs text-[#B9B0A0]">
                  Page <span className="font-semibold text-[#F5F0E6]">{currentPage}</span> of{' '}
                  <span className="font-semibold text-[#F5F0E6]">{totalPages}</span> ({totalExecutions} total)
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const prevPage = Math.max(1, currentPage - 1);
                      fetchExecutions(prevPage, statusFilter, triggerFilter);
                    }}
                    disabled={currentPage <= 1 || isLoading}
                    className="p-1.5 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.12)] text-[#B9B0A0] hover:text-[#F5F0E6] disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      const nextPage = Math.min(totalPages, currentPage + 1);
                      fetchExecutions(nextPage, statusFilter, triggerFilter);
                    }}
                    disabled={currentPage >= totalPages || isLoading}
                    className="p-1.5 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.12)] text-[#B9B0A0] hover:text-[#F5F0E6] disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Execution Trace Detail Modal */}
      {selectedExecutionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D0C]/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#151715] border border-[rgba(185,176,160,0.2)] rounded-2xl shadow-2xl shadow-inner-highlight flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[rgba(185,176,160,0.1)] flex items-start justify-between bg-[#0B0D0C]">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-[#F5F0E6]">
                    {selectedExecution?.workflow?.name || 'Execution Telemetry'}
                  </h3>
                  {selectedExecution && (
                    <StatusBadge
                      status={
                        selectedExecution.status === 'succeeded'
                          ? 'success'
                          : selectedExecution.status === 'failed'
                          ? 'failure'
                          : selectedExecution.status === 'running'
                          ? 'running'
                          : 'pending'
                      }
                      label={
                        selectedExecution.status === 'succeeded'
                          ? 'Succeeded'
                          : selectedExecution.status === 'failed'
                          ? 'Failed'
                          : selectedExecution.status === 'running'
                          ? 'Running'
                          : 'Queued'
                      }
                    />
                  )}
                </div>

                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[11px] text-[#B9B0A0] font-mono">
                    ID: {selectedExecutionId}
                  </span>
                  <button
                    onClick={() => handleCopyExecutionId(selectedExecutionId)}
                    className="p-1 rounded text-[#B9B0A0] hover:text-[#E5B45B] transition-colors"
                    title="Copy Execution ID"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-[#059669]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {selectedExecution && (
                  <>
                    <button
                      onClick={() => handleExportTraceJson(selectedExecution)}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#151715] hover:bg-[#1a1d1a] border border-[rgba(185,176,160,0.2)] text-xs font-semibold text-[#F5F0E6] hover:text-[#E5B45B] transition-colors"
                      title="Download complete JSON execution trace"
                    >
                      <Download className="w-3.5 h-3.5 text-[#E5B45B]" />
                      <span className="hidden sm:inline">Export JSON</span>
                    </button>
                    <button
                      onClick={() => handleRerunExecution(selectedExecution._id, true)}
                      disabled={rerunningId === selectedExecution._id}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E5B45B] to-[#D49E3F] text-[#0B0D0C] font-semibold text-xs hover:shadow-glow-gold transition-all disabled:opacity-50"
                      title="Rerun this execution"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${rerunningId === selectedExecution._id ? 'motion-safe:animate-spin' : ''}`} />
                      <span>{rerunningId === selectedExecution._id ? 'Rerunning...' : 'Rerun'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={handleCloseDetail}
                  className="p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {isLoadingDetail ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-[#E5B45B] motion-safe:animate-spin mx-auto" />
                  <p className="text-xs text-[#B9B0A0]">Loading execution telemetry trace...</p>
                </div>
              ) : detailError ? (
                <div className="p-4 rounded-xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 text-[#C83C3C] text-xs">
                  {detailError}
                </div>
              ) : selectedExecution ? (
                <>
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)]">
                    <div>
                      <span className="text-[10px] text-[#B9B0A0] block uppercase font-mono">Trigger</span>
                      <span className={`text-xs font-semibold capitalize flex items-center space-x-1 ${
                        selectedExecution.triggerSource === 'scheduled'
                          ? 'text-[#E5B45B]'
                          : selectedExecution.triggerSource === 'webhook'
                          ? 'text-[#059669]'
                          : selectedExecution.triggerSource === 'rerun'
                          ? 'text-[#E5B45B]'
                          : 'text-[#F5F0E6]'
                      }`}>
                        {selectedExecution.triggerSource === 'scheduled' ? (
                          <>
                            <Clock className="w-3 h-3 text-[#E5B45B]" />
                            <span>Scheduled</span>
                          </>
                        ) : selectedExecution.triggerSource === 'webhook' ? (
                          <>
                            <Globe className="w-3 h-3 text-[#059669]" />
                            <span>Webhook</span>
                          </>
                        ) : selectedExecution.triggerSource === 'rerun' ? (
                          <>
                            <RotateCw className="w-3 h-3 text-[#E5B45B]" />
                            <span>Rerun</span>
                          </>
                        ) : (
                          <span>Manual</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#B9B0A0] block uppercase font-mono">Started</span>
                      <span className="text-xs font-semibold text-[#F5F0E6]">
                        {formatDateTime(selectedExecution.startedAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#B9B0A0] block uppercase font-mono">Completed</span>
                      <span className="text-xs font-semibold text-[#F5F0E6]">
                        {formatDateTime(selectedExecution.completedAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#B9B0A0] block uppercase font-mono">Duration</span>
                      <span className="text-xs font-semibold text-[#E5B45B] font-mono">
                        {formatDuration(selectedExecution.durationMs)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#B9B0A0] block uppercase font-mono">Steps</span>
                      <span className="text-xs font-semibold text-[#F5F0E6]">
                        {selectedExecution.nodeExecutions?.length || 0} executed
                      </span>
                    </div>
                    {selectedExecution.rerunFrom && (
                      <div className="col-span-2 sm:col-span-5 pt-2 mt-1 border-t border-[rgba(185,176,160,0.08)] flex items-center justify-between text-[11px]">
                        <span className="text-[#B9B0A0] flex items-center space-x-1.5">
                          <RotateCw className="w-3 h-3 text-[#E5B45B]" />
                          <span>Rerun from previous execution:</span>
                        </span>
                        <button
                          onClick={() => handleOpenDetail(selectedExecution.rerunFrom)}
                          className="font-mono text-[#E5B45B] hover:underline"
                        >
                          {selectedExecution.rerunFrom}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Trigger Data / Webhook Payload Preview */}
                  {selectedExecution.triggerData && (
                    <div className="p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#B9B0A0]">
                        <div className="flex items-center space-x-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#059669]" />
                          <span>Trigger Event Payload</span>
                        </div>
                        <span className="text-[10px] uppercase font-mono text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-full border border-[#059669]/20">
                          {selectedExecution.triggerSource || 'webhook'}
                        </span>
                      </div>
                      <pre className="p-2.5 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.08)] text-[11px] font-mono text-[#F5F0E6] overflow-x-auto max-h-36">
                        {JSON.stringify(selectedExecution.triggerData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Top-Level Error Banner */}
                  {selectedExecution.error && (
                    <div className="p-3.5 rounded-xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 text-[#C83C3C] text-xs flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold block">Execution Error:</span>
                        <p className="font-mono text-[11px] mt-0.5 whitespace-pre-wrap">
                          {selectedExecution.error}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Node Executions Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#B9B0A0]">
                      Node Execution Steps
                    </h4>

                    {(!selectedExecution.nodeExecutions || selectedExecution.nodeExecutions.length === 0) ? (
                      <p className="text-xs text-[#B9B0A0]">No individual step traces recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedExecution.nodeExecutions.map((step, idx) => {
                          const isExpanded = expandedNodes[idx];
                          const stepSuccess = step.status === 'succeeded';
                          const stepFailed = step.status === 'failed';

                          return (
                            <div
                              key={step.nodeId || idx}
                              className="rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] overflow-hidden transition-all"
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                aria-expanded={isExpanded}
                                aria-label={`Toggle step ${idx + 1} details`}
                                onClick={() => toggleNodeExpand(idx)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleNodeExpand(idx);
                                  }
                                }}
                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#151715] transition-colors focus:outline-none focus:ring-1 focus:ring-[#E5B45B]/40"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#151715] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                                    Step {idx + 1}
                                  </span>
                                  <span className="text-xs font-semibold text-[#F5F0E6]">
                                    {step.nodeLabel || step.nodeType}
                                  </span>
                                  <span className="text-[10px] uppercase font-mono text-[#B9B0A0]/60">
                                    ({step.nodeType})
                                  </span>
                                  {step.nodeType === 'ai' && (
                                    Array.isArray(step.output?.failoverLog) && step.output.failoverLog.length > 1 ? (
                                      <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E5B45B]/15 text-[#E5B45B] border border-[rgba(229,180,91,0.3)]">
                                        <Sparkles className="w-2.5 h-2.5 text-[#E5B45B]" />
                                        <span>Failover ({step.output.failoverLog.length})</span>
                                      </span>
                                    ) : step.input?.enableFailover === false || step.output?.enableFailover === false ? (
                                      <span className="inline-flex items-center space-x-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#151715] text-[#B9B0A0] border border-[rgba(185,176,160,0.15)] font-mono">
                                        <span>Single-Provider</span>
                                      </span>
                                    ) : step.output?.provider ? (
                                      <span className="inline-flex items-center space-x-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20 font-mono uppercase">
                                        <span>{step.output.provider}</span>
                                      </span>
                                    ) : null
                                  )}
                                </div>

                                <div className="flex items-center space-x-2.5">
                                  <span className="text-xs font-mono text-[#B9B0A0]">
                                    {formatDuration(step.durationMs)}
                                  </span>
                                  <StatusBadge
                                    status={
                                      stepSuccess
                                        ? 'success'
                                        : stepFailed
                                        ? 'failure'
                                        : 'pending'
                                    }
                                    label={
                                      stepSuccess
                                        ? 'OK'
                                        : stepFailed
                                        ? 'Failed'
                                        : step.status
                                    }
                                  />
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-[#B9B0A0]" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-[#B9B0A0]" />
                                  )}
                                </div>
                              </div>

                              {/* Expanded Step Details */}
                              {isExpanded && (
                                <div className="p-3 pt-0 border-t border-[rgba(185,176,160,0.06)] space-y-3 mt-2">
                                  {/* AI Provider Attempts & Failover Visualizer */}
                                  {(step.nodeType === 'ai' || Boolean(step.output?.failoverLog || step.input?.failoverLog)) && (
                                    <div className="pt-2">
                                      <AiProviderAttemptsViewer step={step} />
                                    </div>
                                  )}

                                  {step.error && (
                                    <div className="p-2.5 rounded-lg bg-[#C83C3C]/10 border border-[#C83C3C]/30 text-[#C83C3C] text-[11px] font-mono">
                                      <span className="font-semibold block mb-0.5">Step Error:</span>
                                      {sanitizeErrorText(step.error)}
                                    </div>
                                  )}

                                  {step.status === 'skipped' && (
                                    <div className="p-2.5 rounded-lg bg-[rgba(185,176,160,0.08)] border border-[rgba(185,176,160,0.15)] text-[#B9B0A0] text-[11px]">
                                      <span className="font-semibold text-[#F5F0E6]">Step Skipped:</span> Branch condition not met or node was bypassed in this execution flow.
                                    </div>
                                  )}

                                  {/* Tabbed Inspector: Output / Input / Telemetry */}
                                  <div className="space-y-2 pt-1">
                                    <div className="flex items-center justify-between border-b border-[rgba(185,176,160,0.1)] pb-1.5">
                                      <div className="flex items-center space-x-1">
                                        {(() => {
                                          const isAiStep = step.nodeType === 'ai' || Boolean(step.output?.failoverLog || step.input?.failoverLog);
                                          const currentTab = activeStepTabs[idx] || 'output';
                                          const tabs = [
                                            { id: 'output', label: 'Output', count: step.output ? 1 : 0 },
                                            { id: 'input', label: 'Input', count: step.input ? 1 : 0 },
                                            ...(isAiStep ? [{ id: 'cascade', label: 'AI Cascade', count: Array.isArray(step.output?.failoverLog) ? step.output.failoverLog.length : 1 }] : []),
                                            { id: 'telemetry', label: 'Telemetry', count: 1 }
                                          ];
                                          return tabs.map((tab) => {
                                            const isActive = currentTab === tab.id;
                                            return (
                                              <button
                                                key={tab.id}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setStepTab(idx, tab.id);
                                                }}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all flex items-center space-x-1 ${
                                                  isActive
                                                    ? 'bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.3)] shadow-glow-gold'
                                                    : 'bg-[#151715] text-[#B9B0A0] hover:text-[#F5F0E6] border border-transparent'
                                                }`}
                                              >
                                                <span>{tab.label}</span>
                                                {tab.id !== 'telemetry' && (
                                                  <span className={`text-[9px] px-1 rounded-full ${isActive ? 'bg-[#E5B45B]/20 text-[#E5B45B]' : 'bg-[rgba(185,176,160,0.1)] text-[#B9B0A0]'}`}>
                                                    {tab.count}
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          });
                                        })()}
                                      </div>

                                      {/* One-click Copy JSON Button */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const currentTab = activeStepTabs[idx] || 'output';
                                          const dataToCopy = currentTab === 'output' 
                                            ? step.output 
                                            : currentTab === 'input' 
                                            ? step.input 
                                            : currentTab === 'cascade'
                                            ? (step.output?.failoverLog || step.output?.telemetry || { provider: step.output?.provider || 'gemini', status: step.status })
                                            : {
                                                nodeId: step.nodeId,
                                                nodeType: step.nodeType,
                                                status: step.status,
                                                durationMs: step.durationMs,
                                                startedAt: step.startedAt,
                                                completedAt: step.completedAt,
                                              };
                                          handleCopyStepJson(`${idx}-${currentTab}`, dataToCopy);
                                        }}
                                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#151715] hover:bg-[#1f221f] border border-[rgba(185,176,160,0.15)] text-[10px] font-mono text-[#B9B0A0] hover:text-[#E5B45B] transition-colors"
                                        title="Copy JSON to clipboard"
                                      >
                                        {copiedStepKey === `${idx}-${activeStepTabs[idx] || 'output'}` ? (
                                          <>
                                            <Check className="w-3 h-3 text-[#059669]" />
                                            <span className="text-[#059669]">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy JSON</span>
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    {/* Active Tab Panel */}
                                    {(activeStepTabs[idx] || 'output') === 'output' && (
                                      <div>
                                        {step.output ? (
                                          <div className="space-y-2">
                                            {step.output?.text && (
                                              <div className="p-2.5 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.08)]">
                                                <span className="text-[10px] font-mono text-[#E5B45B] uppercase block mb-1">
                                                  AI Generated Content:
                                                </span>
                                                <p className="text-xs text-[#F5F0E6] whitespace-pre-wrap leading-relaxed font-sans">
                                                  {step.output.text}
                                                </p>
                                              </div>
                                            )}
                                            <pre className="p-2.5 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.08)] text-[11px] font-mono text-[#F5F0E6] overflow-x-auto max-h-48">
                                              {typeof step.output === 'object'
                                                ? JSON.stringify(step.output, null, 2)
                                                : String(step.output)}
                                            </pre>
                                          </div>
                                        ) : (
                                          <p className="text-[11px] text-[#B9B0A0]/60 italic p-2">
                                            No output recorded for this step.
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {(activeStepTabs[idx] || 'output') === 'input' && (
                                      <div>
                                        {step.input ? (
                                          <pre className="p-2.5 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.08)] text-[11px] font-mono text-[#F5F0E6] overflow-x-auto max-h-48">
                                            {typeof step.input === 'object'
                                              ? JSON.stringify(step.input, null, 2)
                                              : String(step.input)}
                                          </pre>
                                        ) : (
                                          <p className="text-[11px] text-[#B9B0A0]/60 italic p-2">
                                            No input parameters recorded for this step.
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {(activeStepTabs[idx] || 'output') === 'cascade' && (
                                      <div className="space-y-2">
                                        <AiProviderAttemptsViewer step={step} />
                                      </div>
                                    )}

                                    {(activeStepTabs[idx] || 'output') === 'telemetry' && (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.08)] text-[11px]">
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-[#B9B0A0] block">Node ID</span>
                                            <span className="font-mono text-[#F5F0E6] truncate block">{step.nodeId || '—'}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-[#B9B0A0] block">Node Type</span>
                                            <span className="font-mono text-[#F5F0E6] uppercase">{step.nodeType || '—'}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-[#B9B0A0] block">Duration</span>
                                            <span className="font-mono text-[#E5B45B]">{formatDuration(step.durationMs)}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-[#B9B0A0] block">Step Status</span>
                                            <span className="font-mono capitalize text-[#F5F0E6]">{step.status || '—'}</span>
                                          </div>
                                        </div>
                                        {(step.nodeType === 'ai' || Boolean(step.output?.failoverLog || step.input?.failoverLog)) && (
                                          <div className="pt-2 border-t border-[rgba(185,176,160,0.08)]">
                                            <AiProviderAttemptsViewer step={step} compact={true} />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[rgba(185,176,160,0.1)] bg-[#0B0D0C] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedExecution?.workflow?._id && (
                  <Link
                    to={`/workflows/${selectedExecution.workflow._id}`}
                    className="inline-flex items-center space-x-1.5 text-xs text-[#E5B45B] hover:text-[#D49E3F] font-semibold"
                  >
                    <span>Open in Workflow Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {selectedExecution && (
                  <button
                    onClick={() => setConfirmDeleteModal(selectedExecution._id)}
                    disabled={deletingId === selectedExecution._id}
                    className="inline-flex items-center space-x-1 text-xs text-[#C83C3C] hover:text-[#e05252] font-semibold transition-colors disabled:opacity-50"
                    title="Delete this execution record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2.5">
                {selectedExecution && (
                  <>
                    <button
                      onClick={() => handleExportTraceJson(selectedExecution)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#151715] hover:bg-[#1a1d1a] border border-[rgba(185,176,160,0.2)] text-xs font-semibold text-[#F5F0E6] hover:text-[#E5B45B] transition-colors"
                      title="Download complete JSON execution trace"
                    >
                      <Download className="w-3.5 h-3.5 text-[#E5B45B]" />
                      <span>Export JSON</span>
                    </button>
                    <button
                      onClick={() => handleRerunExecution(selectedExecution._id, true)}
                      disabled={rerunningId === selectedExecution._id}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#E5B45B] to-[#D49E3F] text-[#0B0D0C] text-xs font-semibold hover:shadow-glow-gold transition-all disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${rerunningId === selectedExecution._id ? 'motion-safe:animate-spin' : ''}`} />
                      <span>{rerunningId === selectedExecution._id ? 'Rerunning...' : 'Rerun Workflow'}</span>
                    </button>
                  </>
                )}

                <button
                  onClick={handleCloseDetail}
                  className="px-4 py-1.5 rounded-xl bg-[#151715] hover:bg-[#1a1d1a] border border-[rgba(185,176,160,0.2)] text-xs font-semibold text-[#F5F0E6] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Single Delete Modal */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D0C]/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#151715] border border-[rgba(200,60,60,0.3)] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#C83C3C]/15 border border-[#C83C3C]/30 flex items-center justify-center text-[#C83C3C]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F0E6]">Delete Execution Record</h3>
                <p className="text-xs text-[#B9B0A0] font-mono mt-0.5">
                  ID: #{confirmDeleteModal.slice(-8)}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Are you sure you want to permanently delete this execution record and its associated node telemetry? This action cannot be reversed.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmDeleteModal(null)}
                disabled={deletingId === confirmDeleteModal}
                className="px-4 py-2 rounded-xl bg-[#0B0D0C] hover:bg-[#1a1d1a] border border-[rgba(185,176,160,0.2)] text-xs font-semibold text-[#B9B0A0] hover:text-[#F5F0E6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteExecution(confirmDeleteModal)}
                disabled={deletingId === confirmDeleteModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#C83C3C] hover:bg-[#a63030] text-white text-xs font-semibold transition-colors shadow-lg disabled:opacity-50"
              >
                {deletingId === confirmDeleteModal ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 motion-safe:animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Purge Failed Modal */}
      {confirmPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D0C]/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#151715] border border-[rgba(200,60,60,0.3)] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#C83C3C]/15 border border-[#C83C3C]/30 flex items-center justify-center text-[#C83C3C]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F0E6]">Purge Failed Executions</h3>
                <p className="text-xs text-[#B9B0A0] mt-0.5">
                  Total Failed: <span className="text-[#C83C3C] font-semibold font-mono">{stats.failed}</span> runs
                </p>
              </div>
            </div>

            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              This will permanently delete all <strong className="text-[#F5F0E6]">{stats.failed}</strong> failed execution traces recorded for your workflows. Successful and running executions will remain intact.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmPurgeModal(false)}
                disabled={isPurging}
                className="px-4 py-2 rounded-xl bg-[#0B0D0C] hover:bg-[#1a1d1a] border border-[rgba(185,176,160,0.2)] text-xs font-semibold text-[#B9B0A0] hover:text-[#F5F0E6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurgeFailed}
                disabled={isPurging}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#C83C3C] hover:bg-[#a63030] text-white text-xs font-semibold transition-colors shadow-lg disabled:opacity-50"
              >
                {isPurging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 motion-safe:animate-spin" />
                    <span>Purging...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge All Failed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
