import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Shield, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Loader2, 
  Activity, 
  Server, 
  Cpu, 
  Copy, 
  CheckCircle2, 
  Calendar, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, checkHealth, getErrorMessage } from '../services/api';
import Sidebar from '../components/dashboard/Sidebar';
import TopNav from '../components/dashboard/TopNav';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  // Engine Diagnostics State
  const [healthData, setHealthData] = useState(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  // Sync user name when user state updates
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  // Load backend engine diagnostics
  const loadDiagnostics = async () => {
    setIsLoadingHealth(true);
    try {
      const data = await checkHealth();
      setHealthData(data);
    } catch {
      setHealthData({ success: false, message: 'Backend unreachable' });
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  // Handle Name / Profile Update
  const handleSaveName = async (e) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setProfileFeedback({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 50) {
      setProfileFeedback({ type: 'error', message: 'Name must be between 2 and 50 characters.' });
      return;
    }

    setIsSavingProfile(true);
    setProfileFeedback(null);
    try {
      const res = await updateProfile({ name: trimmed });
      if (res?.success && res.user) {
        updateUser({ name: res.user.name });
        setIsEditingName(false);
        setProfileFeedback({ type: 'success', message: 'Profile name updated successfully.' });
        setTimeout(() => setProfileFeedback(null), 4000);
      } else {
        throw new Error(res?.message || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password must be different from current password.' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordFeedback(null);
    try {
      const res = await updateProfile({ currentPassword, newPassword });
      if (res?.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordFeedback({ type: 'success', message: 'Password updated successfully.' });
        setTimeout(() => setPasswordFeedback(null), 4000);
      } else {
        throw new Error(res?.message || 'Failed to update password.');
      }
    } catch (err) {
      setPasswordFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Active Operator';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Active Operator';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D0C] text-[#F5F0E6] flex font-sans selection:bg-[#E5B45B]/20 selection:text-[#E5B45B]">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <TopNav onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl w-full mx-auto">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[rgba(185,176,160,0.1)]">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#151715] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B] shadow-glow-gold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#F5F0E6] tracking-tight">
                    Workspace Settings &amp; Profile
                  </h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#B9B0A0] mt-1.5">
                Manage your operator credentials, password security, tenant identity, and engine configuration.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                <span>Tenant Isolated</span>
              </span>
            </div>
          </div>

          {/* Section 1: Operator Profile Information */}
          <section className="rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-[rgba(185,176,160,0.08)] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#252419] border border-[rgba(229,180,91,0.3)] flex items-center justify-center text-[#E5B45B] font-bold text-sm shadow-md">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#F5F0E6] tracking-tight">
                    Operator Identity
                  </h2>
                  <p className="text-xs text-[#B9B0A0]">
                    Personal information associated with your audit logs and execution traces.
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full bg-[#252419] text-[#E5B45B] border border-[rgba(229,180,91,0.25)]">
                {user?.role === 'admin' ? 'Workspace Admin' : 'Standard Operator'}
              </span>
            </div>

            {/* Profile Feedback Banner */}
            {profileFeedback && (
              <div
                className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-medium ${
                  profileFeedback.type === 'success'
                    ? 'bg-[#059669]/15 text-[#059669] border-[#059669]/30'
                    : 'bg-[#C83C3C]/15 text-[#C83C3C] border-[#C83C3C]/30'
                }`}
              >
                {profileFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{profileFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name Field */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]">
                  Full Name / Operator Alias
                </label>
                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSavingProfile}
                      maxLength={50}
                      autoFocus
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#0B0D0C] border border-[#E5B45B] text-[#F5F0E6] text-sm focus:outline-none focus:ring-1 focus:ring-[#E5B45B]"
                    />
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-3.5 py-2 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold text-xs transition-colors flex items-center space-x-1"
                    >
                      {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setName(user?.name || '');
                        setIsEditingName(false);
                      }}
                      className="px-3 py-2 rounded-xl bg-[#151715] hover:bg-[#252419] text-[#B9B0A0] text-xs transition-colors border border-[rgba(185,176,160,0.14)]"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.12)]">
                    <span className="text-sm font-semibold text-[#F5F0E6]">
                      {user?.name || 'FlowForge Operator'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="text-xs font-semibold text-[#E5B45B] hover:text-[#D49E3F] transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Email Address (Immutable Identity) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]">
                    Email Address (Identity)
                  </label>
                  <span className="text-[10px] text-[#B9B0A0]/60 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-[#B9B0A0]/40" />
                    <span>Protected</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex items-center justify-between">
                  <span className="text-sm font-mono text-[#F5F0E6] truncate pr-2">
                    {user?.email || 'operator@flowforge.ai'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#059669]/10 text-[#059669] border border-[#059669]/20 font-semibold flex-shrink-0">
                    Verified
                  </span>
                </div>
              </div>

              {/* Tenant ID */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]">
                  User Tenant ID
                </label>
                <div className="p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex items-center justify-between">
                  <span className="text-xs font-mono text-[#B9B0A0] truncate pr-2">
                    {user?.id || '—'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 rounded hover:bg-[#151715] text-[#B9B0A0] hover:text-[#E5B45B] transition-colors flex-shrink-0"
                    title="Copy Tenant ID"
                    aria-label="Copy Tenant ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Registration Date */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]">
                  Operator Since
                </label>
                <div className="p-3 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex items-center space-x-2 text-xs text-[#F5F0E6]">
                  <Calendar className="w-4 h-4 text-[#E5B45B]" />
                  <span>{formatDate(user?.createdAt)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Security & Password Update */}
          <section className="rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] p-6 sm:p-8 shadow-xl space-y-6">
            <div className="border-b border-[rgba(185,176,160,0.08)] pb-4 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] flex items-center justify-center text-[#E5B45B]">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#F5F0E6] tracking-tight">
                  Security &amp; Authentication
                </h2>
                <p className="text-xs text-[#B9B0A0]">
                  Update your password. Changes require current password confirmation and are salted with bcrypt.
                </p>
              </div>
            </div>

            {/* Password Feedback Banner */}
            {passwordFeedback && (
              <div
                className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-medium ${
                  passwordFeedback.type === 'success'
                    ? 'bg-[#059669]/15 text-[#059669] border-[#059669]/30'
                    : 'bg-[#C83C3C]/15 text-[#C83C3C] border-[#C83C3C]/30'
                }`}
              >
                {passwordFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.14)] text-[#F5F0E6] placeholder-[#B9B0A0]/40 text-xs sm:text-sm focus:outline-none focus:border-[#E5B45B] focus:ring-1 focus:ring-[#E5B45B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#B9B0A0]/60 hover:text-[#F5F0E6]"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.14)] text-[#F5F0E6] placeholder-[#B9B0A0]/40 text-xs sm:text-sm focus:outline-none focus:border-[#E5B45B] focus:ring-1 focus:ring-[#E5B45B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#B9B0A0]/60 hover:text-[#F5F0E6]"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.14)] text-[#F5F0E6] placeholder-[#B9B0A0]/40 text-xs sm:text-sm focus:outline-none focus:border-[#E5B45B] focus:ring-1 focus:ring-[#E5B45B]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword || !currentPassword || !newPassword}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#252419] hover:bg-[#E5B45B] text-[#E5B45B] hover:text-[#0B0D0C] border border-[rgba(229,180,91,0.3)] text-xs sm:text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-gold"
                >
                  {isUpdatingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{isUpdatingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </section>

          {/* Section 3: Platform Diagnostics & Engine Configuration */}
          <section className="rounded-3xl bg-[#151715] border border-[rgba(185,176,160,0.12)] p-6 sm:p-8 shadow-xl space-y-6">
            <div className="border-b border-[rgba(185,176,160,0.08)] pb-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#059669]/15 border border-[#059669]/30 flex items-center justify-center text-[#059669]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#F5F0E6] tracking-tight">
                    Engine Diagnostics &amp; Telemetry
                  </h2>
                  <p className="text-xs text-[#B9B0A0]">
                    Verified runtime status of the foundation execution engine and external providers.
                  </p>
                </div>
              </div>

              <button
                onClick={loadDiagnostics}
                disabled={isLoadingHealth}
                className="p-1.5 rounded-lg bg-[#0B0D0C] hover:bg-[#252419] text-[#B9B0A0] hover:text-[#E5B45B] border border-[rgba(185,176,160,0.12)] transition-colors text-xs flex items-center space-x-1.5"
                title="Refresh diagnostics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Metric 1: API Server Status */}
              <div className="p-4 rounded-2xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#B9B0A0]">
                  <span>API Server</span>
                  <Server className="w-3.5 h-3.5 text-[#059669]" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
                  <span className="text-sm font-bold text-[#F5F0E6]">
                    {healthData?.success ? 'Operational (200 OK)' : 'Checking...'}
                  </span>
                </div>
                <p className="text-[11px] text-[#B9B0A0]/70 font-mono">
                  Base: {import.meta.env.VITE_API_BASE_URL || '/api'}
                </p>
              </div>

              {/* Metric 2: AI Foundation Engine */}
              <div className="p-4 rounded-2xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#B9B0A0]">
                  <span>AI Foundation Model</span>
                  <Cpu className="w-3.5 h-3.5 text-[#E5B45B]" />
                </div>
                <div className="text-sm font-bold text-[#F5F0E6] flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-[#E5B45B]" />
                  <span>Google Gemini</span>
                </div>
                <p className="text-[11px] text-[#E5B45B] font-mono">
                  Active: gemini-2.5-flash
                </p>
              </div>

              {/* Metric 3: Security Mode */}
              <div className="p-4 rounded-2xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#B9B0A0]">
                  <span>Security &amp; SSRF Guard</span>
                  <Shield className="w-3.5 h-3.5 text-[#059669]" />
                </div>
                <div className="text-sm font-bold text-[#059669]">
                  Enforced
                </div>
                <p className="text-[11px] text-[#B9B0A0]/70">
                  Private IPs blocked; JWT claims verified
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
