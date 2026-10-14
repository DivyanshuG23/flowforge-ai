import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomNode from '../components/workflow/CustomNode';
import NodeSidebar from '../components/workflow/NodeSidebar';
import EditorToolbar from '../components/workflow/EditorToolbar';
import PropertiesPanel from '../components/workflow/PropertiesPanel';
import { 
  createWorkflow, 
  getWorkflowById, 
  updateWorkflow, 
  duplicateWorkflow,
  executeWorkflow,
  getErrorMessage 
} from '../services/api';
import { sanitizeTelemetryError } from '../utils/sanitizeTelemetry';
import ExecutionResultModal from '../components/workflow/ExecutionResultModal';
import { PlusCircle, Sparkles, Layers, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

const defaultNodeData = {
  trigger: {
    type: 'trigger',
    label: 'Webhook Trigger',
    description: 'Listens for incoming HTTP events',
  },
  action: {
    type: 'action',
    label: 'Data Transform',
    description: 'Normalizes and formats event payload',
  },
  condition: {
    type: 'condition',
    label: 'Rule Evaluator',
    description: 'Branches execution based on conditions',
    field: 'status',
    operator: 'equals',
    value: 200,
  },
  ai: {
    type: 'ai',
    label: 'AI Anomaly Triage',
    description: 'Analyzes traces with LLM reasoning',
    provider: 'gemini',
    model: 'gemini-3.8-flash',
    prompt: 'Analyze incident traces and determine recovery status.',
    systemPrompt: 'You are an autonomous Site Reliability Engineer assistant.',
    outputFormat: 'json',
    temperature: 0.2,
    maxTokens: 1024,
    timeoutMs: 15000,
    enableFailover: false,
  },
  api: {
    type: 'api',
    label: 'HTTP Request',
    description: 'Dispatches payload to external endpoint',
  },
  output: {
    type: 'output',
    label: 'Return Response',
    description: 'Finalizes execution and commits state',
  },
};

// Initial starter nodes to give users an immediate tactile experience for new workflows
const initialNodes = [
  {
    id: 'node-trigger-1',
    type: 'custom',
    position: { x: 80, y: 180 },
    data: {
      type: 'trigger',
      label: 'Webhook Trigger',
      description: 'Listens for incoming HTTP events',
    },
  },
  {
    id: 'node-ai-1',
    type: 'custom',
    position: { x: 420, y: 180 },
    data: {
      type: 'ai',
      label: 'AI Anomaly Triage',
      description: 'Analyzes traces with LLM reasoning',
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      prompt: 'Analyze incident traces and determine recovery status.',
      systemPrompt: 'You are an autonomous Site Reliability Engineer assistant.',
      outputFormat: 'json',
      temperature: 0.2,
      maxTokens: 1024,
      timeoutMs: 15000,
      enableFailover: false,
    },
  },
  {
    id: 'node-output-1',
    type: 'custom',
    position: { x: 760, y: 180 },
    data: {
      type: 'output',
      label: 'Return Response',
      description: 'Finalizes execution and commits state',
    },
  },
];

const initialEdges = [
  {
    id: 'edge-1-2',
    source: 'node-trigger-1',
    target: 'node-ai-1',
    animated: true,
    style: { stroke: '#E5B45B', strokeWidth: 2 },
  },
  {
    id: 'edge-2-3',
    source: 'node-ai-1',
    target: 'node-output-1',
    animated: true,
    style: { stroke: '#E5B45B', strokeWidth: 2 },
  },
];

function WorkflowEditorContent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workflowId, setWorkflowId] = useState(id || null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Trigger configurations (Server Schedule & Webhook)
  const [workflowSchedule, setWorkflowSchedule] = useState({
    enabled: false,
    cron: '0 9 * * *',
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC',
    lastRunAt: null,
    lastStatus: null
  });
  const [workflowWebhook, setWorkflowWebhook] = useState({
    enabled: false,
    token: '',
    secret: '',
    lastTriggeredAt: null,
    totalTriggers: 0
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(!!id);
  const [loadError, setLoadError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Runtime Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [activeExecution, setActiveExecution] = useState(null);
  const [executionError, setExecutionError] = useState(null);
  const [nodeRuntimeStatuses, setNodeRuntimeStatuses] = useState({});

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { screenToFlowPosition, fitView } = useReactFlow();

  // Register custom node type
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  // Merge persistent canvas nodes with transient runtime telemetry for canvas visualization
  const displayNodes = useMemo(() => {
    if (!nodeRuntimeStatuses || Object.keys(nodeRuntimeStatuses).length === 0) {
      return nodes;
    }
    return nodes.map((node) => {
      const runtime = nodeRuntimeStatuses[node.id];
      if (!runtime) return node;
      return {
        ...node,
        data: {
          ...node.data,
          runtimeStatus: runtime.status,
          runtimeDurationMs: runtime.durationMs,
          runtimeError: runtime.error,
          runtimeOutput: runtime.output,
          runtimeInput: runtime.input,
        },
      };
    });
  }, [nodes, nodeRuntimeStatuses]);

  // Fetch existing workflow from API when :id param is present
  useEffect(() => {
    if (!id) {
      setWorkflowId(null);
      setWorkflowName('Untitled Workflow');
      setWorkflowDescription('');
      setNodes(initialNodes);
      setEdges(initialEdges);
      setWorkflowSchedule({
        enabled: false,
        cron: '0 9 * * *',
        timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC',
        lastRunAt: null,
        lastStatus: null
      });
      setWorkflowWebhook({
        enabled: false,
        token: '',
        secret: '',
        lastTriggeredAt: null,
        totalTriggers: 0
      });
      setIsLoadingWorkflow(false);
      setLoadError(null);
      setIsDirty(false);
      setNodeRuntimeStatuses({});
      setActiveExecution(null);
      setExecutionError(null);
      return;
    }

    let isMounted = true;
    const fetchWorkflowData = async () => {
      setIsLoadingWorkflow(true);
      setLoadError(null);
      try {
        const response = await getWorkflowById(id);
        if (!isMounted) return;

        if (response?.success && response.workflow) {
          const wf = response.workflow;
          setWorkflowId(wf._id);
          setWorkflowName(wf.name || 'Untitled Workflow');
          setWorkflowDescription(wf.description || '');
          setNodes(Array.isArray(wf.nodes) ? wf.nodes : []);
          setEdges(Array.isArray(wf.edges) ? wf.edges : []);
          if (wf.schedule) {
            setWorkflowSchedule({
              enabled: Boolean(wf.schedule.enabled),
              cron: wf.schedule.cron || '0 9 * * *',
              timezone: wf.schedule.timezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC'),
              lastRunAt: wf.schedule.lastRunAt || null,
              lastStatus: wf.schedule.lastStatus || null
            });
          }
          if (wf.webhook) {
            setWorkflowWebhook({
              enabled: Boolean(wf.webhook.enabled),
              token: wf.webhook.token || '',
              secret: wf.webhook.secret || '',
              lastTriggeredAt: wf.webhook.lastTriggeredAt || null,
              totalTriggers: wf.webhook.totalTriggers || 0
            });
          }
          setIsDirty(false);
          setNodeRuntimeStatuses({});
          setActiveExecution(null);
          setExecutionError(null);

          setTimeout(() => {
            fitView({ padding: 0.25 });
          }, 120);
        } else {
          setLoadError('Failed to load workflow data.');
        }
      } catch (err) {
        if (!isMounted) return;
        const msg = getErrorMessage(err);
        setLoadError(msg || 'Workflow not found or access denied.');
      } finally {
        if (isMounted) {
          setIsLoadingWorkflow(false);
        }
      }
    };

    fetchWorkflowData();

    return () => {
      isMounted = false;
    };
  }, [id, fitView]);

  // Window beforeunload warning if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Wrap node & edge change handlers to track dirty state
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      const isMeaningful = changes.some(
        (c) => c.type !== 'select' && c.type !== 'dimensions'
      );
      if (isMeaningful) {
        setIsDirty(true);
      }
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      const isMeaningful = changes.some((c) => c.type !== 'select');
      if (isMeaningful) {
        setIsDirty(true);
      }
    },
    [onEdgesChange]
  );

  // Connect edges with gold stroke
  const handleConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#E5B45B', strokeWidth: 2 },
          },
          eds
        )
      );
      setIsDirty(true);
    },
    [setEdges]
  );

  // Drag over handler for HTML5 drag-and-drop
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Drop handler
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const config = defaultNodeData[type] || defaultNodeData.action;
      const newNode = {
        id: `node-${type}-${Date.now().toString(36)}`,
        type: 'custom',
        position,
        data: { ...config },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id);
      setIsDirty(true);
    },
    [screenToFlowPosition, setNodes]
  );

  // Click handler from sidebar
  const handleAddNodeFromClick = useCallback(
    (type) => {
      const config = defaultNodeData[type] || defaultNodeData.action;
      const xOffset = 200 + (nodes.length % 5) * 60;
      const yOffset = 140 + (nodes.length % 5) * 50;

      const newNode = {
        id: `node-${type}-${Date.now().toString(36)}`,
        type: 'custom',
        position: { x: xOffset, y: yOffset },
        data: { ...config },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id);
      setIsDirty(true);
    },
    [nodes.length, setNodes]
  );

  // Select node on click
  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Deselect on canvas pane click
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Find currently selected node with runtime telemetry
  const selectedNode = useMemo(
    () => displayNodes.find((n) => n.id === selectedNodeId) || null,
    [displayNodes, selectedNodeId]
  );

  // Update node data from PropertiesPanel (sanitizing runtime keys from persistent data)
  const handleUpdateNode = useCallback(
    (id, updatedData) => {
      const { 
        runtimeStatus, 
        runtimeDurationMs, 
        runtimeError, 
        runtimeOutput, 
        runtimeInput, 
        ...cleanData 
      } = updatedData || {};

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: cleanData,
            };
          }
          return node;
        })
      );
      setIsDirty(true);
    },
    [setNodes]
  );

  // Delete node and its transient runtime status
  const handleDeleteNode = useCallback(
    (id) => {
      setNodes((nds) => nds.filter((node) => node.id !== id));
      setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
      setNodeRuntimeStatuses((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (selectedNodeId === id) {
        setSelectedNodeId(null);
      }
      setIsDirty(true);
    },
    [selectedNodeId, setEdges, setNodes]
  );

  // Rename handler
  const handleRename = useCallback((newName) => {
    setWorkflowName(newName);
    setIsDirty(true);
  }, []);

  // Save handler: connects directly to MongoDB Persistence API
  const handleSaveWorkflow = useCallback(async () => {
    if (isSaving) return;

    const trimmedName = workflowName.trim();
    if (!trimmedName) {
      setSaveFeedback({
        type: 'error',
        message: 'Workflow name cannot be empty.'
      });
      setTimeout(() => setSaveFeedback(null), 4000);
      return;
    }

    setIsSaving(true);
    setSaveFeedback(null);

    // Sanitize persistent nodes so runtime telemetry never pollutes MongoDB
    const persistentNodes = nodes.map((n) => {
      if (!n.data) return n;
      const { 
        runtimeStatus, 
        runtimeDurationMs, 
        runtimeError, 
        runtimeOutput, 
        runtimeInput, 
        ...cleanData 
      } = n.data;
      return { ...n, data: cleanData };
    });

    const payload = {
      name: trimmedName,
      description: workflowDescription.trim(),
      nodes: persistentNodes,
      edges,
      schedule: workflowSchedule,
      webhook: workflowWebhook,
    };

    try {
      if (workflowId) {
        // Update existing workflow
        const response = await updateWorkflow(workflowId, payload);
        if (response?.success) {
          setIsDirty(false);
          setSaveFeedback({
            type: 'success',
            message: 'Workflow updated successfully!'
          });
        } else {
          throw new Error(response?.message || 'Failed to update workflow.');
        }
      } else {
        // Create new workflow in MongoDB
        const response = await createWorkflow(payload);
        if (response?.success && response.workflow?._id) {
          const newId = response.workflow._id;
          setWorkflowId(newId);
          setIsDirty(false);
          setSaveFeedback({
            type: 'success',
            message: 'Workflow saved to cloud!'
          });
          // Seamlessly update route to /workflows/:id for subsequent updates
          navigate(`/workflows/${newId}`, { replace: true });
        } else {
          throw new Error(response?.message || 'Failed to create workflow.');
        }
      }
    } catch (err) {
      const errMsg = getErrorMessage(err);
      setSaveFeedback({
        type: 'error',
        message: errMsg || 'Failed to save workflow.'
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveFeedback(null);
      }, 4000);
    }
  }, [isSaving, workflowName, workflowDescription, nodes, edges, workflowSchedule, workflowWebhook, workflowId, navigate]);

  // Duplicate handler: creates an independent copy and navigates to the duplicate's canvas
  const handleDuplicateWorkflow = useCallback(async () => {
    if (!workflowId || isDuplicating || isSaving || isRunning) return;
    setIsDuplicating(true);
    setSaveFeedback(null);
    try {
      const response = await duplicateWorkflow(workflowId);
      if (response?.success && response.workflow?._id) {
        navigate(`/workflows/${response.workflow._id}`);
      } else {
        throw new Error(response?.message || 'Failed to duplicate workflow.');
      }
    } catch (err) {
      const errMsg = getErrorMessage(err);
      setSaveFeedback({
        type: 'error',
        message: errMsg || 'Failed to duplicate workflow.'
      });
      setTimeout(() => setSaveFeedback(null), 4000);
    } finally {
      setIsDuplicating(false);
    }
  }, [workflowId, isDuplicating, isSaving, isRunning, navigate]);

  // Helper to focus the trigger node in the inspector
  const handleSelectTriggerNode = useCallback(() => {
    const triggerNode = nodes.find(n => n.type === 'trigger' || n.data?.type === 'trigger');
    if (triggerNode) {
      setSelectedNodeId(triggerNode.id);
    }
  }, [nodes]);

  // Run Pipeline handler: saves draft if needed, triggers foundation execution engine, and displays telemetry
  const handleRunWorkflow = useCallback(async () => {

    if (isRunning) return;

    // 1. Immediately clear stale runtime statuses for the new execution
    setNodeRuntimeStatuses({});
    setActiveExecution(null);
    setExecutionError(null);

    let targetWorkflowId = workflowId;

    // If new draft or unsaved modifications exist, persist first
    if (!targetWorkflowId || isDirty) {
      setIsSaving(true);
      setSaveFeedback({ type: 'success', message: 'Saving changes before execution...' });
      const trimmedName = workflowName.trim() || 'Untitled Workflow';

      const persistentNodes = nodes.map((n) => {
        if (!n.data) return n;
        const { 
          runtimeStatus, 
          runtimeDurationMs, 
          runtimeError, 
          runtimeOutput, 
          runtimeInput, 
          ...cleanData 
        } = n.data;
        return { ...n, data: cleanData };
      });

      const payload = {
        name: trimmedName,
        description: workflowDescription.trim(),
        nodes: persistentNodes,
        edges,
        schedule: workflowSchedule,
        webhook: workflowWebhook,
      };

      try {
        if (targetWorkflowId) {
          await updateWorkflow(targetWorkflowId, payload);
        } else {
          const res = await createWorkflow(payload);
          targetWorkflowId = res.workflow._id;
          setWorkflowId(targetWorkflowId);
          navigate(`/workflows/${targetWorkflowId}`, { replace: true });
        }
        setIsDirty(false);
      } catch (saveErr) {
        setIsSaving(false);
        setSaveFeedback({
          type: 'error',
          message: getErrorMessage(saveErr) || 'Failed to save workflow before execution.'
        });
        return;
      } finally {
        setIsSaving(false);
      }
    }

    setIsRunning(true);
    setNodeRuntimeStatuses({});
    setActiveExecution(null);
    setExecutionError(null);

    try {
      const response = await executeWorkflow(targetWorkflowId);
      const execution = response?.execution;

      if (execution) {
        setActiveExecution(execution);

        // Map node-level runtime statuses from actual execution telemetry
        if (Array.isArray(execution.nodeExecutions) && execution.nodeExecutions.length > 0) {
          const statusMap = {};
          execution.nodeExecutions.forEach((step) => {
            if (step && step.nodeId) {
              statusMap[step.nodeId] = {
                status: step.status,
                durationMs: step.durationMs,
                error: sanitizeTelemetryError(step.error),
                output: step.output,
                input: step.input,
              };
            }
          });
          setNodeRuntimeStatuses(statusMap);
        } else {
          setNodeRuntimeStatuses({});
        }

        setExecutionModalOpen(true);
        if (!response.success) {
          setExecutionError(sanitizeTelemetryError(response.message || execution.error) || 'Execution halted.');
        }
      } else {
        throw new Error(response?.message || 'Execution failed to return telemetry.');
      }
    } catch (err) {
      const errMsg = getErrorMessage(err);
      setExecutionError(sanitizeTelemetryError(errMsg) || 'Workflow execution failed.');

      const execution = err?.response?.data?.execution;
      if (execution) {
        setActiveExecution(execution);
        if (Array.isArray(execution.nodeExecutions) && execution.nodeExecutions.length > 0) {
          const statusMap = {};
          execution.nodeExecutions.forEach((step) => {
            if (step && step.nodeId) {
              statusMap[step.nodeId] = {
                status: step.status,
                durationMs: step.durationMs,
                error: sanitizeTelemetryError(step.error),
                output: step.output,
                input: step.input,
              };
            }
          });
          setNodeRuntimeStatuses(statusMap);
        }
      } else {
        setNodeRuntimeStatuses({});
      }
      setExecutionModalOpen(true);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, workflowId, isDirty, workflowName, workflowDescription, nodes, edges, workflowSchedule, workflowWebhook, navigate]);

  // Load starter pipeline if canvas is cleared
  const handleLoadStarter = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setIsDirty(true);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  };

  // Full-screen loader while fetching workflow data
  if (isLoadingWorkflow) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0D0C] text-[#F5F0E6] select-none">
        <div className="flex flex-col items-center space-y-4 p-8 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.14)] shadow-2xl">
          <Loader2 className="w-8 h-8 motion-safe:animate-spin text-[#E5B45B]" />
          <div className="text-center">
            <p className="text-sm font-bold text-[#F5F0E6]">Loading Pipeline Canvas</p>
            <p className="text-xs text-[#B9B0A0] mt-1">Retrieving workflow configuration from database...</p>
          </div>
        </div>
      </div>
    );
  }

  // Graceful error state if fetching failed
  if (loadError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0D0C] text-[#F5F0E6] p-4 select-none">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.16)] text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#C83C3C]/10 border border-[#C83C3C]/30 flex items-center justify-center text-[#C83C3C] mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#F5F0E6]">Workflow Unavailable</h3>
            <p className="text-xs text-[#B9B0A0] mt-1.5 leading-relaxed">
              {loadError}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#252419] hover:bg-[#E5B45B] hover:text-[#0B0D0C] text-[#E5B45B] font-semibold text-xs transition-colors border border-[rgba(229,180,91,0.25)]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => navigate('/workflows/new')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold text-xs transition-colors shadow-glow-gold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Workflow</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0D0C] text-[#F5F0E6] overflow-hidden font-sans">
      {/* Top Toolbar */}
      <EditorToolbar
        workflowName={workflowName}
        onRename={handleRename}
        onSave={handleSaveWorkflow}
        isSaving={isSaving}
        onRun={handleRunWorkflow}
        isRunning={isRunning}
        saveFeedback={saveFeedback}
        workflowId={workflowId}
        isDirty={isDirty}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        activeExecution={activeExecution}
        onOpenTelemetry={() => setExecutionModalOpen(true)}
        onDuplicate={workflowId ? handleDuplicateWorkflow : undefined}
        isDuplicating={isDuplicating}
        workflowSchedule={workflowSchedule}
        workflowWebhook={workflowWebhook}
        onSelectTrigger={handleSelectTriggerNode}
      />


      {/* Main Workspace: Left Sidebar + Central Canvas + Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Draggable Nodes Sidebar */}
        <NodeSidebar
          onAddNode={handleAddNodeFromClick}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Central React Flow Canvas */}
        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#E5B45B', strokeWidth: 2 },
            }}
            proOptions={{ hideAttribution: true }}
            className="bg-[#0B0D0C]"
          >
            {/* Dot-grid background */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={22}
              size={1.5}
              color="rgba(185, 176, 160, 0.16)"
            />

            {/* Navigation & Zoom Controls */}
            <Controls
              showInteractive={false}
              className="!m-4 !shadow-2xl"
            />

            {/* Minimap for spatial orientation */}
            <MiniMap
              nodeStrokeColor="#E5B45B"
              nodeColor="#151715"
              maskColor="rgba(11, 13, 12, 0.85)"
              className="!hidden md:!block !m-4 !border !border-[rgba(185,176,160,0.14)] !rounded-xl !bg-[#151715]"
            />
          </ReactFlow>

          {/* Empty Canvas Overlay Helper */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
              <div className="pointer-events-auto max-w-md p-8 rounded-3xl bg-[#151715]/90 border border-[rgba(185,176,160,0.16)] backdrop-blur-md text-center shadow-2xl space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B] mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F0E6]">Your Canvas is Ready</h3>
                  <p className="text-xs text-[#B9B0A0] mt-1 leading-relaxed">
                    Drag node building blocks from the left library onto this canvas, or restore the starter pipeline.
                  </p>
                </div>
                <button
                  onClick={handleLoadStarter}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#E5B45B] text-[#0B0D0C] font-semibold text-xs hover:bg-[#E5B45B]/90 transition-colors shadow-glow-gold"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Restore Starter Pipeline</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Contextual Properties Panel */}
        <PropertiesPanel
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onClose={() => setSelectedNodeId(null)}
          workflowSchedule={workflowSchedule}
          workflowWebhook={workflowWebhook}
          onUpdateSchedule={(newSched) => {
            setWorkflowSchedule(newSched);
            setIsDirty(true);
          }}
          onUpdateWebhook={(newHook) => {
            setWorkflowWebhook(newHook);
            setIsDirty(true);
          }}
          workflowId={workflowId}
        />
      </div>

      {/* Execution Result & Telemetry Modal */}
      <ExecutionResultModal
        isOpen={executionModalOpen}
        onClose={() => setExecutionModalOpen(false)}
        execution={activeExecution}
        error={executionError}
      />
    </div>
  );
}

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent />
    </ReactFlowProvider>
  );
}
