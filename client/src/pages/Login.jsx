import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Cpu, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  Shield,
  Workflow,
  Sparkles,
  Server
} from 'lucide-react';
import { loginUser, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const successNotice = location.state?.registeredMessage;
  const initialEmail = location.state?.registeredEmail || '';
  const isSessionExpired = new URLSearchParams(location.search).get('session_expired') === 'true';

  const storedRedirect = (() => {
    try {
      return sessionStorage.getItem('flowforge_redirect_after_login');
    } catch {
      return null;
    }
  })();
  const redirectPath = location.state?.from?.pathname || storedRedirect || '/dashboard';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      if (response?.success && response?.token) {
        try {
          sessionStorage.removeItem('flowforge_redirect_after_login');
        } catch {
          // Ignore storage restrictions
        }
        login(response.token, response.user);
        navigate(redirectPath, { replace: true });
      } else {
        setError(response?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#E5B45B]/20 selection:text-[#E5B45B]">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Column: Industrial Platform Console (Desktop) */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-between space-y-6 p-7 rounded-3xl bg-[#141714] border border-[rgba(185,176,160,0.14)] shadow-inner-highlight text-left">
          <div className="space-y-4">
            <div className="inline-flex w-12 h-12 rounded-xl bg-[#252419] border border-[rgba(229,180,91,0.25)] items-center justify-center shadow-glow-gold">
              <Cpu className="w-6 h-6 text-[#E5B45B]" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-[#E5B45B] font-bold uppercase tracking-wider block">
                // OPERATOR ACCESS
              </span>
              <h2 className="text-xl font-bold text-[#F5F0E6] tracking-tight">
                FlowForge AI Workspace
              </h2>
              <p className="text-xs text-[#B9B0A0] leading-relaxed">
                Connect to your isolated MongoDB workspace to run visual DAG pipelines with millisecond telemetry.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex items-center justify-between">
              <span className="text-[10px] text-[#B9B0A0]">AUTH PROTOCOL</span>
              <span className="text-[10px] text-[#059669] font-bold">JWT Bearer</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex items-center justify-between">
              <span className="text-[10px] text-[#B9B0A0]">DATA ISOLATION</span>
              <span className="text-[10px] text-[#E5B45B] font-bold">Tenant Scoped</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] flex items-center justify-between">
              <span className="text-[10px] text-[#B9B0A0]">AI FAILOVER</span>
              <span className="text-[10px] text-[#059669] font-bold">3-Tier Cascade</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[rgba(185,176,160,0.08)] flex items-center space-x-2 text-[10px] font-mono text-[#B9B0A0]">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            <span>Server Cluster: Online</span>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="md:col-span-7 space-y-6">
          {/* Card Container */}
          <div className="rounded-3xl border border-[rgba(185,176,160,0.14)] bg-[#151715] p-5 sm:p-7 shadow-2xl shadow-inner-highlight space-y-6 text-left">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#F5F0E6]">
                Sign in to your account
              </h1>
              <p className="text-xs text-[#B9B0A0]">
                Enter your credentials or use Google Single Sign-On.
              </p>
            </div>

            {/* Session Expired Notice */}
            {isSessionExpired && !error && !successNotice && (
              <div className="p-3.5 rounded-xl bg-[#E5B45B]/15 border border-[#E5B45B]/30 flex items-start space-x-2.5 text-[#E5B45B] text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#E5B45B]" />
                <div>
                  <p className="font-semibold text-[#F5F0E6]">Session Expired</p>
                  <p className="text-xs text-[#E5B45B] mt-0.5">Your security session timed out. Please sign in to resume your workspace.</p>
                </div>
              </div>
            )}

            {/* Post-Registration Success Banner */}
            {successNotice && !error && (
              <div className="p-3.5 rounded-xl bg-[#059669]/15 border border-[#059669]/30 flex items-start space-x-2.5 text-[#059669] text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#059669]" />
                <div>
                  <p className="font-semibold text-[#F5F0E6]">Registration Complete</p>
                  <p className="text-xs text-[#059669] mt-0.5">{successNotice}</p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[#C83C3C]/15 border border-[#C83C3C]/30 flex items-start space-x-2.5 text-[#C83C3C] text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#C83C3C]" />
                <div className="flex-1">
                  <p className="font-semibold text-[#F5F0E6]">Authentication Failed</p>
                  <p className="text-xs text-[#C83C3C] mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Google Sign In */}
            <GoogleSignInButton
              loading={loading}
              setLoading={setLoading}
              isSignUp={false}
              onSuccess={(response) => {
                try {
                  sessionStorage.removeItem('flowforge_redirect_after_login');
                } catch {
                  // Ignore storage restrictions
                }
                login(response.token, response.user);
                navigate(redirectPath, { replace: true });
              }}
              onError={(errMsg) => setError(errMsg)}
            />

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[rgba(185,176,160,0.12)]"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-wider text-[#B9B0A0]/60">
                or email access
              </span>
              <div className="flex-grow border-t border-[rgba(185,176,160,0.12)]"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email Field */}
              <div className="space-y-1">
                <label 
                  htmlFor="login-email" 
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#B9B0A0]"
                >
                  Email Address
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#B9B0A0]/70">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    disabled={loading}
                    autoComplete="email"
                    placeholder="operator@flowforge.ai"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0D0C] border text-[#F5F0E6] placeholder-[#B9B0A0]/50 text-sm transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.email
                        ? 'border-[#C83C3C] focus:ring-[#C83C3C]/20'
                        : 'border-[rgba(185,176,160,0.14)] focus:border-[#E5B45B] focus:ring-[#E5B45B]/20'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-[#C83C3C] font-medium pl-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label 
                  htmlFor="login-password" 
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#B9B0A0]"
                >
                  Password
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#B9B0A0]/70">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    disabled={loading}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#0B0D0C] border text-[#F5F0E6] placeholder-[#B9B0A0]/50 text-sm transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.password
                        ? 'border-[#C83C3C] focus:ring-[#C83C3C]/20'
                        : 'border-[rgba(185,176,160,0.14)] focus:border-[#E5B45B] focus:ring-[#E5B45B]/20'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#B9B0A0] hover:text-[#F5F0E6] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-[#C83C3C] font-medium pl-1">{fieldErrors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold text-sm shadow-lg shadow-[#E5B45B]/20 transition-all hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 motion-safe:animate-spin text-[#0B0D0C]" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <ArrowRight className="w-4 h-4 text-[#0B0D0C]" />
                  </>
                )}
              </button>
            </form>

            {/* Footer inside card */}
            <div className="pt-3 border-t border-[rgba(185,176,160,0.1)] text-center text-xs text-[#B9B0A0]">
              Need a new workspace?{' '}
              <Link
                to="/register"
                className="font-medium text-[#E5B45B] hover:text-[#D49E3F] transition-colors underline-offset-4 hover:underline"
              >
                Create Account Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
