/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckSquare, ShieldCheck, Mail, Lock, User, Sparkles, 
  ArrowRight, ShieldAlert, AlertCircle, Info, RefreshCw, KeyRound, Check
} from 'lucide-react';
import { 
  registerUser, 
  loginUser, 
  authenticateWithGoogle,
  forgotPassword,
  resetPassword
} from '../../services/api';
import { AppState, User as UserType } from '../../lib/types';
import { safeStorage } from '../../lib/storage';

interface AuthScreenProps {
  onAuthSuccess: (user: UserType, state: AppState) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const handleTraditionalAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login' && (!email || !password)) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'register' && (!email || !password || !name)) {
      setError('Please fully populate all required registration fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        const response = await loginUser(email, password);
        safeStorage.setItem('saas_authed_user_id', response.user.id);
        if (response.token) {
          safeStorage.setItem('saas_authed_token', response.token);
        }
        if (response.refreshToken) {
          safeStorage.setItem('saas_refresh_token', response.refreshToken);
        }
        onAuthSuccess(response.user, response.state);
      } else if (mode === 'register') {
        const response = await registerUser(name, email, password);
        safeStorage.setItem('saas_authed_user_id', response.user.id);
        if (response.token) {
          safeStorage.setItem('saas_authed_token', response.token);
        }
        if (response.refreshToken) {
          safeStorage.setItem('saas_refresh_token', response.refreshToken);
        }
        onAuthSuccess(response.user, response.state);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email address is required to initiate password recovery.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await forgotPassword(email);
      setSuccessMessage(response.message);
      // Autofill token for quick sandbox simulation testing
      if (response.resetToken) {
        setResetToken(response.resetToken);
      }
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setError('Both reset PIN and password are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await resetPassword(resetToken, newPassword);
      setSuccessMessage(response.message);
      setMode('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Authorization PIN validation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (presetEmail: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await loginUser(presetEmail, 'password123');
      safeStorage.setItem('saas_authed_user_id', response.user.id);
      if (response.token) {
        safeStorage.setItem('saas_authed_token', response.token);
      }
      if (response.refreshToken) {
        safeStorage.setItem('saas_refresh_token', response.refreshToken);
      }
      onAuthSuccess(response.user, response.state);
    } catch (err: any) {
      setError(err.message || 'Preset authentication lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail || !googleName) {
      setError('Please fill in your Google Account details.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await authenticateWithGoogle(googleName, googleEmail);
      safeStorage.setItem('saas_authed_user_id', response.user.id);
      if (response.token) {
        safeStorage.setItem('saas_authed_token', response.token);
      }
      if (response.refreshToken) {
        safeStorage.setItem('saas_refresh_token', response.refreshToken);
      }
      setShowGoogleModal(false);
      onAuthSuccess(response.user, response.state);
    } catch (err: any) {
      setError(err.message || 'Google Authenticator handshake failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800 relative overflow-hidden" id="auth-flow-container">
      {/* Ambient backgrounds */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-400/10 blur-3xl rounded-full translate-x-[-30%] translate-y-[-30%]" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/10 blur-3xl rounded-full translate-x-[30%] translate-y-[30%]" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-slate-200"
      >
        {/* Visual Brand Sidebar Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-8 flex flex-col justify-between text-white border-r border-slate-950">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-md">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-base tracking-tight text-white">SaaS Kanban Flow</span>
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="font-display font-bold text-xl leading-snug tracking-tight text-slate-100">
                Strategic Workspace Management
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your team context, collaborate with RAG document assistance, and balance workload metrics with zero friction.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-10 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Secure Session Guard
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every request is verified against JWT keys and client isolated context. Standard workspace accounts enroll with Member privileges.
            </p>
          </div>
        </div>

        {/* Form Interactive Panel */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-6 bg-slate-50/50">
          <div className="space-y-4">
            {/* Header switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h1 className="font-display font-bold text-slate-900 text-lg sm:text-xl">
                  {mode === 'login' && 'Verify Credentials'}
                  {mode === 'register' && 'Register Account'}
                  {mode === 'forgot' && 'Reset Request'}
                  {mode === 'reset' && 'Confirm Code PIN'}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {mode === 'login' && 'Access SaaS cloud workspace and tasks'}
                  {mode === 'register' && 'Enter details to provision Member access'}
                  {mode === 'forgot' && 'Enter your workspace email address'}
                  {mode === 'reset' && 'Confirm password recovery verification code'}
                </p>
              </div>
              
              <div className="flex gap-3 text-xs font-bold">
                {mode !== 'login' && (
                  <button 
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
                {mode === 'login' && (
                  <button 
                    onClick={() => {
                      setMode('register');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    Register
                  </button>
                )}
              </div>
            </div>

            {/* Notifications and errors */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs space-y-1.5 leading-relaxed"
                >
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Authentication Alert</strong>
                      <span className="whitespace-pre-line">{error}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs space-y-1.5 leading-relaxed"
                >
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Security Update</strong>
                      <span>{successMessage}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fast Credentials Presets Panel */}
            {mode === 'login' && (
              <div className="bg-amber-50 border border-amber-200/60 p-3.5 rounded-2xl text-xs text-amber-800 space-y-2">
                <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5" /> Fast Credentials Testing Presets (Double-Click):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleQuickLogin('alice.admin@kanban.com')}
                    disabled={loading}
                    className="bg-white hover:bg-amber-100 border border-amber-200/60 px-2 py-1.5 rounded-xl font-mono text-[10px] text-left transition select-none cursor-pointer"
                  >
                    <span className="font-bold text-indigo-700">Admin Context</span><br />
                    alice.admin@kanban.com
                  </button>
                  <button 
                    onClick={() => handleQuickLogin('bob.user@kanban.com')}
                    disabled={loading}
                    className="bg-white hover:bg-amber-100 border border-amber-200/60 px-2 py-1.5 rounded-xl font-mono text-[10px] text-left transition select-none cursor-pointer"
                  >
                    <span className="font-bold text-slate-700">Member Context</span><br />
                    bob.user@kanban.com
                  </button>
                  <button 
                    onClick={() => handleQuickLogin('carol.view@kanban.com')}
                    disabled={loading}
                    className="bg-white hover:bg-amber-100 border border-amber-200/60 px-2 py-1.5 rounded-xl font-mono text-[10px] text-left transition select-none cursor-pointer"
                  >
                    <span className="font-bold text-indigo-900">Viewer Context</span><br />
                    carol.view@kanban.com
                  </button>
                </div>
              </div>
            )}

            {/* Login & Register Forms */}
            {(mode === 'login' || mode === 'register') && (
              <form onSubmit={handleTraditionalAuth} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input 
                      type="email" 
                      placeholder="john.doe@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    {mode === 'login' && (
                      <button 
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition outline-none"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Register Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Forgot Password Recovery Mode */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Workspace Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input 
                      type="email" 
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : (
                    <>
                      Send Recovery Code PIN
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Reset Password Validation Mode */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">6-Digit Reset PIN Code</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input 
                      type="text" 
                      placeholder="123456"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      disabled={loading}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : (
                    <>
                      Update Your Password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Social Google connect */}
          {mode === 'login' && (
            <div className="border-t border-slate-200 pt-5 text-center">
              <p className="text-xs text-slate-400 mb-3.5">— Or connect with enterprise credentials —</p>
              <button
                onClick={() => {
                  setGoogleEmail('');
                  setGoogleName('');
                  setError(null);
                  setSuccessMessage(null);
                  setShowGoogleModal(true);
                }}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 hover:border-slate-300 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span>Verify with Google Workplace</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Simulated Google SSO Dialog */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">Google Single Sign-On</span>
                </div>
                <button 
                  onClick={() => setShowGoogleModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  X
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                  Sign in with Google API
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Authenticate your workspace account context securely via unified company directories.
                </p>
              </div>

              {/* Sample suggetions */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[10.5px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-700">Quick Suggesters (Click to populate):</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button 
                    onClick={() => {
                      setGoogleEmail('alice.admin@kanban.com');
                      setGoogleName('Alice Chen');
                    }}
                    className="bg-white border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded text-slate-800 transition font-mono"
                  >
                    Alice Admin
                  </button>
                  <button 
                    onClick={() => {
                      setGoogleEmail('bob.user@kanban.com');
                      setGoogleName('Bob Johnson');
                    }}
                    className="bg-white border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded text-slate-800 transition font-mono"
                  >
                    Bob User
                  </button>
                </div>
              </div>

              <form onSubmit={handleGoogleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Workspace User Name</label>
                  <input 
                    type="text" 
                    placeholder="David Miller"
                    required
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-xl py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">Workspace Google Email</label>
                  <input 
                    type="email" 
                    placeholder="david@company.com"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-xl py-2 px-3 text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs py-2.5 rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Verify Google SSO Account
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
