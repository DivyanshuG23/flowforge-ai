import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Workflow, 
  PlayCircle, 
  Layers, 
  Settings, 
  LogOut, 
  Cpu, 
  X,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose, onSelectFeature }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      active: location.pathname === '/dashboard',
    },
    {
      id: 'workflows',
      label: 'Workflows',
      path: '/workflows/new',
      icon: Workflow,
      active: location.pathname === '/workflows/new',
    },
    {
      id: 'executions',
      label: 'Executions',
      path: '/executions',
      icon: PlayCircle,
      active: location.pathname === '/executions',
      badge: 'Live',
      badgeColor: 'text-[#059669] bg-[#059669]/10 border-[#059669]/20',
    },
    {
      id: 'templates',
      label: 'Templates',
      path: '/templates',
      icon: Layers,
      active: location.pathname === '/templates',
      badge: 'Library',
      badgeColor: 'text-[#E5B45B] bg-[#E5B45B]/10 border-[#E5B45B]/20',
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      active: location.pathname === '/settings',
      badge: 'Config',
      badgeColor: 'text-[#059669] bg-[#059669]/10 border-[#059669]/20',
    },
  ];


  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0B0D0C]/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B0D0C] border-r border-[rgba(185,176,160,0.12)] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header with Tagline */}
          <div className="h-20 px-6 flex items-center justify-between border-b border-[rgba(185,176,160,0.08)]">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#151715] border border-[rgba(229,180,91,0.3)] shadow-glow-gold flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Cpu className="w-5 h-5 text-[#E5B45B]" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-[#F5F0E6] block leading-tight">
                  FlowForge <span className="text-[#E5B45B]">AI</span>
                </span>
                <span className="text-[10px] font-medium text-[#B9B0A0] tracking-wider block mt-0.5 uppercase">
                  Build. Automate. Scale.
                </span>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#B9B0A0]/60">
              Workspace
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.path) {
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => {
                      if (onClose) onClose();
                    }}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      item.active
                        ? 'bg-[#252419] text-[#F5F0E6] border border-[rgba(229,180,91,0.35)] shadow-glow-gold font-semibold'
                        : 'text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${item.active ? 'text-[#E5B45B]' : 'text-[#B9B0A0]'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-[#252419] text-[#E5B45B] border-[rgba(229,180,91,0.25)]'}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onClose) onClose();
                    if (item.action) item.action();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 text-[#B9B0A0] group-hover:text-[#E5B45B] transition-colors" />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* User Profile Section & Sign Out Button */}
          <div className="p-4 border-t border-[rgba(185,176,160,0.08)] bg-[#0B0D0C]">
            <div className="p-3.5 rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.12)] space-y-3">
              <Link
                to="/settings"
                onClick={() => {
                  if (onClose) onClose();
                }}
                className="flex items-center space-x-3 group/profile hover:opacity-90 transition-opacity"
                title="Manage Workspace & Profile Settings"
              >
                <div className="w-9 h-9 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.3)] flex items-center justify-center text-[#E5B45B] font-bold text-xs shadow-md group-hover/profile:border-[#E5B45B]">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#F5F0E6] truncate group-hover/profile:text-[#E5B45B] transition-colors">
                    {user?.name || user?.email || 'User'}
                  </p>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)]">
                      {user?.role || 'user'}
                    </span>
                    <span className="text-[10px] text-[#B9B0A0] truncate">
                      {user?.email || 'Free Tier'}
                    </span>
                  </div>
                </div>
              </Link>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-[#0B0D0C] hover:bg-[#1C1F1C] text-xs font-medium text-[#B9B0A0] hover:text-[#C83C3C] border border-[rgba(185,176,160,0.1)] hover:border-[#C83C3C]/30 transition-colors"
                title="Sign out of FlowForge AI"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
