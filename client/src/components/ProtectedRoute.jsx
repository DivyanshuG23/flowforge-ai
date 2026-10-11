import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D0C] flex flex-col items-center justify-center space-y-4 text-[#F5F0E6]">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-[#151715] border border-[rgba(229,180,91,0.25)] shadow-glow-gold flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#E5B45B]" />
          </div>
        </div>
        <p className="text-sm font-medium text-[#B9B0A0]">Verifying FlowForge AI session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
