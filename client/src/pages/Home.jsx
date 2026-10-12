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
  CornerDownRight, 
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    <div className="space-y-24 sm:space-y-32 py-10 sm:py-16 text-[#F5F0E6] overflow-x-hidden">
      {/* ========================================================= */}
      {/* 1. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 pt-4 sm:pt-8">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] sm:w-[750px] h-[350px] bg-gradient-to-tr from-[#E5B45B]/10 via-[#059669]/5 to-transparent blur-[120px] pointer-events-none -z-10" />

        {/* Announcement Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#151715] border border-[rgba(229,180,91,0.3)] shadow-glow-gold text-[#E5B45B] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#E5B45B]" />
          <span>Visual Workflow Automation • Powered by Gemini 3.5</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.12]">
          Build Intelligent Workflows.{' '}
          <span className="block mt-1 sm:mt-2 text-transparent bg-clip-text bg-gradient-to-r from-[#E5B45B] via-[#F5F0E6] to-[#E5B45B]">
            Branch with Precision.
          </span>
          <span className="block mt-1 sm:mt-2 text-[#F5F0E6]">
            Execute with Total Visibility.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-[#B9B0A0] max-w-3xl mx-auto leading-relaxed font-normal">
          Orchestrate visual automation pipelines combining modular trigger entry points, 
          multi-model AI reasoning, deterministic conditional branching, and millisecond-level step telemetry.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-8 py-3.5 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] text-sm sm:text-base font-bold shadow-lg shadow-[#E5B45B]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{isAuthenticated ? "Go to Dashboard" : "Start Building Free"}</span>
            <ArrowRight className="w-4 h-4 text-[#0B0D0C]" />
          </Link>

          <Link
            to={isAuthenticated ? "/workflows/new" : "/login"}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-7 py-3.5 rounded-xl bg-[#151715] hover:bg-[#1a1d1a] text-[#F5F0E6] border border-[rgba(185,176,160,0.2)] text-sm sm:text-base font-semibold transition-all hover:border-[#E5B45B]/40"
          >
            <Workflow className="w-4 h-4 text-[#E5B45B]" />
            <span>Open Workflow Canvas</span>
          </Link>
        </div>

        {/* Value Reassurance */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#B9B0A0]/80">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>Verified Gemini 3.5 Flash Model</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>Strict User Data Isolation</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>Complete Execution Telemetry</span>
          </span>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. INTERACTIVE PRODUCT PREVIEW                            */}
      {/* ========================================================= */}
      <section id="preview" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[rgba(185,176,160,0.1)]">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#E5B45B]">
              <Workflow className="w-4 h-4" />
              <span>Interactive Pipeline Simulation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F0E6] mt-1">
              Deterministic DAG Execution in Action
            </h2>
            <p className="text-xs sm:text-sm text-[#B9B0A0] mt-1">
              Simulate an incident triage pipeline. Observe real step-by-step state traversal, AI reasoning, and conditional path branching.
            </p>
          </div>

          {/* Controls: View Mode Tabs & Run Button */}
          <div className="flex items-center space-x-3">
            <div className="p-1 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.12)] flex items-center space-x-1 text-xs">
              <button
                onClick={() => setActiveTab('canvas')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'canvas'
                    ? 'bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.3)] shadow-glow-gold'
                    : 'text-[#B9B0A0] hover:text-[#F5F0E6]'
                }`}
              >
                Visual Canvas
              </button>
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'telemetry'
                    ? 'bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.3)] shadow-glow-gold'
                    : 'text-[#B9B0A0] hover:text-[#F5F0E6]'
                }`}
              >
                Step Telemetry
              </button>
            </div>

            <button
              onClick={simStep > 0 && !simulating ? resetSimulation : runSimulation}
              disabled={simulating}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                simStep > 0 && !simulating
                  ? 'bg-[#151715] hover:bg-[#1a1d1a] text-[#B9B0A0] hover:text-[#F5F0E6] border border-[rgba(185,176,160,0.2)]'
                  : 'bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] shadow-glow-gold'
              } disabled:opacity-50`}
            >
              <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-pulse' : ''}`} />
              <span>
                {simulating
                  ? 'Executing Pipeline...'
                  : simStep > 0
                  ? 'Reset Simulation'
                  : 'Simulate Pipeline Run'}
              </span>
            </button>
          </div>
        </div>

        {/* Canvas Display Container */}
        <div className="rounded-3xl border border-[rgba(185,176,160,0.15)] bg-[#151715] shadow-2xl overflow-hidden">
          {/* Canvas Window Header Bar */}
          <div className="h-12 bg-[#0B0D0C] border-b border-[rgba(185,176,160,0.1)] px-5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#C83C3C]/80" />
              <span className="w-3 h-3 rounded-full bg-[#E5B45B]/80" />
              <span className="w-3 h-3 rounded-full bg-[#059669]/80" />
              <span className="text-xs text-[#B9B0A0] font-mono ml-2 hidden sm:inline">
                flowforge-canvas://incident-triage-pipeline
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-[#151715] text-[#B9B0A0] font-mono text-[11px] border border-[rgba(185,176,160,0.1)]">
                Topology: 4 Nodes
              </span>
              <span className="px-2 py-0.5 rounded bg-[#252419] text-[#E5B45B] font-mono text-[11px] border border-[rgba(229,180,91,0.25)]">
                AI: gemini-3.5-flash
              </span>
            </div>
          </div>

          {/* Canvas Content: Visual DAG View vs Telemetry View */}
          {activeTab === 'canvas' ? (
            <div className="p-6 sm:p-10 relative bg-[radial-gradient(#1e211e_1px,transparent_1px)] [background-size:16px_16px]">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                {/* Node 1: Trigger */}
                <div
                  className={`p-4 rounded-2xl bg-[#0B0D0C] border transition-all duration-300 ${
                    simStep >= 1
                      ? 'border-[#059669] shadow-glow-emerald ring-1 ring-[#059669]'
                      : 'border-[rgba(185,176,160,0.15)]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[rgba(185,176,160,0.08)]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#B9B0A0]">
                      Node 1 • Entrypoint
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        simStep >= 1
                          ? 'bg-[#059669]/15 text-[#059669]'
                          : 'bg-[#151715] text-[#B9B0A0]'
                      }`}
                    >
                      {simStep >= 1 ? 'Executed • 1ms' : 'Ready'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-[#E5B45B]" />
                      <h4 className="text-xs sm:text-sm font-bold text-[#F5F0E6]">Incident Webhook</h4>
                    </div>
                    <p className="text-[11px] text-[#B9B0A0] leading-relaxed">
                      Receives payload from monitoring gateway with severity metadata.
                    </p>
                  </div>
                  <div className="mt-3 p-2 rounded-xl bg-[#151715] font-mono text-[10px] text-[#B9B0A0]">
                    latency: 1450ms, code: 503
                  </div>
                </div>

                {/* Node 2: AI Anomaly Reasoning */}
                <div
                  className={`p-4 rounded-2xl bg-[#0B0D0C] border transition-all duration-300 ${
                    simStep >= 2
                      ? 'border-[#059669] shadow-glow-emerald ring-1 ring-[#059669]'
                      : simStep === 1
                      ? 'border-[#E5B45B] shadow-glow-gold'
                      : 'border-[rgba(185,176,160,0.15)]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[rgba(185,176,160,0.08)]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#E5B45B]">
                      Node 2 • Gemini AI
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        simStep >= 2
                          ? 'bg-[#059669]/15 text-[#059669]'
                          : simStep === 1
                          ? 'bg-[#252419] text-[#E5B45B] animate-pulse'
                          : 'bg-[#151715] text-[#B9B0A0]'
                      }`}
                    >
                      {simStep >= 2 ? 'Executed • 420ms' : simStep === 1 ? 'Reasoning...' : 'Pending'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-[#E5B45B]" />
                      <h4 className="text-xs sm:text-sm font-bold text-[#F5F0E6]">Anomaly Triage</h4>
                    </div>
                    <p className="text-[11px] text-[#B9B0A0] leading-relaxed">
                      Evaluates stack traces and outputs structured incident diagnosis.
                    </p>
                  </div>
                  <div className="mt-3 p-2 rounded-xl bg-[#151715] font-mono text-[10px] text-[#059669]">
                    riskLevel: "high", tokens: 99
                  </div>
                </div>

                {/* Node 3: Condition Evaluator */}
                <div
                  className={`p-4 rounded-2xl bg-[#0B0D0C] border transition-all duration-300 ${
                    simStep >= 3
                      ? 'border-[#059669] shadow-glow-emerald ring-1 ring-[#059669]'
                      : 'border-[rgba(185,176,160,0.15)]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[rgba(185,176,160,0.08)]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#B9B0A0]">
                      Node 3 • Rule Engine
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        simStep >= 3
                          ? 'bg-[#059669]/15 text-[#059669]'
                          : 'bg-[#151715] text-[#B9B0A0]'
                      }`}
                    >
                      {simStep >= 3 ? 'True Branch • 2ms' : 'Pending'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <GitBranch className="w-4 h-4 text-[#E5B45B]" />
                      <h4 className="text-xs sm:text-sm font-bold text-[#F5F0E6]">Is Critical?</h4>
                    </div>
                    <p className="text-[11px] text-[#B9B0A0] leading-relaxed">
                      Evaluates expression: <code className="text-[#E5B45B]">riskLevel == "high"</code>
                    </p>
                  </div>
                  <div className="mt-3 flex items-center space-x-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-[#059669]/15 text-[#059669] font-bold">
                      TRUE → Escalate
                    </span>
                    <span className="text-[#B9B0A0]/60">FALSE → Skip</span>
                  </div>
                </div>

                {/* Node 4: Branch Outputs (True & False) */}
                <div className="space-y-3">
                  {/* Branch A: True Path */}
                  <div
                    className={`p-3 rounded-xl bg-[#0B0D0C] border transition-all duration-300 ${
                      simStep >= 4
                        ? 'border-[#059669] shadow-glow-emerald bg-[#059669]/5'
                        : 'border-[rgba(185,176,160,0.15)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#059669] font-bold flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>ACTIVE BRANCH</span>
                      </span>
                      <span className="text-[10px] text-[#B9B0A0] font-mono">
                        {simStep >= 4 ? '12ms' : '—'}
                      </span>
                    </div>
                    <h5 className="text-xs font-semibold text-[#F5F0E6] mt-1">
                      Escalate to PagerDuty & Slack
                    </h5>
                  </div>

                  {/* Branch B: False Path (Skipped) */}
                  <div
                    className={`p-3 rounded-xl bg-[#0B0D0C] border transition-all duration-300 ${
                      simStep >= 4
                        ? 'border-[rgba(185,176,160,0.1)] opacity-35'
                        : 'border-[rgba(185,176,160,0.1)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#B9B0A0]">
                        {simStep >= 4 ? 'SKIPPED (Branch False)' : 'ALTERNATIVE'}
                      </span>
                    </div>
                    <h5 className="text-xs font-medium text-[#B9B0A0] mt-1 line-through">
                      Archive Incident Quietly
                    </h5>
                  </div>
                </div>
              </div>

              {/* Simulation Status Overlay Banner */}
              {simStep === 4 && (
                <div className="mt-8 p-4 rounded-2xl bg-[#059669]/10 border border-[#059669]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in duration-300">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#059669] flex-shrink-0" />
                    <div>
                      <span className="font-bold text-[#F5F0E6] block">
                        Pipeline Execution Completed Successfully
                      </span>
                      <span className="text-[#B9B0A0]">
                        Duration: 435ms • 4 Nodes Visited • 3 Executed, 1 Skipped • Zero Anomalies
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/workflows/new"
                    className="inline-flex items-center space-x-1 text-[#E5B45B] hover:text-[#D49E3F] font-semibold text-xs whitespace-nowrap"
                  >
                    <span>Build Your Own Workflow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* Telemetry Trace View */
            <div className="p-6 bg-[#0B0D0C] font-mono text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[rgba(185,176,160,0.1)] text-[#B9B0A0] text-[10px] uppercase">
                      <th className="py-2.5 px-3">Step</th>
                      <th className="py-2.5 px-3">Node Label</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Payload Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(185,176,160,0.06)] text-[11px]">
                    <tr>
                      <td className="py-3 px-3 text-[#B9B0A0]">01</td>
                      <td className="py-3 px-3 font-semibold text-[#F5F0E6]">Incident Webhook</td>
                      <td className="py-3 px-3 text-[#B9B0A0]">trigger</td>
                      <td className="py-3 px-3 text-[#059669]">succeeded</td>
                      <td className="py-3 px-3">1ms</td>
                      <td className="py-3 px-3 text-[#B9B0A0]">event: "latency_spike", latency_ms: 1450</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#B9B0A0]">02</td>
                      <td className="py-3 px-3 font-semibold text-[#F5F0E6]">Anomaly Triage</td>
                      <td className="py-3 px-3 text-[#E5B45B]">ai (gemini-3.5)</td>
                      <td className="py-3 px-3 text-[#059669]">succeeded</td>
                      <td className="py-3 px-3">420ms</td>
                      <td className="py-3 px-3 text-[#059669]">anomalyDetected: true, riskLevel: "high"</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#B9B0A0]">03</td>
                      <td className="py-3 px-3 font-semibold text-[#F5F0E6]">Is Critical?</td>
                      <td className="py-3 px-3 text-[#B9B0A0]">condition</td>
                      <td className="py-3 px-3 text-[#059669]">succeeded</td>
                      <td className="py-3 px-3">2ms</td>
                      <td className="py-3 px-3 text-[#B9B0A0]">evaluatedBranch: true (riskLevel == "high")</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#B9B0A0]">04</td>
                      <td className="py-3 px-3 font-semibold text-[#F5F0E6]">Escalate to PagerDuty</td>
                      <td className="py-3 px-3 text-[#B9B0A0]">output</td>
                      <td className="py-3 px-3 text-[#059669]">succeeded</td>
                      <td className="py-3 px-3">12ms</td>
                      <td className="py-3 px-3 text-[#B9B0A0]">dispatched: true, channel: "#incidents-p1"</td>
                    </tr>
                    <tr className="opacity-40">
                      <td className="py-3 px-3 text-[#B9B0A0]">05</td>
                      <td className="py-3 px-3 text-[#B9B0A0] line-through">Archive Incident</td>
                      <td className="py-3 px-3 text-[#B9B0A0]">output</td>
                      <td className="py-3 px-3 text-[#B9B0A0]">skipped</td>
                      <td className="py-3 px-3">0ms</td>
                      <td className="py-3 px-3 text-[#B9B0A0]">Skipped due to condition false branch</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CORE ARCHITECTURE FEATURES                             */}
      {/* ========================================================= */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#151715] text-[#E5B45B] text-xs font-semibold border border-[rgba(229,180,91,0.25)]">
            <Zap className="w-3.5 h-3.5" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F0E6]">
            Engineering-Grade Workflow Architecture
          </h2>
          <p className="text-sm sm:text-base text-[#B9B0A0] leading-relaxed">
            Every layer designed for deterministic DAG execution, multi-model LLM reliability, and sub-second execution speeds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1: Visual DAG Canvas */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center">
              <Workflow className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">Visual DAG Canvas (React Flow)</h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Drag, arrange, and link modular pipeline nodes. Custom edge routing, snap grid, contextual properties inspector, and live validation.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#E5B45B] border border-[rgba(185,176,160,0.1)]">
                Directed Graph
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                Dynamic Edges
              </span>
            </div>
          </div>

          {/* Feature 2: Multi-Model AI Reasoning */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">Multi-Model AI Integration</h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Powered by Google Gemini 3.5 Flash and custom OpenAI models. Ingests context variables, enforces structured JSON output, and computes token telemetry.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#E5B45B] border border-[rgba(185,176,160,0.1)]">
                gemini-3.5-flash
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                Structured JSON
              </span>
            </div>
          </div>

          {/* Feature 3: Deterministic Condition Branching */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">Deterministic Branching Rules</h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Multi-datatype condition evaluator supporting equality, numerical comparisons, string containment, and regex. Automatically skips inactive branches.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#E5B45B] border border-[rgba(185,176,160,0.1)]">
                Regex & Logic
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                Skip Propagation
              </span>
            </div>
          </div>

          {/* Feature 4: Live Execution Engine */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#059669]/15 border border-[#059669]/30 text-[#059669] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">Topological Execution Engine</h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Processes DAG dependencies with Kahn's topological sort. Prevents circular cycles and delivers sub-second pipeline throughput on Node.js & Express.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#059669] border border-[rgba(185,176,160,0.1)]">
                Topological Order
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                Sub-Second Runs
              </span>
            </div>
          </div>

          {/* Feature 5: Real Telemetry & Trace History */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">Full Runtime Telemetry & Traces</h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Every execution logs start/end timestamps, millisecond node duration, prompt/completion tokens, input parameters, and formatted output data.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#E5B45B] border border-[rgba(185,176,160,0.1)]">
                Step-by-Step Traces
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                Historical Telemetry
              </span>
            </div>
          </div>

          {/* Feature 6: Resilient Failure Visibility */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#E5B45B]/40 hover:shadow-glow-gold transition-all duration-300 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">Strict User Data Isolation</h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              JWT authentication, encrypted password hashing, and user-level MongoDB tenancy. Cross-user access is strictly blocked at the controller layer.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#E5B45B] border border-[rgba(185,176,160,0.1)]">
                JWT Guarded
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0] border border-[rgba(185,176,160,0.1)]">
                Tenancy Scoped
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. HOW IT WORKS                                           */}
      {/* ========================================================= */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#151715] text-[#E5B45B] text-xs font-semibold border border-[rgba(229,180,91,0.25)]">
            <Code2 className="w-3.5 h-3.5" />
            <span>Step-by-Step Flow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F0E6]">
            How FlowForge AI Works
          </h2>
          <p className="text-sm text-[#B9B0A0] leading-relaxed">
            From visual diagramming to automated execution in three structured phases.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] space-y-4 relative">
            <span className="text-4xl sm:text-5xl font-extrabold text-[#E5B45B]/20 font-mono block">
              01
            </span>
            <h3 className="text-lg font-bold text-[#F5F0E6]">Assemble Visual Nodes</h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Place Trigger entrypoints, AI reasoning steps, and deterministic condition evaluators onto the canvas. Connect edges to establish data flow.
            </p>
            <ul className="space-y-1.5 pt-2 text-xs text-[#B9B0A0]">
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-[#E5B45B]" />
                <span>Snap-to-grid node placement</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-[#E5B45B]" />
                <span>Input/output handle binding</span>
              </li>
            </ul>
          </div>

          {/* Step 2 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] space-y-4 relative">
            <span className="text-4xl sm:text-5xl font-extrabold text-[#E5B45B]/20 font-mono block">
              02
            </span>
            <h3 className="text-lg font-bold text-[#F5F0E6]">Configure AI & Logic Rules</h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Define prompts with variable injection, choose Gemini 3.5 Flash or OpenAI models, and define Boolean, numerical, or regex comparison rules.
            </p>
            <ul className="space-y-1.5 pt-2 text-xs text-[#B9B0A0]">
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-[#E5B45B]" />
                <span>Custom temperature & system prompts</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-[#E5B45B]" />
                <span>Deterministic TRUE / FALSE branches</span>
              </li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] space-y-4 relative">
            <span className="text-4xl sm:text-5xl font-extrabold text-[#E5B45B]/20 font-mono block">
              03
            </span>
            <h3 className="text-lg font-bold text-[#F5F0E6]">Execute & Track Telemetry</h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Run pipelines on demand. Inspect millisecond node durations, prompt tokens, completion tokens, and structured outputs in real-time logs.
            </p>
            <ul className="space-y-1.5 pt-2 text-xs text-[#B9B0A0]">
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-[#059669]" />
                <span>Sub-second execution engine</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-[#059669]" />
                <span>Historical run search & pagination</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. PRODUCTION ENGINEERING USE CASES                       */}
      {/* ========================================================= */}
      <section id="use-cases" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#151715] text-[#E5B45B] text-xs font-semibold border border-[rgba(229,180,91,0.25)]">
            <Sliders className="w-3.5 h-3.5" />
            <span>Built For Real Work</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F0E6]">
            Production Use Cases
          </h2>
          <p className="text-sm text-[#B9B0A0] leading-relaxed">
            Real engineering automations that replace manual triage, reduce incident response lag, and enforce clean data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Use Case 1 */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#C83C3C]" />
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">
              Autonomous Incident Triage & Escalation
            </h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Ingest error payloads from monitoring gateways. Summarize stack traces with Gemini 3.5 Flash, evaluate priority score, and route high-severity alerts to on-call channels.
            </p>
            <div className="pt-2 border-t border-[rgba(185,176,160,0.08)] text-[11px] font-mono text-[#E5B45B]">
              Trigger → AI Analysis → Rule Check → Alert
            </div>
          </div>

          {/* Use Case 2 */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#E5B45B]" />
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">
              Support Ticket Sentiment & Urgent Routing
            </h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Ingest inbound customer tickets, extract intent and user frustration indicators, classify urgency, and branch high-churn risks directly to engineering managers.
            </p>
            <div className="pt-2 border-t border-[rgba(185,176,160,0.08)] text-[11px] font-mono text-[#E5B45B]">
              Inbound Ticket → Sentiment LLM → Priority Branch
            </div>
          </div>

          {/* Use Case 3 */}
          <div className="p-6 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#059669]" />
            </div>
            <h3 className="text-base font-bold text-[#F5F0E6]">
              Data Validation & Schema Normalization
            </h3>
            <p className="text-xs text-[#B9B0A0] leading-relaxed">
              Intercept API payloads before database ingestion. Validate required attributes, invoke AI parsing for messy user input, and discard anomalous records.
            </p>
            <div className="pt-2 border-t border-[rgba(185,176,160,0.08)] text-[11px] font-mono text-[#E5B45B]">
              Raw JSON → Regex Check → AI Clean → Commit
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. TECHNICAL FAQ (ACCESSIBLE ACCORDION)                   */}
      {/* ========================================================= */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#151715] text-[#E5B45B] text-xs font-semibold border border-[rgba(229,180,91,0.25)]">
            <FileText className="w-3.5 h-3.5" />
            <span>Answers & Specifications</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F0E6]">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[#B9B0A0] leading-relaxed">
            Architecture details, supported models, and runtime safety policies.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "What is FlowForge AI and what problem does it solve?",
              a: "FlowForge AI is a visual workflow automation platform designed for technical teams. It lets you visually orchestrate trigger entrypoints, LLM reasoning nodes, deterministic condition branches, and return responses on an interactive canvas, executing them against a secure Express and MongoDB Atlas backend with live step-by-step telemetry."
            },
            {
              q: "What workflow nodes are currently implemented and supported?",
              a: "The platform natively provides four core node types: Trigger nodes (entry point payloads), AI Processing nodes (LLM reasoning with Gemini & OpenAI), Condition nodes (deterministic Boolean, numerical, string containment, and regex rules with true/false path splitting), and Return Output nodes (HTTP response & state commitment)."
            },
            {
              q: "Which AI models and providers can I configure?",
              a: "FlowForge AI defaults to Google's verified gemini-3.5-flash model, providing sub-second inference with structured JSON formatting. It also supports custom OpenAI-compatible models (e.g. gpt-4o-mini), custom system prompts, temperature controls, and token consumption tracking."
            },
            {
              q: "How does execution telemetry and history work?",
              a: "Every workflow run records millisecond-accurate start/completion timestamps, node-level durations, prompt and completion token counts, input parameters, and formatted outputs. These traces are saved in MongoDB Atlas and available on the dedicated Executions dashboard with pagination and status filters."
            },
            {
              q: "How is user data and pipeline security guaranteed?",
              a: "FlowForge AI enforces JWT Bearer authentication on all workflow and execution endpoints. Every database query strictly filters by the authenticated user ID ({ user: req.user.id }), ensuring multi-tenant data isolation. Secrets and API keys are stored securely on the backend and never exposed to the frontend."
            }
          ].map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[rgba(185,176,160,0.12)] bg-[#151715] overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 text-left flex items-center justify-between space-x-4 hover:bg-[#1a1d1a] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B45B]"
                aria-expanded={openFaq === idx}
              >
                <span className="text-sm sm:text-base font-semibold text-[#F5F0E6]">
                  {faq.q}
                </span>
                <span className="p-1 rounded-lg bg-[#0B0D0C] text-[#E5B45B] border border-[rgba(185,176,160,0.1)] flex-shrink-0">
                  {openFaq === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {openFaq === idx && (
                <div className="px-5 pb-5 pt-1 border-t border-[rgba(185,176,160,0.06)] text-xs sm:text-sm text-[#B9B0A0] leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. FINAL CONVERSION CTA BANNER                            */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-[rgba(229,180,91,0.3)] bg-gradient-to-b from-[#1c1f1c] to-[#151715] p-8 sm:p-14 text-center space-y-6 shadow-2xl overflow-hidden">
          {/* Subtle Glow Orb */}
          <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-10 w-96 h-96 rounded-full bg-[#E5B45B]/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F5F0E6]">
              Start Orchestrating Intelligent Workflows
            </h2>
            <p className="text-sm sm:text-base text-[#B9B0A0] leading-relaxed">
              Design visual DAGs, configure fast Gemini 3.5 reasoning, and inspect real telemetry in under two minutes.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={isAuthenticated ? "/dashboard" : "/register"}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold text-sm sm:text-base shadow-lg shadow-[#E5B45B]/25 transition-all hover:scale-[1.02]"
              >
                <span>{isAuthenticated ? "Open Dashboard" : "Create Free Account"}</span>
                <ArrowRight className="w-4 h-4 text-[#0B0D0C]" />
              </Link>

              <Link
                to={isAuthenticated ? "/workflows/new" : "/login"}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3.5 rounded-xl bg-[#0B0D0C] hover:bg-[#111311] text-[#F5F0E6] border border-[rgba(185,176,160,0.2)] font-semibold text-sm sm:text-base transition-colors"
              >
                <span>{isAuthenticated ? "New Workflow" : "Sign In to Account"}</span>
              </Link>
            </div>

            <p className="text-[11px] text-[#B9B0A0]/70 pt-2 font-mono">
              Self-contained execution engine • MongoDB Atlas • Google Gemini API
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
