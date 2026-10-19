import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Cpu, 
  LayoutDashboard, 
  LogIn, 
  UserPlus, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  ArrowRight,
  PlayCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const handleSectionNav = (sectionId) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(185,176,160,0.12)] bg-[#0B0D0C]/85 backdrop-blur-md shadow-inner-highlight">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B45B] rounded-xl"
            onClick={() => {
              if (location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#151715] border border-[rgba(229,180,91,0.3)] shadow-glow-gold flex items-center justify-center group-hover:scale-105 group-hover:border-[#E5B45B]/60 transition-all duration-200">
              <Cpu className="w-5 h-5 text-[#E5B45B]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#F5F0E6] block leading-tight">
                FlowForge <span className="text-[#E5B45B]">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#B9B0A0] font-medium hidden sm:block">
                Autonomous Workflow Engine
              </span>
            </div>
          </Link>

          {/* Desktop Section Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 p-1 rounded-xl bg-[#151715]/60 border border-[rgba(185,176,160,0.12)] shadow-inner-highlight">
            <span className="inline-flex items-center space-x-1.5 px-2 py-1 text-[10px] font-mono text-[#059669]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
              <span>v3.0</span>
            </span>
            <button
              onClick={() => handleSectionNav('features')}
              className="px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B45B]"
            >
              Capabilities
            </button>
            <button
              onClick={() => handleSectionNav('how-it-works')}
              className="px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B45B]"
            >
              Pipeline
            </button>
            <button
              onClick={() => handleSectionNav('use-cases')}
              className="px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B45B]"
            >
              Deployments
            </button>
            <button
              onClick={() => handleSectionNav('faq')}
              className="px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B45B]"
            >
              Specs
            </button>
          </nav>

          {/* Desktop Authentication Navigation */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/executions"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] border border-[rgba(185,176,160,0.12)] hover:border-[#059669]/40 transition-all active:scale-[0.98]"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Executions</span>
                </Link>

                <Link
                  to="/dashboard"
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#252419] border border-[rgba(229,180,91,0.3)] text-[#F5F0E6] hover:border-[#E5B45B] transition-all shadow-glow-gold active:scale-[0.98]"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#E5B45B]" />
                  <span>Dashboard</span>
                </Link>

                <div className="flex items-center space-x-2 pl-2 border-l border-[rgba(185,176,160,0.12)]">
                  <span className="text-xs text-[#B9B0A0] font-medium max-w-[110px] truncate">
                    {user?.name || user?.email || 'Account'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#C83C3C] hover:bg-[#C83C3C]/10 transition-colors"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] shadow-glow-gold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] border border-[rgba(185,176,160,0.12)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B45B]"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#E5B45B]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[rgba(185,176,160,0.1)] bg-[#0B0D0C] px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <button
              onClick={() => handleSectionNav('features')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715]"
            >
              Features
            </button>
            <button
              onClick={() => handleSectionNav('preview')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715]"
            >
              Interactive Preview
            </button>
            <button
              onClick={() => handleSectionNav('how-it-works')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715]"
            >
              How It Works
            </button>
            <button
              onClick={() => handleSectionNav('use-cases')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715]"
            >
              Use Cases
            </button>
            <button
              onClick={() => handleSectionNav('faq')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715]"
            >
              FAQ
            </button>
          </div>

          <div className="pt-3 border-t border-[rgba(185,176,160,0.1)] space-y-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-[#252419] border border-[rgba(229,180,91,0.3)] text-[#F5F0E6]"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#E5B45B]" />
                  <span>Go to Dashboard</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl text-sm font-medium text-[#C83C3C] hover:bg-[#C83C3C]/10 border border-transparent"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold text-[#F5F0E6] bg-[#151715] border border-[rgba(185,176,160,0.15)]"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold bg-[#E5B45B] text-[#0B0D0C] shadow-md shadow-[#E5B45B]/20"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
