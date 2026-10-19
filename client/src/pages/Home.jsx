import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Workflow, 
  Bot, 
  Sparkles, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  GitBranch, 
  Play, 
  Shield, 
  Zap, 
  Layers, 
  Cpu, 
  Code2, 
  FileText, 
  Terminal, 
  Clock, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight, 
  Sliders, 
  Network,
  RotateCcw,
  Server,
  Lock,
  Boxes
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WorkflowPreview from '../components/landing/WorkflowPreview';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Interactive Product Preview Simulation State
  const [simulating, setSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0); // 0: idle, 1: trigger, 2: ai, 3: condition, 4: output (done)
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' | 'telemetry'

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const runSimulation = () => {
    if (simulating) return;
    setSimulating(true);
    setSimStep(1);

    setTimeout(() => {
      setSimStep(2);
      setTimeout(() => {
        setSimStep(3);
        setTimeout(() => {
          setSimStep(4);
          setSimulating(false);
        }, 600);
      }, 700);
    }, 500);
  };

  const resetSimulation = () => {
    setSimStep(0);
    setSimulating(false);
  };

  return (
    <div className="text-[#F5F0E6] overflow-x-hidden selection:bg-[#E5B45B]/20 selection:text-[#E5B45B]">
      {/* ========================================================= */}
      {/* 1. HERO SECTION (EDITORIAL ASYMMETRIC + REAL CANVAS DEMO) */}
      {/* ========================================================= */}
      <section className="relative pt-8 sm:pt-14 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#E5B45B]/8 blur-[120px] pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Industrial Typography & Action Triggers */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Engineering Status Chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151715] border border-[rgba(185,176,160,0.18)] shadow-inner-highlight text-xs font-mono max-w-full flex-wrap">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse shrink-0" />
              <span className="text-[#B9B0A0] uppercase tracking-wider text-[10px] sm:text-[11px]">System v3.0 // Multi-Tier Fallback</span>
              <span className="text-[10px] text-[#E5B45B] font-semibold bg-[#252419] px-2 py-0.5 rounded-full border border-[rgba(229,180,91,0.25)] shrink-0">
                Active
              </span>
            </div>

            {/* Editorial Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-[#F5F0E6]">
                The Deterministic AI Engine for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5B45B] via-[#F5F0E6] to-[#E5B45B]">
                  Engineering Teams.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-[#B9B0A0] leading-relaxed max-w-xl font-normal">
                Assemble directed acyclic graphs combining webhooks, modular LLM reasoning, deterministic logic gates, and millisecond telemetry. Zero hallucinated paths.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                to={isAuthenticated ? "/dashboard" : "/register"}
                className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] text-sm font-bold shadow-lg shadow-[#E5B45B]/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span>{isAuthenticated ? "Launch Dashboard" : "Start Building Free"}</span>
                <ArrowRight className="w-4 h-4 text-[#0B0D0C]" />
              </Link>

              <Link
                to={isAuthenticated ? "/workflows/new" : "/login"}
                className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-[#151715] hover:bg-[#1C1F1C] text-[#F5F0E6] border border-[rgba(185,176,160,0.2)] text-sm font-semibold transition-all hover:border-[rgba(229,180,91,0.4)] hover:-translate-y-0.5"
              >
                <Workflow className="w-4 h-4 text-[#E5B45B]" />
                <span>Open Canvas</span>
              </Link>
            </div>

            {/* Technical Guarantees */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-[rgba(185,176,160,0.12)] text-xs text-[#B9B0A0]">
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] flex-shrink-0" />
                <span>3-Tier Failover</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] flex-shrink-0" />
                <span>DAG Cycle Safety</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] flex-shrink-0" />
                <span>Strict JWT Tenancy</span>
              </div>
            </div>
          </div>

          {/* Right Column: Real Living Canvas Simulation Viewport */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-[rgba(185,176,160,0.18)] bg-[#111311] shadow-2xl overflow-hidden shadow-inner-highlight">
              {/* Cockpit Window Header */}
              <div className="h-11 bg-[#0B0D0C] border-b border-[rgba(185,176,160,0.1)] px-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C83C3C]/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5B45B]/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#059669]/80" />
                  </div>
                  <span className="text-[11px] font-mono text-[#B9B0A0] ml-2">
                    workspace://incident-triage.flow
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={simStep > 0 && !simulating ? resetSimulation : runSimulation}
                    disabled={simulating}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                      simStep > 0 && !simulating
                        ? 'bg-[#151715] text-[#B9B0A0] hover:text-[#F5F0E6] border border-[rgba(185,176,160,0.2)]'
                        : 'bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C]'
                    } disabled:opacity-50`}
                  >
                    {simStep > 0 && !simulating ? (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </>
                    ) : (
                      <>
                        <Play className={`w-3 h-3 ${simulating ? 'animate-pulse' : ''}`} />
                        <span>{simulating ? 'Running...' : 'Run DAG'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Viewport Sub-header with Tabs & Status */}
              <div className="px-4 py-2 bg-[#151715]/60 border-b border-[rgba(185,176,160,0.08)] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('canvas')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                      activeTab === 'canvas'
                        ? 'bg-[#252419] text-[#E5B45B] font-bold border border-[rgba(229,180,91,0.25)]'
                        : 'text-[#B9B0A0] hover:text-[#F5F0E6]'
                    }`}
                  >
                    DAG Topology
                  </button>
                  <button
                    onClick={() => setActiveTab('telemetry')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                      activeTab === 'telemetry'
                        ? 'bg-[#252419] text-[#E5B45B] font-bold border border-[rgba(229,180,91,0.25)]'
                        : 'text-[#B9B0A0] hover:text-[#F5F0E6]'
                    }`}
                  >
                    Telemetry Trace
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  <span className="text-[#059669]">
                    {simStep === 0 && 'IDLE // READY'}
                    {simStep === 1 && 'STEP 1: INGESTION'}
                    {simStep === 2 && 'STEP 2: GEMINI LLM'}
                    {simStep === 3 && 'STEP 3: RULE TRUE'}
                    {simStep === 4 && 'COMPLETED (435ms)'}
                  </span>
                </div>
              </div>

              {/* Viewport Content */}
              {activeTab === 'canvas' ? (
                <WorkflowPreview externalStep={simStep} isExternalSimulating={simulating} />
              ) : (
                /* Telemetry Table View */
                <div className="p-4 bg-[#0B0D0C] font-mono text-xs overflow-x-auto min-h-[340px]">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-[rgba(185,176,160,0.12)] text-[#B9B0A0] text-[10px] uppercase">
                        <th className="py-2 px-2">Step</th>
                        <th className="py-2 px-2">Node Type</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2">Duration</th>
                        <th className="py-2 px-2">Payload Output</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(185,176,160,0.06)]">
                      <tr>
                        <td className="py-2 px-2 text-[#B9B0A0]">01</td>
                        <td className="py-2 px-2 font-semibold text-[#F5F0E6]">trigger.webhook</td>
                        <td className="py-2 px-2 text-[#059669]">succeeded</td>
                        <td className="py-2 px-2">1ms</td>
                        <td className="py-2 px-2 text-[#B9B0A0] font-mono">code: 503, latency: 1450ms</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-[#B9B0A0]">02</td>
                        <td className="py-2 px-2 font-semibold text-[#E5B45B]">ai.gemini-3.8</td>
                        <td className="py-2 px-2 text-[#059669]">succeeded</td>
                        <td className="py-2 px-2">420ms</td>
                        <td className="py-2 px-2 text-[#059669] font-mono">severity: "CRITICAL", tokens: 88</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-[#B9B0A0]">03</td>
                        <td className="py-2 px-2 font-semibold text-[#F5F0E6]">condition.rule</td>
                        <td className="py-2 px-2 text-[#059669]">succeeded</td>
                        <td className="py-2 px-2">2ms</td>
                        <td className="py-2 px-2 text-[#B9B0A0] font-mono">evaluated: true</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-[#B9B0A0]">04</td>
                        <td className="py-2 px-2 font-semibold text-[#F5F0E6]">action.dispatch</td>
                        <td className="py-2 px-2 text-[#059669]">succeeded</td>
                        <td className="py-2 px-2">12ms</td>
                        <td className="py-2 px-2 text-[#059669] font-mono">alertId: "PD-9842"</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Engineering Architecture Schematic Ribbon */}
        <div className="mt-14 pt-8 border-t border-[rgba(185,176,160,0.12)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-3.5 rounded-xl bg-[#151715]/90 border border-[rgba(185,176,160,0.1)]">
              <span className="text-[10px] font-mono uppercase text-[#E5B45B] block font-bold">TOPOLOGICAL DAG</span>
              <p className="text-xs text-[#F5F0E6] font-semibold mt-0.5">Kahn Dependency Sorter</p>
              <span className="text-[11px] text-[#B9B0A0] block mt-0.5">Deterministic cycle safety</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#151715]/90 border border-[rgba(185,176,160,0.1)]">
              <span className="text-[10px] font-mono uppercase text-[#059669] block font-bold">3-TIER CASCADE</span>
              <p className="text-xs text-[#F5F0E6] font-semibold mt-0.5">Gemini → Groq → OpenRouter</p>
              <span className="text-[11px] text-[#B9B0A0] block mt-0.5">Zero downtime failover</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#151715]/90 border border-[rgba(185,176,160,0.1)]">
              <span className="text-[10px] font-mono uppercase text-[#E5B45B] block font-bold">TENANCY GUARDS</span>
              <p className="text-xs text-[#F5F0E6] font-semibold mt-0.5">Strict User Isolation</p>
              <span className="text-[11px] text-[#B9B0A0] block mt-0.5">MongoDB Atlas + JWT Auth</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#151715]/90 border border-[rgba(185,176,160,0.1)]">
              <span className="text-[10px] font-mono uppercase text-[#059669] block font-bold">TELEMETRY TRACES</span>
              <p className="text-xs text-[#F5F0E6] font-semibold mt-0.5">Sub-Second Execution</p>
              <span className="text-[11px] text-[#B9B0A0] block mt-0.5">Per-step duration & tokens</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. PLATFORM CAPABILITIES (BENTO GRID ARCHITECTURE)        */}
      {/* ========================================================= */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[rgba(185,176,160,0.12)] pb-6 text-left">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-wider text-[#E5B45B] font-bold block">
              // ARCHITECTURE CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F0E6]">
              Engineered for Production Precision
            </h2>
            <p className="text-sm text-[#B9B0A0]">
              Every subsystem built for strict determinism, transparent step tracing, and enterprise-grade multi-model fault tolerance.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-[#B9B0A0]">
            <span className="px-2.5 py-1 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.12)]">
              Express + Node.js
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.12)]">
              React Flow Canvas
            </span>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
          {/* Bento Cell 1: Large Span (8 cols) */}
          <div className="md:col-span-8 p-7 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.14)] shadow-inner-highlight flex flex-col justify-between space-y-6 hover:border-[rgba(229,180,91,0.35)] transition-all">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] text-xs font-mono">
                <Workflow className="w-3.5 h-3.5" />
                <span>DAG Orchestration Engine</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#F5F0E6]">
                Interactive Canvas with Dynamic Node Binding
              </h3>
              <p className="text-sm text-[#B9B0A0] leading-relaxed max-w-xl">
                Compose modular nodes with smart snap-to-grid, custom bezier curve routing, parameter inspectors, and live topological cycle validation. Never worry about infinite loops.
              </p>
            </div>

            {/* Visual Node Strip Preview */}
            <div className="p-4 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.12)]">
                <span className="text-[10px] text-[#E5B45B] block font-bold">NODE 01</span>
                <span className="text-xs text-[#F5F0E6] block font-semibold mt-0.5">Webhook Trigger</span>
                <span className="text-[10px] text-[#B9B0A0]">Payload normalizer</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#151715] border border-[rgba(229,180,91,0.3)]">
                <span className="text-[10px] text-[#E5B45B] block font-bold">NODE 02</span>
                <span className="text-xs text-[#F5F0E6] block font-semibold mt-0.5">AI Reasoning</span>
                <span className="text-[10px] text-[#059669]">Gemini 3.8 Flash</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#151715] border border-[#059669]/30">
                <span className="text-[10px] text-[#059669] block font-bold">NODE 03</span>
                <span className="text-xs text-[#F5F0E6] block font-semibold mt-0.5">True/False Branch</span>
                <span className="text-[10px] text-[#B9B0A0]">Regex &amp; Logic check</span>
              </div>
            </div>
          </div>

          {/* Bento Cell 2: Multi-Provider Failover (4 cols) */}
          <div className="md:col-span-4 p-7 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.14)] shadow-inner-highlight flex flex-col justify-between space-y-4 hover:border-[rgba(229,180,91,0.35)] transition-all">
            <div className="space-y-2.5">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#059669]/15 border border-[#059669]/30 text-[#059669] text-xs font-mono">
                <Shield className="w-3.5 h-3.5" />
                <span>Zero-Drop Cascade</span>
              </div>
              <h3 className="text-lg font-bold text-[#F5F0E6]">
                Multi-Provider Failover
              </h3>
              <p className="text-xs text-[#B9B0A0] leading-relaxed">
                If Google Gemini encounters a 429 rate limit or 404 deprecation, execution automatically recovers through Groq or OpenRouter within the same monotonic budget.
              </p>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex items-center justify-between">
                <span className="text-[#E5B45B]">1. Google Gemini</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#252419] text-[#E5B45B]">Primary</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex items-center justify-between">
                <span className="text-[#B9B0A0]">2. Groq (Llama/OSS)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#151715] text-[#B9B0A0]">Tier 2</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex items-center justify-between">
                <span className="text-[#059669]">3. OpenRouter (:free)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#059669]/15 text-[#059669]">Tier 3</span>
              </div>
            </div>
          </div>

          {/* Bento Cell 3: Deterministic Rule Evaluator (4 cols) */}
          <div className="md:col-span-4 p-7 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.14)] shadow-inner-highlight space-y-4 hover:border-[rgba(229,180,91,0.35)] transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B]">
              <GitBranch className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F0E6]">
              Deterministic Branching Gates
            </h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Multi-datatype rule evaluator supporting Boolean, numerical, string containment, and regex comparisons with automatic skip propagation.
            </p>
            <div className="p-2.5 rounded-lg bg-[#0B0D0C] font-mono text-[11px] text-[#E5B45B] border border-[rgba(185,176,160,0.08)]">
              rule: (severity == "P1") ➔ TRUE
            </div>
          </div>

          {/* Bento Cell 4: Sub-Second Telemetry (4 cols) */}
          <div className="md:col-span-4 p-7 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.14)] shadow-inner-highlight space-y-4 hover:border-[rgba(229,180,91,0.35)] transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#059669]/15 border border-[#059669]/30 flex items-center justify-center text-[#059669]">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F0E6]">
              Millisecond Step Telemetry
            </h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Every node records its execution latency in milliseconds, prompt tokens, completion tokens, raw input payloads, and sanitized output structures.
            </p>
            <div className="p-2.5 rounded-lg bg-[#0B0D0C] font-mono text-[11px] text-[#059669] border border-[rgba(185,176,160,0.08)]">
              latency: 420ms • tokens: 88 • status: 200
            </div>
          </div>

          {/* Bento Cell 5: Strict Security Tenancy (4 cols) */}
          <div className="md:col-span-4 p-7 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.14)] shadow-inner-highlight space-y-4 hover:border-[rgba(229,180,91,0.35)] transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B]">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F0E6]">
              Tenant-Isolated Execution
            </h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              MongoDB queries strictly verify <code className="text-[#E5B45B]">user: req.user.id</code>. JWT authentication guarantees total privacy across workspaces.
            </p>
            <div className="p-2.5 rounded-lg bg-[#0B0D0C] font-mono text-[11px] text-[#B9B0A0] border border-[rgba(185,176,160,0.08)]">
              JWT Guarded • Mongo Scoped
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. HOW IT WORKS (INDUSTRIAL PIPELINE SCHEMATIC)           */}
      {/* ========================================================= */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-mono uppercase tracking-wider text-[#E5B45B] font-bold block">
            // WORKFLOW LIFECYCLE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F0E6]">
            From Visual Nodes to Sub-Second Execution
          </h2>
          <p className="text-sm text-[#B9B0A0]">
            An engineered three-phase pipeline turning visual graphs into high-performance production automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative text-left">
          {/* Phase 1 */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.14)] shadow-inner-highlight space-y-4 hover:border-[rgba(229,180,91,0.35)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-extrabold text-[#E5B45B]">01</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                CANVAS
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">
              Assemble Directed Graph
            </h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Drag Trigger, AI, Condition, and Action nodes onto the infinite canvas. Wire connections with visual ports and test connection paths in real-time.
            </p>
            <ul className="text-xs text-[#B9B0A0] space-y-1.5 font-mono pt-2 border-t border-[rgba(185,176,160,0.08)]">
              <li className="flex items-center space-x-2">
                <span className="text-[#E5B45B]">✓</span>
                <span>Visual handle snapping</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-[#E5B45B]">✓</span>
                <span>Kahn topological cycle check</span>
              </li>
            </ul>
          </div>

          {/* Phase 2 */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.14)] shadow-inner-highlight space-y-4 hover:border-[rgba(229,180,91,0.35)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-extrabold text-[#E5B45B]">02</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                CONFIG
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">
              Bind AI Prompts &amp; Branch Rules
            </h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Inject context variables into prompt templates. Enforce structured JSON schemas, set timeout budgets, and choose secondary failover providers.
            </p>
            <ul className="text-xs text-[#B9B0A0] space-y-1.5 font-mono pt-2 border-t border-[rgba(185,176,160,0.08)]">
              <li className="flex items-center space-x-2">
                <span className="text-[#E5B45B]">✓</span>
                <span>JSON mode enforcement</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-[#E5B45B]">✓</span>
                <span>Deterministic True / False paths</span>
              </li>
            </ul>
          </div>

          {/* Phase 3 */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.14)] shadow-inner-highlight space-y-4 hover:border-[rgba(229,180,91,0.35)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-extrabold text-[#059669]">03</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#059669] border border-[#059669]/30">
                EXECUTE
              </span>
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">
              Execute &amp; Inspect Telemetry
            </h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Run pipelines on demand or via webhooks. Inspect millisecond node durations, token metrics, and failover attempt logs on the Executions console.
            </p>
            <ul className="text-xs text-[#B9B0A0] space-y-1.5 font-mono pt-2 border-t border-[rgba(185,176,160,0.08)]">
              <li className="flex items-center space-x-2">
                <span className="text-[#059669]">✓</span>
                <span>Sub-second execution speeds</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-[#059669]">✓</span>
                <span>Historical audit pagination</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. PRODUCTION USE CASES (DARK CHARCOAL INDUSTRIAL SECTION) */}
      {/* ========================================================= */}
      <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8 border-y border-[rgba(185,176,160,0.12)] bg-[#111311] relative">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[rgba(185,176,160,0.14)] pb-6 text-left">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-wider text-[#E5B45B] font-bold block">
                // PRODUCTION DEPLOYMENTS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F0E6]">
                Real Engineering Automations
              </h2>
              <p className="text-sm text-[#B9B0A0]">
                FlowForge AI replaces fragile custom cron scripts with reliable, observable visual pipelines.
              </p>
            </div>

            <span className="text-xs font-mono text-[#B9B0A0] bg-[#161917] px-3 py-1 rounded-full border border-[rgba(185,176,160,0.18)] self-start md:self-auto">
              Real-World Workloads
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Case 1 */}
            <div className="p-6 sm:p-7 rounded-2xl transition-all duration-300 space-y-4 bg-[#151715] border border-[rgba(185,176,160,0.14)] hover:border-[#E5B45B]/50 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)] group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#241414] text-[#C83C3C] border border-[#C83C3C]/30 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-[#C83C3C]" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#241414] text-[#EF4444] border border-[#C83C3C]/40 font-bold">
                  SRE / Incident
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#F5F0E6] group-hover:text-[#E5B45B] transition-colors">
                Autonomous Incident Triage &amp; Escalation
              </h3>
              <p className="text-xs text-[#B9B0A0] leading-relaxed">
                Ingest monitoring alerts, summarize stack traces via Google Gemini with automated failover, evaluate severity scores, and branch critical issues directly to on-call engineers.
              </p>
              <div className="pt-3 border-t border-[rgba(185,176,160,0.12)] text-[11px] font-mono text-[#E5B45B] font-semibold break-words">
                Webhook ➔ Gemini Triage ➔ P1 Branch ➔ PagerDuty
              </div>
            </div>

            {/* Case 2 */}
            <div className="p-6 sm:p-7 rounded-2xl transition-all duration-300 space-y-4 bg-[#151715] border border-[rgba(185,176,160,0.14)] hover:border-[#E5B45B]/50 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)] group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#252419] text-[#E5B45B] border border-[#E5B45B]/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#E5B45B]" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#252419] text-[#E5B45B] border border-[#E5B45B]/40 font-bold">
                  Support Ops
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#F5F0E6] group-hover:text-[#E5B45B] transition-colors">
                Customer Sentiment &amp; Urgent Routing
              </h3>
              <p className="text-xs text-[#B9B0A0] leading-relaxed">
                Intercept inbound support tickets, extract sentiment frustration flags, compute account churn risk, and route high-value churn risks directly to engineering leadership.
              </p>
              <div className="pt-3 border-t border-[rgba(185,176,160,0.12)] text-[11px] font-mono text-[#E5B45B] font-semibold break-words">
                Inbound Ticket ➔ LLM Sentiment ➔ Urgent Escalation
              </div>
            </div>

            {/* Case 3 */}
            <div className="p-6 sm:p-7 rounded-2xl transition-all duration-300 space-y-4 bg-[#151715] border border-[rgba(185,176,160,0.14)] hover:border-[#E5B45B]/50 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)] group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#132418] text-[#059669] border border-[#059669]/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#132418] text-[#10B981] border border-[#059669]/40 font-bold">
                  Data Pipeline
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#F5F0E6] group-hover:text-[#E5B45B] transition-colors">
                Schema Sanitization &amp; Anomaly Filter
              </h3>
              <p className="text-xs text-[#B9B0A0] leading-relaxed">
                Validate unstructured JSON payloads, normalize inconsistent attributes with LLM schema correction, and drop malicious or malformed payloads before database writes.
              </p>
              <div className="pt-3 border-t border-[rgba(185,176,160,0.12)] text-[11px] font-mono text-[#059669] font-semibold break-words">
                Raw JSON ➔ Schema Validator ➔ Clean DB Write
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. TECHNICAL SPECIFICATIONS FAQ                           */}
      {/* ========================================================= */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10 text-left">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#E5B45B] font-bold block">
            // SPECIFICATIONS &amp; POLICIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F0E6]">
            Frequently Answered Specifications
          </h2>
          <p className="text-sm text-[#B9B0A0]">
            Everything technical teams need to know about models, safety, and runtime telemetry.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              id: "01",
              q: "What workflow node primitives are implemented and supported?",
              a: "The engine supports six core node primitives: Trigger nodes (webhook and scheduled entrypoints), AI Processing nodes (LLM inference across Gemini, Groq, and OpenRouter), Condition nodes (deterministic comparison rules with True/False path splitting), Action nodes (data mapping and transformation), API Request nodes (outbound HTTP requests with SSRF guards), and Output nodes (HTTP response and state commitment)."
            },
            {
              id: "02",
              q: "Which AI models are supported and how does failover work?",
              a: "FlowForge AI defaults to Google's verified gemini-3.8-flash model. When multi-provider failover is enabled on an AI node, transient rate limits (HTTP 429) or model deprecations (HTTP 404) trigger sequential recovery through Groq (openai/gpt-oss-20b) and OpenRouter (e.g. google/gemma-4-31b-it:free) without interrupting downstream execution."
            },
            {
              id: "03",
              q: "How does the execution engine guarantee deterministic DAG traversal?",
              a: "The backend runtime performs Kahn's topological sort on all nodes and edges before executing. If a circular reference or unreachable cycle is detected, the workflow rejects execution immediately with clear graph validation diagnostics, preventing infinite execution loops."
            },
            {
              id: "04",
              q: "What telemetry is recorded during pipeline execution?",
              a: "Every workflow run records millisecond-accurate start/finish timestamps, per-node duration, prompt and completion token counts, input parameters, formatted JSON outputs, and failover attempt logs. All execution traces are stored securely in MongoDB and accessible on the Executions console."
            },
            {
              id: "05",
              q: "How is user data and pipeline execution isolated?",
              a: "FlowForge AI strictly enforces JWT Bearer authentication across all endpoints. Every MongoDB query requires { user: req.user.id }, guaranteeing that workflows, blueprints, and execution logs cannot be viewed or triggered by other users."
            }
          ].map((faq) => (
            <div
              key={faq.id}
              className="rounded-2xl border border-[rgba(185,176,160,0.12)] bg-[#151715] overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full p-5 text-left flex items-center justify-between space-x-4 hover:bg-[#1C1F1C] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B45B]"
                aria-expanded={openFaq === faq.id}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono text-[#E5B45B] font-bold">{faq.id} //</span>
                  <span className="text-sm sm:text-base font-semibold text-[#F5F0E6]">
                    {faq.q}
                  </span>
                </div>
                <span className="p-1 rounded-lg bg-[#0B0D0C] text-[#E5B45B] border border-[rgba(185,176,160,0.1)] flex-shrink-0">
                  {openFaq === faq.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {openFaq === faq.id && (
                <div className="px-5 pb-5 pt-1 border-t border-[rgba(185,176,160,0.06)] text-xs sm:text-sm text-[#B9B0A0] leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. INDUSTRIAL COMMAND STATION CTA BANNER                  */}
      {/* ========================================================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-3xl border border-[rgba(229,180,91,0.3)] bg-gradient-to-b from-[#181B18] to-[#0F110F] p-8 sm:p-14 text-center space-y-6 shadow-2xl overflow-hidden shadow-inner-highlight">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-10 w-96 h-96 rounded-full bg-[#E5B45B]/8 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-wider text-[#E5B45B] font-bold block">
              // READY FOR PRODUCTION
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F5F0E6]">
              Start Orchestrating Intelligent Workflows
            </h2>
            <p className="text-sm sm:text-base text-[#B9B0A0] leading-relaxed">
              Design deterministic DAG pipelines, configure resilient multi-model AI failover, and inspect millisecond step telemetry in seconds.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={isAuthenticated ? "/dashboard" : "/register"}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold text-sm sm:text-base shadow-lg shadow-[#E5B45B]/25 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span>{isAuthenticated ? "Launch Dashboard" : "Create Free Account"}</span>
                <ArrowRight className="w-4 h-4 text-[#0B0D0C]" />
              </Link>

              <Link
                to={isAuthenticated ? "/workflows/new" : "/login"}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3.5 rounded-xl bg-[#151715] hover:bg-[#1C1F1C] text-[#F5F0E6] border border-[rgba(185,176,160,0.2)] font-semibold text-sm sm:text-base transition-colors hover:-translate-y-0.5"
              >
                <span>{isAuthenticated ? "New Canvas" : "Sign In to Account"}</span>
              </Link>
            </div>

            <div className="pt-4 flex items-center justify-center space-x-4 text-[11px] font-mono text-[#B9B0A0]">
              <span>KAHN DAG</span>
              <span>•</span>
              <span>3-TIER CASCADE</span>
              <span>•</span>
              <span>ZERO AI BLACK-BOXES</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
