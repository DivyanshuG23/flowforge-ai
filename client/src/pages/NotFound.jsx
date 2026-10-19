import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-6 text-[#F5F0E6] relative">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#E5B45B]/5 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] shadow-2xl shadow-inner-highlight flex flex-col items-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#C83C3C]/15 border border-[#C83C3C]/30 flex items-center justify-center text-[#C83C3C] shadow-glow-ruby">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#E5B45B]">
            Error 404 • Route Missing
          </span>
          <h1 className="text-3xl font-extrabold text-[#F5F0E6] tracking-tight">
            Pipeline Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[#B9B0A0] leading-relaxed max-w-sm pt-1">
            The workflow canvas, execution trace, or route you requested could not be resolved in this workspace.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full">
          <Link
            to="/"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold text-xs sm:text-sm shadow-glow-gold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#151715] hover:bg-[#252419] text-[#F5F0E6] hover:text-[#E5B45B] border border-[rgba(185,176,160,0.16)] hover:border-[#E5B45B]/40 text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
