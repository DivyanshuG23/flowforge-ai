import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, 
  Shield, 
  Zap, 
  Workflow, 
  PlayCircle, 
  Activity, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

export default function Footer() {
  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t border-[rgba(185,176,160,0.12)] bg-[#0B0D0C] text-[#B9B0A0] text-xs pt-16 pb-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[rgba(185,176,160,0.08)]">
          {/* Column 1: Brand & Identity (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl bg-[#151715] border border-[rgba(229,180,91,0.3)] shadow-glow-gold flex items-center justify-center group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5 text-[#E5B45B]" />
              </div>
              <span className="text-lg font-bold text-[#F5F0E6] tracking-tight">
                FlowForge <span className="text-[#E5B45B]">AI</span>
              </span>
            </Link>

            <p className="text-xs text-[#B9B0A0] leading-relaxed max-w-sm">
              The autonomous visual automation platform for technical teams. Connect webhook triggers, multi-model AI reasoning, and deterministic condition branching with full execution telemetry.
            </p>

            <div className="pt-2 flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
              </span>
              <span className="text-[11px] font-mono text-[#F5F0E6]">
                Engine Online • Verified Gemini 3.5 Flash Active
              </span>
            </div>
          </div>

          {/* Column 2: Platform Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F0E6]">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/workflows/new" className="hover:text-[#E5B45B] transition-colors flex items-center space-x-1.5">
                  <Workflow className="w-3.5 h-3.5 text-[#E5B45B]" />
                  <span>Visual Canvas</span>
                </Link>
              </li>
              <li>
                <Link to="/executions" className="hover:text-[#E5B45B] transition-colors flex items-center space-x-1.5">
                  <PlayCircle className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Execution History</span>
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#E5B45B] transition-colors flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#B9B0A0]" />
                  <span>Platform Dashboard</span>
                </Link>
              </li>
              <li>
                <a
                  href={
                    import.meta.env.VITE_API_BASE_URL
                      ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')}/health`
                      : '/api/health'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E5B45B] transition-colors flex items-center space-x-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-[#059669]" />
                  <span>System Health Check</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Architecture & Features */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F0E6]">
              Architecture
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="hover:text-[#E5B45B] transition-colors text-left"
                >
                  Visual DAG Engine
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="hover:text-[#E5B45B] transition-colors text-left"
                >
                  Gemini & Fast LLMs
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="hover:text-[#E5B45B] transition-colors text-left"
                >
                  Condition Branching
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="hover:text-[#E5B45B] transition-colors text-left"
                >
                  Telemetry Tracing
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Resources & Authentication */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F0E6]">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="hover:text-[#E5B45B] transition-colors text-left"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('use-cases')}
                  className="hover:text-[#E5B45B] transition-colors text-left"
                >
                  Production Use Cases
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('faq')}
                  className="hover:text-[#E5B45B] transition-colors text-left"
                >
                  Architecture FAQ
                </button>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#E5B45B] transition-colors">
                  Account Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#E5B45B] transition-colors font-semibold text-[#E5B45B]">
                  Create Free Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Tech Badges */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#B9B0A0]/70">
          <p>© 2026 FlowForge AI. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-[#E5B45B]" />
              <span>React 19 + Vite</span>
            </span>
            <span className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-[#E5B45B]" />
              <span>JWT & User Tenancy</span>
            </span>
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-[#059669]" />
              <span>MongoDB Atlas Connected</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
