import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Workflow, 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Layers, 
  Sparkles, 
  Activity, 
  ArrowRight,
  Server,
  Terminal,
  Zap,
  ArrowUpRight,
  Trash2,
  Edit3,
  Copy,
  Clock,
  Loader2,
  RefreshCw,
  Check,
  X,
  Search,
  Globe,
  Shield,
  GitBranch
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getWorkflows, 
  deleteWorkflow, 
  duplicateWorkflow,
  getUserExecutionStats, 
  getUserExecutions, 
  getErrorMessage 
} from '../services/api';
import Sidebar from '../components/dashboard/Sidebar';
import TopNav from '../components/dashboard/TopNav';
import StatCard from '../components/dashboard/StatCard';
import EmptyState from '../components/dashboard/EmptyState';
import StatusBadge from '../components/dashboard/StatusBadge';

const formatDate = (isoString) => {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'Recently';
  }
};

const formatDuration = (ms) => {
  if (typeof ms !== 'number' || isNaN(ms)) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Live Workflow State
  const [workflows, setWorkflows] = useState([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);
  const [workflowError, setWorkflowError] = useState(null);
  const [workflowToDelete, setWorkflowToDelete] = useState(null);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [isDuplicatingId, setIsDuplicatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState(null);


  // Execution Telemetry State
  const [executionStats, setExecutionStats] = useState({
    total: 0,
    succeeded: 0,
    failed: 0,
    running: 0,
    queued: 0,
    successRate: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [recentExecutions, setRecentExecutions] = useState([]);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(true);

  // Fetch workflows belonging to authenticated user
  const fetchWorkflows = useCallback(async () => {
    setIsLoadingWorkflows(true);
    setWorkflowError(null);
    try {
      const response = await getWorkflows();
      if (response?.success && Array.isArray(response.workflows)) {
        setWorkflows(response.workflows);
      } else {
        setWorkflowError('Unable to retrieve workflows.');
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setWorkflowError(msg || 'Failed to load workflows.');
    } finally {
      setIsLoadingWorkflows(false);
    }
  }, []);

  // Fetch live execution telemetry
  const fetchExecutionData = useCallback(async () => {
    setIsLoadingStats(true);
    setIsLoadingExecutions(true);
    try {
      const [statsRes, execsRes] = await Promise.allSettled([
        getUserExecutionStats(),
        getUserExecutions({ limit: 5 })
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success && statsRes.value.stats) {
        setExecutionStats(statsRes.value.stats);
      }
      if (execsRes.status === 'fulfilled' && execsRes.value?.success && Array.isArray(execsRes.value.executions)) {
        setRecentExecutions(execsRes.value.executions);
      }
    } catch (err) {
      console.error('Failed to load execution telemetry:', err);
    } finally {
      setIsLoadingStats(false);
      setIsLoadingExecutions(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
    fetchExecutionData();
  }, [fetchWorkflows, fetchExecutionData]);

  // Handle workflow deletion
  const confirmDeleteWorkflow = async () => {
    if (!workflowToDelete || isDeletingId) return;
    const id = workflowToDelete._id;
    setIsDeletingId(id);
    try {
      const response = await deleteWorkflow(id);
      if (response?.success) {
        setWorkflows((prev) => prev.filter((w) => w._id !== id));
        setActionFeedback({
          type: 'success',
          message: `Workflow "${workflowToDelete.name}" was successfully deleted.`
        });
        setWorkflowToDelete(null);
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        throw new Error(response?.message || 'Failed to delete workflow.');
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setActionFeedback({
        type: 'error',
        message: msg || 'Failed to delete workflow.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Handle workflow duplication
  const handleDuplicateWorkflow = async (workflow) => {
    if (!workflow?._id || isDuplicatingId) return;
    const id = workflow._id;
    setIsDuplicatingId(id);
    try {
      const response = await duplicateWorkflow(id);
      if (response?.success && response.workflow) {
        setWorkflows((prev) => [response.workflow, ...prev]);
        setActionFeedback({
          type: 'success',
          message: `Duplicated "${workflow.name}" as "${response.workflow.name}".`
        });
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        throw new Error(response?.message || 'Failed to duplicate workflow.');
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setActionFeedback({
        type: 'error',
        message: msg || 'Failed to duplicate workflow.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsDuplicatingId(null);
    }
  };


  return (
    <div className="min-h-screen bg-[#0B0D0C] text-[#F5F0E6] flex font-sans selection:bg-[#E5B45B]/20 selection:text-[#E5B45B]">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Navigation */}
        <TopNav 
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)} 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />


        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* Welcome Section */}
          <section className="relative overflow-hidden rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] p-6 sm:p-8 shadow-2xl">
            {/* Abstract Gold & Emerald Wave Artwork */}
            <svg 
              className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 h-full opacity-25 pointer-events-none" 
              viewBox="0 0 600 240" 
              fill="none" 
              preserveAspectRatio="none"
            >
              <path 
                d="M0,120 C180,220 320,30 600,130 L600,240 L0,240 Z" 
                fill="url(#goldGradient)" 
              />
              <path 
                d="M0,160 C150,60 380,230 600,140 L600,240 L0,240 Z" 
                fill="url(#emeraldGradient)" 
              />
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E5B45B" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#252419" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0B0D0C" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="emeraldGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
                  <stop offset="80%" stopColor="#151715" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#0B0D0C" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Subtle glow orb */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-[#E5B45B]/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>FlowForge AI • Autonomous Engine v3.0</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#F5F0E6]">
                  Welcome back,{' '}
                  <span className="text-[#E5B45B]">
                    {user?.name || user?.email || 'Builder'}
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-[#B9B0A0] leading-relaxed">
                  Orchestrate modular DAG pipelines, configure multi-provider AI failover, and inspect millisecond-level step telemetry across your workspace.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#0B0D0C]/80 border border-[rgba(185,176,160,0.15)] text-[11px] font-mono text-[#B9B0A0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                    <span>Engine: Express + MongoDB</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#0B0D0C]/80 border border-[rgba(229,180,91,0.25)] text-[11px] font-mono text-[#E5B45B]">
                    <Sparkles className="w-3 h-3 text-[#E5B45B]" />
                    <span>Primary AI: gemini-2.5-flash</span>
                  </span>
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#0B0D0C]/80 border border-[rgba(185,176,160,0.15)] text-[11px] font-mono text-[#B9B0A0]">
                    <Shield className="w-3 h-3 text-[#B9B0A0]" />
                    <span>Tenancy: Isolated Scope</span>
                  </span>
                </div>
              </div>

              {/* Primary Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/workflows/new')}
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] text-sm font-bold shadow-lg shadow-[#E5B45B]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 text-[#0B0D0C]" />
                  <span>Create Workflow</span>
                </button>

                <button
                  onClick={() => navigate('/templates')}
                  className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#151715] hover:bg-[#1C1F1C] text-[#F5F0E6] text-sm font-medium border border-[rgba(185,176,160,0.15)] transition-colors"
                >
                  <Layers className="w-4 h-4 text-[#B9B0A0]" />
                  <span>Browse Templates</span>
                </button>
              </div>
            </div>
          </section>

          {/* Statistics Cards */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#B9B0A0]">
                Telemetry & Statistics
              </h2>
              <span className="text-[11px] text-[#B9B0A0]/70 font-mono">
                Real-Time Database Metrics
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Workflows"
                value={isLoadingWorkflows ? '...' : workflows.length.toString()}
                note={
                  isLoadingWorkflows
                    ? 'Syncing...'
                    : `${workflows.length} configured pipeline${workflows.length === 1 ? '' : 's'}`
                }
                icon={Workflow}
                accentColor="gold"
                badge="Active"
              />
              <StatCard
                label="Successful Runs"
                value={isLoadingStats ? '...' : executionStats.succeeded.toString()}
                note={
                  isLoadingStats
                    ? 'Syncing...'
                    : executionStats.total > 0
                    ? `${executionStats.successRate}% completion rate`
                    : 'Awaiting execution'
                }
                icon={CheckCircle2}
                accentColor="emerald"
                badge={executionStats.total > 0 && executionStats.failed === 0 ? '100% Health' : 'Completed'}
              />
              <StatCard
                label="Failed Runs"
                value={isLoadingStats ? '...' : executionStats.failed.toString()}
                note={
                  isLoadingStats
                    ? 'Syncing...'
                    : executionStats.failed === 0
                    ? '0 runtime anomalies'
                    : `${executionStats.failed} anomaly recorded`
                }
                icon={AlertCircle}
                accentColor="ruby"
                badge={executionStats.failed === 0 ? 'Zero Errors' : 'Anomalies'}
              />
              <StatCard
                label="Total Executions"
                value={isLoadingStats ? '...' : executionStats.total.toString()}
                note={
                  isLoadingStats
                    ? 'Syncing...'
                    : executionStats.running > 0
                    ? `${executionStats.running} running now`
                    : executionStats.total === 0
                    ? 'Engine idle'
                    : `${executionStats.total} total runs`
                }
                icon={PlayCircle}
                accentColor="neutral"
                badge={executionStats.total > 0 ? 'Live' : 'Idle'}
              />
            </div>
          </section>

          {/* Recent Workflows & Execution Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Workflows (2 Columns on Desktop) */}
            <section className="lg:col-span-2 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[rgba(185,176,160,0.08)] pb-4">
                <div className="flex items-center space-x-2.5">
                  <Workflow className="w-5 h-5 text-[#E5B45B]" />
                  <h2 className="text-lg font-bold text-[#F5F0E6] tracking-tight">
                    Recent Workflows
                  </h2>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0B0D0C] text-[#B9B0A0] font-medium border border-[rgba(185,176,160,0.12)]">
                    {isLoadingWorkflows ? 'Loading...' : `${workflows.length} Configured`}
                  </span>
                  <button
                    onClick={() => navigate('/workflows/new')}
                    className="hidden sm:inline-flex items-center space-x-1 text-xs font-semibold text-[#E5B45B] hover:text-[#D49E3F] transition-colors"
                  >
                    <span>New Workflow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Feedback Toast */}
              {actionFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-fade-in ${
                    actionFeedback.type === 'success'
                      ? 'bg-[#059669]/10 border-[#059669]/30 text-[#059669]'
                      : 'bg-[#C83C3C]/10 border-[#C83C3C]/30 text-[#C83C3C]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {actionFeedback.type === 'success' ? (
                      <Check className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{actionFeedback.message}</span>
                  </div>
                  <button
                    onClick={() => setActionFeedback(null)}
                    className="p-1 rounded hover:bg-black/20 text-current transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* State 1: Loading Skeleton */}
              {isLoadingWorkflows && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] flex items-center justify-between motion-safe:animate-pulse"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-9 h-9 rounded-lg bg-[#151715]" />
                        <div className="space-y-2">
                          <div className="h-3.5 w-40 rounded bg-[#151715]" />
                          <div className="h-2.5 w-28 rounded bg-[#151715]" />
                        </div>
                      </div>
                      <div className="h-8 w-16 rounded bg-[#151715]" />
                    </div>
                  ))}
                </div>
              )}

              {/* State 2: Fetch Error with Retry */}
              {!isLoadingWorkflows && workflowError && (
                <div className="p-6 rounded-2xl border border-[rgba(200,60,60,0.3)] bg-[#C83C3C]/5 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-[#C83C3C] mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F0E6]">Unable to Load Workflows</h3>
                    <p className="text-xs text-[#B9B0A0] mt-1">{workflowError}</p>
                  </div>
                  <button
                    onClick={fetchWorkflows}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#151715] hover:bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)] text-xs font-semibold transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* State 3: Empty State */}
              {!isLoadingWorkflows && !workflowError && workflows.length === 0 && (
                <EmptyState
                  icon={Workflow}
                  title="No Workflows Configured Yet"
                  description="Build visual pipelines with custom trigger nodes, webhooks, and AI self-healing actions. Once created, workflow status, triggers, and execution history will appear here."
                  actionLabel="Create Your First Workflow"
                  onAction={() => navigate('/workflows/new')}
                />
              )}

              {/* State 4: Live Workflows List */}
              {!isLoadingWorkflows && !workflowError && workflows.length > 0 && (() => {
                const trimmedQuery = searchQuery.trim().toLowerCase();
                const filteredWorkflows = trimmedQuery
                  ? workflows.filter(
                      (wf) =>
                        wf.name.toLowerCase().includes(trimmedQuery) ||
                        (wf.description && wf.description.toLowerCase().includes(trimmedQuery))
                    )
                  : workflows;

                if (trimmedQuery && filteredWorkflows.length === 0) {
                  return (
                    <div className="p-8 rounded-2xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-center space-y-3">
                      <Search className="w-8 h-8 text-[#B9B0A0]/60 mx-auto" />
                      <h4 className="text-sm font-semibold text-[#F5F0E6]">No Workflows Found</h4>
                      <p className="text-xs text-[#B9B0A0]">
                        No workflows match &ldquo;{searchQuery}&rdquo;. Try a different keyword or clear your filter.
                      </p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#151715] hover:bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)] text-xs font-semibold transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear Search</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {trimmedQuery && (
                      <div className="flex items-center justify-between px-1 text-xs text-[#B9B0A0]">
                        <span>Showing {filteredWorkflows.length} matching {filteredWorkflows.length === 1 ? 'workflow' : 'workflows'}</span>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-[#E5B45B] hover:underline text-xs flex items-center space-x-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Clear filter</span>
                        </button>
                      </div>
                    )}

                    {filteredWorkflows.map((wf) => {
                      const nodeCount = Array.isArray(wf.nodes) ? wf.nodes.length : 0;
                      const edgeCount = Array.isArray(wf.edges) ? wf.edges.length : 0;
                      const updatedDate = formatDate(wf.updatedAt || wf.createdAt);
                      const isCronEnabled = Boolean(wf.schedule?.enabled);
                      const isWebhookEnabled = Boolean(wf.webhook?.enabled);
                      const hasAiNode = Array.isArray(wf.nodes) && wf.nodes.some(n => n.data?.type === 'ai' || n.type === 'ai');
                      const hasConditionNode = Array.isArray(wf.nodes) && wf.nodes.some(n => n.data?.type === 'condition' || n.type === 'condition');

                      return (
                        <div
                          key={wf._id}
                          className="group p-4 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          {/* Info */}
                          <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#151715] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B] flex-shrink-0 group-hover:scale-105 transition-transform">
                              <Workflow className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-bold text-[#F5F0E6] truncate group-hover:text-[#E5B45B] transition-colors">
                                  {wf.name}
                                </h3>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/25 flex-shrink-0">
                                  Saved
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-[#B9B0A0] mt-1.5 font-mono">
                                {/* Trigger Status */}
                                {isCronEnabled ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)] text-[10px]">
                                    <Clock className="w-3 h-3 text-[#E5B45B]" />
                                    <span>Cron: {wf.schedule?.cron || 'Active'}</span>
                                  </span>
                                ) : isWebhookEnabled ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#059669]/15 text-[#059669] border border-[#059669]/25 text-[10px]">
                                    <Globe className="w-3 h-3 text-[#059669]" />
                                    <span>Webhook Active</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#151715] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)] text-[10px]">
                                    <span>Manual Run</span>
                                  </span>
                                )}

                                {/* Node Features */}
                                {hasAiNode && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)] text-[10px]">
                                    <Sparkles className="w-2.5 h-2.5 text-[#E5B45B]" />
                                    <span>AI Reasoner</span>
                                  </span>
                                )}

                                {hasConditionNode && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#151715] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)] text-[10px]">
                                    <GitBranch className="w-2.5 h-2.5 text-[#B9B0A0]" />
                                    <span>Branching</span>
                                  </span>
                                )}

                                <span className="text-[rgba(185,176,160,0.25)]">•</span>
                                <span>{nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}</span>
                                <span className="text-[rgba(185,176,160,0.25)]">•</span>
                                <span>{edgeCount} {edgeCount === 1 ? 'connection' : 'connections'}</span>
                                <span className="text-[rgba(185,176,160,0.25)]">•</span>
                                <span className="text-[#B9B0A0]/70 flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-[#B9B0A0]/50" />
                                  <span>{updatedDate}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => navigate(`/workflows/${wf._id}`)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#151715] hover:bg-[#252419] text-[#F5F0E6] hover:text-[#E5B45B] border border-[rgba(185,176,160,0.15)] hover:border-[#E5B45B]/40 text-xs font-semibold transition-colors"
                              title="Open in Visual Builder"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#E5B45B]" />
                              <span>Open</span>
                            </button>
                            <button
                              onClick={() => handleDuplicateWorkflow(wf)}
                              disabled={isDuplicatingId === wf._id || isDeletingId === wf._id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#151715] hover:bg-[#252419] text-[#B9B0A0] hover:text-[#E5B45B] border border-[rgba(185,176,160,0.15)] hover:border-[#E5B45B]/40 text-xs font-semibold transition-colors disabled:opacity-50"
                              title="Duplicate Workflow"
                              aria-label={`Duplicate ${wf.name}`}
                            >
                              {isDuplicatingId === wf._id ? (
                                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin text-[#E5B45B]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden sm:inline">Duplicate</span>
                            </button>
                            <button
                              onClick={() => setWorkflowToDelete(wf)}
                              disabled={isDeletingId === wf._id || isDuplicatingId === wf._id}
                              className="p-1.5 rounded-lg bg-[#151715] hover:bg-[#C83C3C]/15 text-[#B9B0A0] hover:text-[#C83C3C] border border-[rgba(185,176,160,0.15)] hover:border-[#C83C3C]/40 transition-colors disabled:opacity-50"
                              title="Delete Workflow"
                              aria-label={`Delete ${wf.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </section>

            {/* Execution Activity (1 Column on Desktop) */}
            <section className="rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[rgba(185,176,160,0.08)] pb-4">
                <div className="flex items-center space-x-2.5">
                  <Activity className="w-5 h-5 text-[#059669]" />
                  <h2 className="text-lg font-bold text-[#F5F0E6] tracking-tight">
                    Execution Activity
                  </h2>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    to="/executions"
                    className="text-xs font-semibold text-[#E5B45B] hover:text-[#D49E3F] transition-colors flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Status Specs Panel */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B0A0]/70">
                    Execution Telemetry:
                  </span>
                  <div className="flex items-center space-x-1.5 text-[11px] text-[#059669]">
                    <span className="w-2 h-2 rounded-full bg-[#059669] motion-safe:animate-pulse" />
                    <span>Telemetry Live</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] flex flex-col space-y-1">
                    <span className="text-[10px] text-[#B9B0A0]">Completed</span>
                    <StatusBadge status="success" label={`${executionStats.succeeded} Succeeded`} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] flex flex-col space-y-1">
                    <span className="text-[10px] text-[#B9B0A0]">Anomalies</span>
                    <StatusBadge status="failure" label={`${executionStats.failed} Failed`} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] flex flex-col space-y-1">
                    <span className="text-[10px] text-[#B9B0A0]">In Progress</span>
                    <StatusBadge status="running" label={`${executionStats.running} Running`} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] flex flex-col space-y-1">
                    <span className="text-[10px] text-[#B9B0A0]">Queued</span>
                    <StatusBadge status="pending" label={`${executionStats.queued} Queued`} />
                  </div>
                </div>
              </div>

              {/* Real Recent Executions List or Empty State */}
              {isLoadingExecutions ? (
                <div className="py-8 text-center space-y-2">
                  <Loader2 className="w-5 h-5 text-[#E5B45B] motion-safe:animate-spin mx-auto" />
                  <p className="text-xs text-[#B9B0A0]">Loading telemetry logs...</p>
                </div>
              ) : recentExecutions.length === 0 ? (
                <div className="p-5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] text-center space-y-2">
                  <Terminal className="w-6 h-6 text-[#B9B0A0] mx-auto opacity-70" />
                  <h4 className="text-xs font-semibold text-[#F5F0E6]">No Execution History</h4>
                  <p className="text-[11px] text-[#B9B0A0] leading-relaxed">
                    Execution telemetry and step completion durations stream here automatically once triggers fire.
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={() => navigate('/workflows/new')}
                      className="text-xs font-medium text-[#E5B45B] hover:text-[#D49E3F] transition-colors"
                    >
                      Run a Workflow →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B9B0A0]/70 block">
                    Recent Runs:
                  </span>
                  <div className="space-y-2">
                    {recentExecutions.map((exec) => {
                      const wfName = exec.workflow?.name || 'Untitled Workflow';
                      const isSuccess = exec.status === 'succeeded';
                      const isFailed = exec.status === 'failed';
                      const isRunning = exec.status === 'running';
                      const triggerSource = exec.triggerSource || 'manual';
                      const stepsCount = Array.isArray(exec.nodeExecutions) ? exec.nodeExecutions.length : 0;

                      return (
                        <div
                          key={exec._id}
                          onClick={() => navigate(`/executions?id=${exec._id}`)}
                          className="p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] hover:border-[rgba(229,180,91,0.3)] hover:bg-[#111311] hover:shadow-glow-gold/15 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-semibold text-[#F5F0E6] truncate block group-hover:text-[#E5B45B] transition-colors">
                                {wfName}
                              </span>
                              {triggerSource === 'webhook' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#059669]/15 text-[#059669] border border-[#059669]/25 flex-shrink-0">
                                  webhook
                                </span>
                              )}
                              {triggerSource === 'scheduled' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)] flex-shrink-0">
                                  scheduled
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-[#B9B0A0]/70 mt-1 font-mono">
                              <span className="text-[#F5F0E6]">
                                {formatDuration(exec.durationMs)}
                              </span>
                              {stepsCount > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{stepsCount} {stepsCount === 1 ? 'step' : 'steps'}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatDate(exec.createdAt || exec.startedAt)}</span>
                            </div>
                          </div>

                          <StatusBadge
                            status={isSuccess ? 'success' : isFailed ? 'failure' : isRunning ? 'running' : 'pending'}
                            label={isSuccess ? 'Success' : isFailed ? 'Failed' : isRunning ? 'Running' : 'Queued'}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Quick Actions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#B9B0A0]">
                Quick Actions
              </h2>
              <span className="text-[11px] text-[#B9B0A0]/70">
                Workspace Shortcuts
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Action 1: Create Workflow */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Create Workflow"
                onClick={() => navigate('/workflows/new')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/workflows/new');
                  }
                }}
                className="group cursor-pointer p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 space-y-3 focus:outline-none focus:ring-2 focus:ring-[#E5B45B]/40"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Workflow className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)]">
                    Canvas
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F0E6] group-hover:text-[#E5B45B] transition-colors">
                    Create Workflow
                  </h3>
                  <p className="text-xs text-[#B9B0A0] mt-1 leading-relaxed">
                    Build visual pipelines with custom triggers, LLM agents, and error branches.
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#E5B45B] pt-1">
                  <span>Launch Canvas</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Action 2: Browse Templates */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Browse Templates"
                onClick={() => navigate('/templates')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/templates');
                  }
                }}
                className="group cursor-pointer p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 space-y-3 focus:outline-none focus:ring-2 focus:ring-[#E5B45B]/40"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)]">
                    Blueprints
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F0E6] group-hover:text-[#E5B45B] transition-colors">
                    Browse Templates
                  </h3>
                  <p className="text-xs text-[#B9B0A0] mt-1 leading-relaxed">
                    Deploy pre-built blueprints for database sync, notifications, and AI agents.
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#E5B45B] pt-1">
                  <span>Explore Library</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Action 3: View Executions */}
              <div
                role="button"
                tabIndex={0}
                aria-label="View Executions"
                onClick={() => navigate('/executions')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/executions');
                  }
                }}
                className="group cursor-pointer p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#059669]/40 hover:shadow-glow-emerald transition-all duration-300 space-y-3 focus:outline-none focus:ring-2 focus:ring-[#059669]/40"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#059669]/15 border border-[#059669]/30 text-[#059669] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
                    Live
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F0E6] group-hover:text-[#059669] transition-colors">
                    View Executions
                  </h3>
                  <p className="text-xs text-[#B9B0A0] mt-1 leading-relaxed">
                    Inspect telemetry traces, step execution duration, and error recoveries.
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#059669] pt-1">
                  <span>Open Stream</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </div>
          </section>

          {/* Templates Promotion Section */}
          <section className="rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.14)] p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[rgba(185,176,160,0.08)] pb-6">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] text-[10px] font-bold uppercase tracking-wider">
                  <Zap className="w-3 h-3" />
                  <span>Production Blueprints</span>
                </div>
                <h3 className="text-xl font-bold text-[#F5F0E6] tracking-tight">
                  Accelerate Deployment with Workflow Templates
                </h3>
                <p className="text-xs sm:text-sm text-[#B9B0A0]">
                  Jumpstart your automation with pre-configured event listeners, automated data bridges, and self-healing error recovery chains.
                </p>
              </div>

              <button
                onClick={() => navigate('/templates')}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#252419] hover:bg-[#2e2d20] text-[#E5B45B] border border-[rgba(229,180,91,0.3)] text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02]"
              >
                <span>Browse All Templates</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Featured Template Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                onClick={() => navigate('/templates')}
                className="cursor-pointer p-4 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] hover:border-[#E5B45B]/30 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5B45B]">Data Bridge</span>
                  <span className="text-[10px] text-[#B9B0A0]">REST API</span>
                </div>
                <h4 className="text-sm font-semibold text-[#F5F0E6]">REST API Data Bridge</h4>
                <p className="text-xs text-[#B9B0A0] leading-relaxed">
                  Fetches remote payload, validates response code 200, and formats outbound dispatch.
                </p>
              </div>

              <div 
                onClick={() => navigate('/templates')}
                className="cursor-pointer p-4 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] hover:border-[#059669]/30 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669]">Self-Healing</span>
                  <span className="text-[10px] text-[#B9B0A0]">AI Triage</span>
                </div>
                <h4 className="text-sm font-semibold text-[#F5F0E6]">AI Incident Triage & Auto-Retry</h4>
                <p className="text-xs text-[#B9B0A0] leading-relaxed">
                  Analyzes operational logs with Gemini AI, branching to auto-heal or urgent escalation.
                </p>
              </div>

              <div 
                onClick={() => navigate('/templates')}
                className="cursor-pointer p-4 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] hover:border-[#E5B45B]/30 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5B45B]">AI Pipeline</span>
                  <span className="text-[10px] text-[#B9B0A0]">Classification</span>
                </div>
                <h4 className="text-sm font-semibold text-[#F5F0E6]">Sentiment Routing Pipeline</h4>
                <p className="text-xs text-[#B9B0A0] leading-relaxed">
                  Classifies customer feedback sentiment using LLM reasoning and routes to VIP care or standard log.
                </p>
              </div>
            </div>
          </section>

          {/* Architecture Verification Footer */}
          <section className="rounded-2xl bg-[#151715]/60 border border-[rgba(185,176,160,0.08)] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#B9B0A0]">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-[#E5B45B]" />
                <span className="text-[#F5F0E6] font-medium">FlowForge AI Platform</span>
                <span>•</span>
                <span>Luxury Industrial-Tech Architecture</span>
              </div>

              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1.5 text-[#059669]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  <span>Backend & DB Verified</span>
                </span>
                <span className="text-[#B9B0A0]/60">JWT Protected Session</span>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Delete Workflow Confirmation Modal */}
      {workflowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D0C]/80 backdrop-blur-sm animate-fade-in select-none">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.18)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(185,176,160,0.08)]">
              <div className="flex items-center space-x-2.5 text-[#C83C3C]">
                <div className="w-8 h-8 rounded-lg bg-[#C83C3C]/15 border border-[#C83C3C]/30 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#F5F0E6]">Delete Workflow</h3>
              </div>
              <button
                onClick={() => {
                  if (!isDeletingId) setWorkflowToDelete(null);
                }}
                disabled={Boolean(isDeletingId)}
                className="p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#0B0D0C] transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#B9B0A0] leading-relaxed">
              <p>
                Are you sure you want to delete <strong className="text-[#F5F0E6]">"{workflowToDelete.name}"</strong>?
              </p>
              <p className="text-[#C83C3C]/90">
                This will permanently delete this visual workflow, its nodes, and all configuration from MongoDB. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[rgba(185,176,160,0.08)]">
              <button
                type="button"
                onClick={() => setWorkflowToDelete(null)}
                disabled={Boolean(isDeletingId)}
                className="px-4 py-2 rounded-xl bg-[#0B0D0C] hover:bg-[#1C1F1C] text-[#B9B0A0] hover:text-[#F5F0E6] border border-[rgba(185,176,160,0.15)] text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteWorkflow}
                disabled={Boolean(isDeletingId)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#C83C3C] hover:bg-[#A82E2E] text-[#F5F0E6] text-xs font-bold transition-all shadow-lg shadow-[#C83C3C]/20 disabled:opacity-50"
              >
                {isDeletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Workflow</span>
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
