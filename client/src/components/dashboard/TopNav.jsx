import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  User as UserIcon, 
  Check, 
  Sparkles,
  Command
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function TopNav({ 
  onOpenMobileSidebar, 
  searchQuery: propSearchQuery, 
  onSearchChange: propOnSearchChange 
}) {
  const { user } = useAuth();
  const [internalQuery, setInternalQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const searchInputRef = useRef(null);

  const isControlled = propSearchQuery !== undefined;
  const currentQuery = isControlled ? propSearchQuery : internalQuery;

  const handleQueryChange = (e) => {
    const val = e.target.value;
    if (isControlled) {
      if (propOnSearchChange) propOnSearchChange(val);
    } else {
      setInternalQuery(val);
    }
  };

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B0D0C]/85 backdrop-blur-md border-b border-[rgba(185,176,160,0.1)] px-3 sm:px-6 lg:px-8 flex items-center justify-between shadow-inner-highlight">
      {/* Left: Mobile hamburger & Search */}
      <div className="flex items-center space-x-2.5 sm:space-x-4 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-[#B9B0A0] hover:text-[#F5F0E6] hover:bg-[#151715] border border-[rgba(185,176,160,0.1)] transition-colors shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input for workflows, executions, and templates */}
        <div className="relative w-full max-w-xs sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#B9B0A0]/70">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={currentQuery}
            onChange={handleQueryChange}
            placeholder="Search workflows, executions, templates..."
            aria-label="Search workflows, executions, templates"
            className="w-full pl-8 sm:pl-9 pr-8 sm:pr-14 py-2 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.12)] shadow-inner-highlight text-[#F5F0E6] placeholder-[#B9B0A0]/60 text-xs sm:text-sm focus:outline-none focus:border-[#E5B45B] focus:ring-2 focus:ring-[#E5B45B]/15 transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="hidden sm:inline-flex items-center space-x-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#0B0D0C] text-[#B9B0A0]/70 border border-[rgba(185,176,160,0.12)]">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </span>
          </div>
        </div>
      </div>


      {/* Right: Telemetry pill, Notification icon, and User Profile with Plan */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        {/* Backend health status pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#151715] border border-[rgba(185,176,160,0.12)] text-xs text-[#B9B0A0]">
          <span className="flex h-2 w-2 relative">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
          </span>
          <span className="text-[#F5F0E6] font-medium text-xs">Engine Online</span>
        </div>

        {/* Notifications Icon (with popover preview) */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-[#151715] border border-[rgba(185,176,160,0.12)] text-[#B9B0A0] hover:text-[#F5F0E6] hover:border-[#E5B45B]/40 transition-all relative"
            title="System notifications"
            aria-label="System notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E5B45B]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] rounded-2xl bg-[#151715] border border-[rgba(185,176,160,0.18)] shadow-2xl shadow-inner-highlight p-4 space-y-3 z-50">
              <div className="flex items-center justify-between border-b border-[rgba(185,176,160,0.08)] pb-2.5">
                <span className="text-xs font-semibold text-[#F5F0E6]">Notifications</span>
                <span className="text-[10px] text-[#E5B45B] font-mono">System Active</span>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] flex items-start space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#059669]/15 text-[#059669] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#F5F0E6]">System Operational</p>
                    <p className="text-[11px] text-[#B9B0A0]">Database connected and authentication verified.</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.08)] flex items-start space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#F5F0E6]">Luxury Industrial UI</p>
                    <p className="text-[11px] text-[#B9B0A0]">Charcoal Black and Champagne Gold palette applied.</p>
                  </div>
                </div>
              </div>

              <div className="pt-1 text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-medium text-[#E5B45B] hover:text-[#D49E3F] transition-colors"
                >
                  Dismiss all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Area with Plan Information */}
        <Link 
          to="/settings"
          title="Workspace & Security Settings"
          className="flex items-center space-x-2.5 pl-2 sm:pl-3 border-l border-[rgba(185,176,160,0.12)] group hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.3)] flex items-center justify-center text-[#E5B45B] font-bold text-xs shadow-md group-hover:border-[#E5B45B] transition-colors">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-semibold text-[#F5F0E6] group-hover:text-[#E5B45B] transition-colors leading-tight max-w-[120px] truncate">
              {user?.name || user?.email || 'User'}
            </span>
            <span className="block text-[10px] text-[#E5B45B] font-medium leading-none mt-0.5">
              {user?.role === 'admin' ? 'Enterprise Plan' : 'Free Tier'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
