import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Cpu, 
  LayoutDashboard, 
  Home, 
  LogIn, 
  UserPlus, 
  LogOut, 
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(185,176,160,0.12)] bg-[#0B0D0C]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#151715] border border-[rgba(229,180,91,0.3)] shadow-glow-gold flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <Cpu className="w-5 h-5 text-[#E5B45B]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#F5F0E6]">
                FlowForge <span className="text-[#E5B45B]">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)]">
                Build. Automate. Scale.
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-2">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-[#252419] text-[#F5F0E6] border border-[rgba(229,180,91,0.35)] shadow-glow-gold font-semibold'
                  : 'text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715]'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <Link
              to="/dashboard"
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'bg-[#252419] text-[#F5F0E6] border border-[rgba(229,180,91,0.35)] shadow-glow-gold font-semibold'
                  : 'text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            {/* Authentication States */}
            <div className="flex items-center pl-2 sm:pl-4 border-l border-[rgba(185,176,160,0.12)] space-x-2">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#151715] border border-[rgba(185,176,160,0.14)] text-xs">
                    <UserIcon className="w-3.5 h-3.5 text-[#E5B45B]" />
                    <span className="text-[#F5F0E6] font-medium max-w-[120px] truncate">
                      {user?.name || user?.email || 'User'}
                    </span>
                    {user?.role && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)]">
                        {user.role}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#B9B0A0] hover:text-[#C83C3C] hover:bg-[#C83C3C]/10 border border-transparent hover:border-[#C83C3C]/20 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive('/login')
                        ? 'bg-[#252419] text-[#F5F0E6] border border-[rgba(229,180,91,0.35)]'
                        : 'text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715]'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </Link>

                  <Link
                    to="/register"
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] shadow-md shadow-[#E5B45B]/20 transition-all hover:scale-[1.02]"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#0B0D0C]" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
