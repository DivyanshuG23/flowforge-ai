import React from 'react';
import { GitBranch, Shield, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(185,176,160,0.12)] bg-[#0B0D0C] py-8 mt-auto text-sm text-[#B9B0A0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#F5F0E6]">FlowForge AI</span>
            <span>—</span>
            <span className="text-xs sm:text-sm">Build. Automate. Scale.</span>
          </div>

          <div className="flex items-center space-x-6 text-xs text-[#B9B0A0]">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-[#E5B45B]" />
              <span>React 19 + Vite</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-[#E5B45B]" />
              <span>JWT Protected</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[#059669]" />
              <span>Engine Active</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
