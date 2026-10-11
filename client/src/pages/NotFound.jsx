import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-6 text-[#F5F0E6]">
      <div className="w-16 h-16 rounded-2xl bg-[#C83C3C]/15 border border-[#C83C3C]/30 flex items-center justify-center text-[#C83C3C]">
        <FileQuestion className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-[#F5F0E6] tracking-tight">404</h1>
        <h2 className="text-xl font-semibold text-[#F5F0E6]">Page Not Found</h2>
        <p className="text-sm text-[#B9B0A0] max-w-md">
          The page or workflow route you are looking for doesn't exist or has been moved.
        </p>
      </div>

      <div className="flex items-center space-x-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold text-sm transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#151715] hover:bg-[#1C1F1C] text-[#F5F0E6] border border-[rgba(185,176,160,0.15)] text-sm font-medium transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
