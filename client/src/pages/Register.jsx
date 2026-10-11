import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Cpu, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  Sparkles 
} from 'lucide-react';
import { registerUser, getErrorMessage } from '../services/api';

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) {
      errors.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long.';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
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
      const response = await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (response?.success) {
        setRegisteredSuccess(true);
      } else {
        setError(response?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // State: Registration Succeeded View
  if (registeredSuccess) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-3xl border border-[#059669]/40 bg-[#151715] backdrop-blur-xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#059669]/15 border border-[#059669]/40 text-[#059669] flex items-center justify-center mx-auto shadow-glow-emerald">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#F5F0E6] tracking-tight">
                Account Created Successfully!
              </h2>
              <p className="text-sm text-[#B9B0A0]">
                Your workspace profile for <span className="text-[#059669] font-medium">{email.toLowerCase()}</span> has been established.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.1)] text-xs text-[#B9B0A0] text-left space-y-1.5">
              <div className="flex items-center space-x-2 text-[#F5F0E6] font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#E5B45B]" />
                <span>Next Step</span>
              </div>
              <p>Sign in with your new email and password to access your pipeline dashboard.</p>
            </div>

            <button
              onClick={() => navigate('/login', { state: { registeredEmail: email.toLowerCase(), registeredMessage: 'Account created! Please sign in below.' } })}
              className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold shadow-lg shadow-[#E5B45B]/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4 text-[#0B0D0C]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header with Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#151715] border border-[rgba(229,180,91,0.3)] items-center justify-center shadow-glow-gold">
            <Cpu className="w-7 h-7 text-[#E5B45B]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F5F0E6]">
            Create an account
          </h1>
          <p className="text-sm text-[#B9B0A0]">
            Get started with self-healing automation on FlowForge AI.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-[rgba(185,176,160,0.12)] bg-[#151715] backdrop-blur-xl p-8 shadow-2xl space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-[#C83C3C]/15 border border-[#C83C3C]/30 flex items-start space-x-3 text-[#C83C3C] text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#C83C3C]" />
              <div className="flex-1">
                <p className="font-semibold text-[#F5F0E6]">Registration Failed</p>
                <p className="text-xs text-[#C83C3C] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Name Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="register-name" 
                className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]"
              >
                Full Name
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#B9B0A0]/70">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  disabled={loading}
                  autoComplete="name"
                  placeholder="Alex Rivera"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0D0C] border text-[#F5F0E6] placeholder-[#B9B0A0]/50 text-sm transition-all focus:outline-none focus:ring-2 ${
                    fieldErrors.name
                      ? 'border-[#C83C3C] focus:ring-[#C83C3C]/20'
                      : 'border-[rgba(185,176,160,0.14)] focus:border-[#E5B45B] focus:ring-[#E5B45B]/20'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-xs text-[#C83C3C] font-medium pl-1">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="register-email" 
                className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]"
              >
                Work Email
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#B9B0A0]/70">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-email"
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
                  placeholder="alex@flowforge.ai"
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
            <div className="space-y-1.5">
              <label 
                htmlFor="register-password" 
                className="block text-xs font-semibold uppercase tracking-wider text-[#B9B0A0]"
              >
                Password
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#B9B0A0]/70">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  disabled={loading}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
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
              className="w-full mt-2 inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#E5B45B] hover:bg-[#D49E3F] text-[#0B0D0C] font-bold shadow-lg shadow-[#E5B45B]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B0D0C]" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 text-[#0B0D0C]" />
                </>
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="pt-2 border-t border-[rgba(185,176,160,0.1)] text-center text-xs text-[#B9B0A0]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-[#E5B45B] hover:text-[#D49E3F] transition-colors underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
