import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, 
  Search, 
  Sparkles, 
  Workflow, 
  ArrowRight, 
  Loader2, 
  Cpu, 
  Activity, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Zap,
  Globe,
  Sliders
} from 'lucide-react';
import { createWorkflow, duplicateWorkflow, getWorkflows, getErrorMessage } from '../services/api';
import Sidebar from '../components/dashboard/Sidebar';
import TopNav from '../components/dashboard/TopNav';

import { BUILT_IN_TEMPLATES } from '../data/templatesData';
export { BUILT_IN_TEMPLATES };

export default function Templates() {
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // User Workflows State (for "My Saved Workflows" tab)
  const [userWorkflows, setUserWorkflows] = useState([]);
  const [isLoadingUserWorkflows, setIsLoadingUserWorkflows] = useState(false);
  const [userWorkflowsError, setUserWorkflowsError] = useState(null);

  // Instantiation State to prevent duplicate clicks
  const [instantiatingId, setInstantiatingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Categories list
  const categories = [
    'All',
    'AI & Automation',
    'Integrations & Webhooks',
    'Monitoring & Ops',
    'Customer Experience',
    'My Saved Workflows'
  ];

  // Fetch user workflows when user selects "My Saved Workflows"
  useEffect(() => {
    if (selectedCategory === 'My Saved Workflows') {
      const fetchSaved = async () => {
        setIsLoadingUserWorkflows(true);
        setUserWorkflowsError(null);
        try {
          const res = await getWorkflows();
          if (res?.success && Array.isArray(res.workflows)) {
            setUserWorkflows(res.workflows);
          } else {
            setUserWorkflowsError('Unable to load saved workflows.');
          }
        } catch (err) {
          setUserWorkflowsError(getErrorMessage(err));
        } finally {
          setIsLoadingUserWorkflows(false);
        }
      };
      fetchSaved();
    }
  }, [selectedCategory]);

  // Filter built-in templates
  const filteredTemplates = useMemo(() => {
    return BUILT_IN_TEMPLATES.filter((tmpl) => {
      const matchesCategory = selectedCategory === 'All' || tmpl.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        tmpl.name.toLowerCase().includes(q) || 
        tmpl.description.toLowerCase().includes(q) ||
        tmpl.category.toLowerCase().includes(q) ||
        tmpl.flowPreview.some((step) => step.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  // Filter user workflows if on that tab
  const filteredUserWorkflows = useMemo(() => {
    if (selectedCategory !== 'My Saved Workflows') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return userWorkflows;
    return userWorkflows.filter((wf) => 
      wf.name.toLowerCase().includes(q) || 
      (wf.description && wf.description.toLowerCase().includes(q))
    );
  }, [selectedCategory, searchQuery, userWorkflows]);

  // Handle template deployment (creates real workflow in MongoDB)
  const handleUseBuiltInTemplate = async (template) => {
    if (instantiatingId) return; // Prevent double clicks
    setInstantiatingId(template.id);
    setFeedback(null);

    try {
      // Sensible editable name with timestamp
      const timestamp = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const payload = {
        name: `${template.name} (${timestamp})`,
        description: template.description,
        nodes: template.workflowData.nodes,
        edges: template.workflowData.edges
      };

      const res = await createWorkflow(payload);
      if (res?.success && res.workflow?._id) {
        navigate(`/workflows/${res.workflow._id}`);
      } else {
        throw new Error(res?.message || 'Failed to instantiate blueprint.');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
      setInstantiatingId(null);
    }
  };

  // Handle cloning a user workflow as a template
  const handleUseSavedWorkflowAsTemplate = async (workflow) => {
    if (instantiatingId) return;
    setInstantiatingId(workflow._id);
    setFeedback(null);

    try {
      const res = await duplicateWorkflow(workflow._id);
      if (res?.success && res.workflow?._id) {
        navigate(`/workflows/${res.workflow._id}`);
      } else {
        throw new Error(res?.message || 'Failed to duplicate workflow template.');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
      setInstantiatingId(null);
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
        <TopNav 
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[rgba(185,176,160,0.1)]">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#151715] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B] shadow-glow-gold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#F5F0E6] tracking-tight">
                    Workflow Blueprint Library
                  </h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#B9B0A0] mt-1.5">
                Deploy production-ready automation pipelines pre-configured with triggers, Gemini AI agents, and conditional branching.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>5 Verified Blueprints</span>
              </span>
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div className="p-4 rounded-2xl bg-[#C83C3C]/15 border border-[#C83C3C]/30 flex items-center space-x-3 text-[#C83C3C] text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Search & Category Filter Navigation */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                      selectedCategory === cat
                        ? 'bg-[#E5B45B] text-[#0B0D0C] border-[#E5B45B] shadow-glow-gold font-bold'
                        : 'bg-[#151715] text-[#B9B0A0] border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:text-[#F5F0E6]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Local Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B9B0A0]/60 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search blueprints..."
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.12)] text-[#F5F0E6] placeholder-[#B9B0A0]/50 text-xs focus:outline-none focus:border-[#E5B45B] focus:ring-1 focus:ring-[#E5B45B]"
                />
              </div>
            </div>
          </div>

          {/* Tab 1: User Saved Workflows Tab */}
          {selectedCategory === 'My Saved Workflows' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]">
                  Your Reusable Templates ({filteredUserWorkflows.length})
                </span>
                <span className="text-[11px] text-[#B9B0A0]/70">
                  Select any existing workflow to clone into a new independent canvas.
                </span>
              </div>

              {isLoadingUserWorkflows ? (
                <div className="py-16 text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-[#E5B45B] motion-safe:animate-spin mx-auto" />
                  <p className="text-xs text-[#B9B0A0]">Loading your workspace workflows...</p>
                </div>
              ) : userWorkflowsError ? (
                <div className="p-8 rounded-2xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-[#C83C3C] mx-auto" />
                  <p className="text-xs text-[#C83C3C]">{userWorkflowsError}</p>
                </div>
              ) : filteredUserWorkflows.length === 0 ? (
                <div className="p-12 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] text-center space-y-3">
                  <Workflow className="w-8 h-8 text-[#B9B0A0]/60 mx-auto" />
                  <h4 className="text-sm font-semibold text-[#F5F0E6]">No Saved Workflows Found</h4>
                  <p className="text-xs text-[#B9B0A0] max-w-sm mx-auto">
                    You have not created any workflows yet. Choose a built-in blueprint above to launch your first pipeline.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredUserWorkflows.map((wf) => {
                    const nodeCount = Array.isArray(wf.nodes) ? wf.nodes.length : 0;
                    const edgeCount = Array.isArray(wf.edges) ? wf.edges.length : 0;

                    return (
                      <div
                        key={wf._id}
                        className="p-6 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 flex flex-col justify-between space-y-5"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
                              Workspace Original
                            </span>
                            <span className="text-[11px] font-mono text-[#B9B0A0]">
                              {nodeCount} {nodeCount === 1 ? 'Node' : 'Nodes'}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-[#F5F0E6] tracking-tight">
                              {wf.name}
                            </h3>
                            <p className="text-xs text-[#B9B0A0] mt-1 line-clamp-2 leading-relaxed">
                              {wf.description || 'Custom workflow designed on the visual canvas.'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[rgba(185,176,160,0.08)] flex items-center justify-between">
                          <span className="text-[10px] text-[#B9B0A0]/60 font-mono">
                            {edgeCount} {edgeCount === 1 ? 'Connection' : 'Connections'}
                          </span>
                          <button
                            onClick={() => handleUseSavedWorkflowAsTemplate(wf)}
                            disabled={instantiatingId === wf._id}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#252419] hover:bg-[#E5B45B] text-[#E5B45B] hover:text-[#0B0D0C] border border-[rgba(229,180,91,0.25)] text-xs font-semibold transition-all duration-200 disabled:opacity-50"
                          >
                            {instantiatingId === wf._id ? (
                              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{instantiatingId === wf._id ? 'Cloning...' : 'Use as Blueprint'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Built-in Blueprint Cards */
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]">
                  Available Blueprints ({filteredTemplates.length})
                </span>
                <span className="text-[11px] text-[#B9B0A0]/70">
                  Fully wired with triggers, AI models, conditions, and response outputs.
                </span>
              </div>

              {filteredTemplates.length === 0 ? (
                <div className="p-12 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] text-center space-y-3">
                  <Layers className="w-8 h-8 text-[#B9B0A0]/60 mx-auto" />
                  <h4 className="text-sm font-semibold text-[#F5F0E6]">No Matching Blueprints</h4>
                  <p className="text-xs text-[#B9B0A0] max-w-sm mx-auto">
                    No template matches your search criteria. Try a different keyword or switch to &ldquo;All&rdquo;.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)] text-xs font-semibold"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => {
                    const isDeploying = instantiatingId === template.id;

                    return (
                      <div
                        key={template.id}
                        className="p-6 sm:p-7 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 flex flex-col justify-between space-y-6 group"
                      >
                        <div className="space-y-4">
                          {/* Badge & Category */}
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${template.badgeColor}`}>
                              {template.badge}
                            </span>
                            <span className="text-[11px] text-[#B9B0A0]/70 font-medium">
                              {template.category}
                            </span>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-[#F5F0E6] group-hover:text-[#E5B45B] transition-colors tracking-tight">
                              {template.name}
                            </h3>
                            <p className="text-xs text-[#B9B0A0] mt-1.5 leading-relaxed">
                              {template.description}
                            </p>
                          </div>

                          {/* Node Sequence Micro-Diagram */}
                          <div className="p-3 rounded-2xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] space-y-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#B9B0A0]/60 block">
                              Pipeline Topology
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              {template.flowPreview.map((step, idx) => (
                                <React.Fragment key={step}>
                                  <span className="px-2 py-0.5 rounded-md bg-[#151715] text-[#F5F0E6] border border-[rgba(185,176,160,0.12)] font-mono text-[10px]">
                                    {step}
                                  </span>
                                  {idx < template.flowPreview.length - 1 && (
                                    <span className="text-[rgba(185,176,160,0.4)] text-[10px]">→</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Footer & Deployment CTA */}
                        <div className="pt-4 border-t border-[rgba(185,176,160,0.08)] flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-[#B9B0A0] font-mono">
                            <span>{template.nodeCount} nodes</span>
                            <span className="text-[rgba(185,176,160,0.25)]">•</span>
                            <span>{template.edgeCount} edges</span>
                          </div>

                          <button
                            onClick={() => handleUseBuiltInTemplate(template)}
                            disabled={isDeploying || !!instantiatingId}
                            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#252419] hover:bg-[#E5B45B] text-[#E5B45B] hover:text-[#0B0D0C] border border-[rgba(229,180,91,0.3)] text-xs font-bold transition-all duration-200 shadow-glow-gold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
                            aria-label={`Use ${template.name} blueprint`}
                          >
                            {isDeploying ? (
                              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>{isDeploying ? 'Instantiating...' : 'Use Blueprint'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
