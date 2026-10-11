import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bot, 
  Sparkles, 
  Activity, 
  Server, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { checkHealth } from '../services/api';

export default function Home() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkHealth();
      setHealthStatus(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server');
      setHealthStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-16 py-8 text-[#F5F0E6]">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#252419] border border-[rgba(229,180,91,0.25)] text-[#E5B45B] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Autonomous Workflow Engine</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto">
          Intelligent Workflow Automation &{' '}
          <span className="text-[#E5B45B]">
            Self-Healing Platform
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#B9B0A0] max-w-2xl mx-auto leading-relaxed">
          Automate your work, build intelligent workflows, and save hours with FlowForge AI.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold shadow-lg shadow-[#E5B45B]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4 text-[#0B0D0C]" />
          </Link>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#151715] hover:bg-[#1C1F1C] text-[#F5F0E6] border border-[rgba(185,176,160,0.15)] font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-[#E5B45B] ${loading ? 'animate-spin' : ''}`} />
            <span>Test API Health</span>
          </button>
        </div>
      </section>

      {/* Live Health Check Card */}
      <section className="max-w-xl mx-auto">
        <div className="rounded-3xl border border-[rgba(185,176,160,0.12)] bg-[#151715] backdrop-blur p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(185,176,160,0.08)] pb-4">
            <div className="flex items-center space-x-2.5">
              <Activity className="w-5 h-5 text-[#059669]" />
              <h2 className="font-semibold text-[#F5F0E6]">Backend API Connectivity</h2>
            </div>
            <span className="text-xs text-[#B9B0A0] font-mono">GET /api/health</span>
          </div>

          <div>
            {loading ? (
              <div className="flex items-center space-x-3 text-sm text-[#B9B0A0] py-3">
                <RefreshCw className="w-4 h-4 animate-spin text-[#E5B45B]" />
                <span>Pinging Express API server...</span>
              </div>
            ) : healthStatus ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-[#059669] text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Connection Operational</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] font-mono text-xs text-[#B9B0A0]">
                  <pre>{JSON.stringify(healthStatus, null, 2)}</pre>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[#C83C3C] text-sm font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Connection Issue</span>
                </div>
                <p className="text-xs text-[#B9B0A0]">{error}</p>
                <p className="text-xs text-[#B9B0A0]/70">Ensure backend server is running on port 5000.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Architecture Foundations Grid */}
      <section className="max-w-5xl mx-auto">
        <h3 className="text-center text-xs font-semibold tracking-wider text-[#B9B0A0] uppercase mb-8">
          Enterprise Architecture Pillars
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[rgba(185,176,160,0.12)] bg-[#151715] p-6 space-y-3 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-[#F5F0E6]">Frontend Foundation</h4>
            <p className="text-sm text-[#B9B0A0] leading-relaxed">
              Vite + React with client-side routing, luxury industrial styling, Axios client, and Lucide icons.
            </p>
          </div>

          <div className="rounded-2xl border border-[rgba(185,176,160,0.12)] bg-[#151715] p-6 space-y-3 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)] flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-[#F5F0E6]">Backend API Services</h4>
            <p className="text-sm text-[#B9B0A0] leading-relaxed">
              Express.js architecture organized with controllers, JWT auth middleware, MongoDB, and protected routes.
            </p>
          </div>

          <div className="rounded-2xl border border-[rgba(185,176,160,0.12)] bg-[#151715] p-6 space-y-3 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-[#059669]/15 text-[#059669] border border-[#059669]/30 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-[#F5F0E6]">Self-Healing Telemetry</h4>
            <p className="text-sm text-[#B9B0A0] leading-relaxed">
              Dedicated architecture prepared for autonomous anomaly detection, retry loops, and event streams.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
