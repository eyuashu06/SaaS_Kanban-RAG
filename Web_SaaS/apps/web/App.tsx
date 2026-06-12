/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { fetchAppState, clearNotifications, switchUser } from './services/api';
import { AppState, User as UserType } from './lib/types';
import { safeStorage } from './lib/storage';
import KanbanBoardView from './components/kanban/KanbanBoardView';
import RAGChat from './components/kanban/RAGChat';
import AdminWiki from './components/kanban/AdminWiki';
import BillingHub from './components/kanban/BillingHub';
import AuthScreen from './components/kanban/AuthScreen';
import { 
  Layers, Sparkles, CreditCard, Bell, RefreshCw, CheckSquare, 
  UserCheck, CheckCircle, Info, Menu, X, ShieldAlert,
  LogOut, Shield, Briefcase, Eye, Activity, ClipboardList, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabId = 'boards' | 'rag' | 'wiki' | 'billing';

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('boards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Read local authentication token mock inside client browser
  const [isAuthenticated, setIsAuthenticated] = useState(!!safeStorage.getItem('saas_authed_user_id'));

  // Load backend state on mount
  const syncState = async (updated?: AppState) => {
    if (updated) {
      const localUserId = safeStorage.getItem('saas_authed_user_id');
      if (localUserId) {
        const matchedUser = updated.users.find(u => u.id === localUserId);
        if (matchedUser) {
          updated.currentUser = matchedUser;
        }
      }
      setState(updated);
      setIsAuthenticated(!!localUserId);
      return;
    }
    setSyncing(true);
    try {
      const localUserId = safeStorage.getItem('saas_authed_user_id');
      const res = await fetchAppState();

      if (localUserId && res.currentUser.id !== localUserId) {
        // Backend user does not match browser active session, align context
        try {
          const aligned = await switchUser(localUserId);
          const freshRes = await fetchAppState();
          const matchedUser = freshRes.users.find(u => u.id === localUserId);
          if (matchedUser) {
            freshRes.currentUser = matchedUser;
          }
          setState(freshRes);
          setIsAuthenticated(true);
        } catch (e) {
          console.warn('Session alignment query failed:', e);
          safeStorage.removeItem('saas_authed_user_id');
          safeStorage.removeItem('saas_authed_token');
          setIsAuthenticated(false);
          setState(res);
        }
      } else {
        if (localUserId) {
          const matchedUser = res.users.find(u => u.id === localUserId);
          if (matchedUser) {
            res.currentUser = matchedUser;
          }
          setIsAuthenticated(true);
        }
        setState(res);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Connection lost: Failed to sync backend state.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Perform initial fetch
    syncState();
    
    // Live Server-Sent Events stream listener for instantaneous collaboration
    const eventSource = new EventSource('/api/sync/stream');
    let fallbackInterval: any = null;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init' || data.type === 'sync') {
          const incoming = data.state;
          const localUserId = safeStorage.getItem('saas_authed_user_id');
          if (localUserId) {
            const matchedUser = incoming.users.find((u: any) => u.id === localUserId);
            if (matchedUser) {
              incoming.currentUser = matchedUser;
            }
          }
          setState(incoming);
        }
      } catch (err) {
        console.error('SSE JSON parsing error, fallback to REST polling:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('SSE stream handshake offline, subscribing backup active rest pollers.');
      fallbackInterval = setInterval(() => {
        if (isAuthenticated) {
          fetchAppState().then(res => {
            const localUserId = safeStorage.getItem('saas_authed_user_id');
            if (localUserId) {
              const matchedUser = res.users.find(u => u.id === localUserId);
              if (matchedUser) {
                res.currentUser = matchedUser;
              }
            }
            setState(res);
          }).catch(() => {});
        }
      }, 4000);
    };

    return () => {
      eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    safeStorage.removeItem('saas_authed_user_id');
    safeStorage.removeItem('saas_authed_token');
    setIsAuthenticated(false);
    window.location.reload();
  };

  const handleClearAllNotifications = async () => {
    try {
      const updated = await clearNotifications();
      setState(updated.state);
    } catch (err) {
      console.error('Failed to flush notifications:', err);
    }
  };

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans">
        <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-4 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-705 tracking-wide uppercase font-mono">Initializing Enterprise Tenancy...</p>
        </div>
      </div>
    );
  }

  // Render registration & login panels if unauthenticated
  if (!isAuthenticated || !state) {
    return (
      <AuthScreen 
        onAuthSuccess={(user, freshState) => {
          setState(freshState);
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  const { currentUser, billing, notifications } = state;
  const unreadCount = notifications.filter(n => !n.isRead && n.userId === currentUser.id).length;

  // Format workspace display depending on role dashboard context
  const getRoleDesignation = () => {
    switch(currentUser.role) {
      case 'Admin':
        return {
          title: 'Admin Command Suite',
          badgeStyle: 'bg-purple-100 text-purple-800 border-purple-200',
          containerStyle: 'border-t-4 border-purple-600',
          icon: <Shield className="w-4 h-4 text-purple-600" />,
          desc: 'Full administrative orchestration privileges, database resets, billing controls, and real-time live activity monitoring.'
        };
      case 'Member':
        return {
          title: 'Project Collaborator Workspace',
          badgeStyle: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          containerStyle: 'border-t-4 border-indigo-600',
          icon: <Briefcase className="w-4 h-4 text-indigo-600" />,
          desc: 'Active board workflow. Write, CRUD, and manage tasks and boards freely within allocated capacity thresholds.'
        };
      case 'Viewer':
      default:
        return {
          title: 'Secure Observer Platform',
          badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-250',
          containerStyle: 'border-t-4 border-emerald-500',
          icon: <Eye className="w-4 h-4 text-emerald-600" />,
          desc: 'Read-only corporate compliance session. Inspect task items, browse boards, and execute rich AI document queries.'
        };
    }
  };

  const roleMeta = getRoleDesignation();

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500 selection:text-white ${roleMeta.containerStyle}`} id="applet-viewport">
      
      {/* Dynamic Network / State Alerts */}
      {error && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 text-center font-semibold font-mono flex items-center justify-center gap-2 relative z-50">
          <ShieldAlert className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Main SaaS App Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-950" id="saas-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Branding launcher */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-sm tracking-tight block">SaaS Kanban Flow</span>
                <span className="text-[9px] font-mono text-indigo-400 font-bold block">ENTERPRISE CLOUD</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => setActiveTab('boards')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'boards' ? 'bg-slate-800 text-white shadow-inner font-bold' : 'text-slate-350 hover:bg-slate-850 hover:text-white'}`}
              >
                <Layers className="w-4 h-4" />
                <span>Boards Dashboard</span>
              </button>
              <button 
                onClick={() => setActiveTab('rag')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'rag' ? 'bg-slate-800 text-white shadow-inner font-bold' : 'text-slate-350 hover:bg-slate-850 hover:text-white'}`}
              >
                <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span>AI RAG Copilot</span>
              </button>
              <button 
                onClick={() => setActiveTab('wiki')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'wiki' ? 'bg-slate-800 text-white shadow-inner font-bold' : 'text-slate-350 hover:bg-slate-850 hover:text-white'}`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Wiki Knowledge Hub</span>
              </button>
              <button 
                onClick={() => setActiveTab('billing')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === 'billing' ? 'bg-slate-800 text-white shadow-inner font-bold' : 'text-slate-350 hover:bg-slate-850 hover:text-white'}`}
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Plans & Limits</span>
              </button>
            </nav>

            {/* Right Interactive Panels */}
            <div className="flex items-center gap-3">
              
              {/* Sync Loader status */}
              {syncing && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin mr-1 hidden sm:block" />}

              {/* Live Notifications bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl relative transition cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-slate-900 animate-bounce" />
                  )}
                </button>
                
                {/* Expandable Notification center */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2.5 w-80 bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 py-2.5"
                    >
                      <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Workspace Alerts</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleClearAllNotifications}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-105 text-xs text-left">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-slate-400 italic text-center text-xs">No active notifications.</p>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={`p-3 hover:bg-slate-50 transition ${!n.isRead ? 'bg-indigo-50/20' : ''}`}>
                              <p className="text-slate-700 leading-normal">{n.text}</p>
                              <p className="text-[9px] font-mono text-slate-400 mt-1.5">{new Date(n.createdAt).toLocaleTimeString()}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* In-Session User Display Block */}
              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                <img 
                  src={currentUser.avatarUrl} 
                  alt="" 
                  className="w-8 h-8 rounded-full ring-2 ring-indigo-500/45 shrink-0 hidden sm:block pointer-events-none" 
                />
                <div className="text-left leading-none hidden sm:block">
                  <span className="text-xs font-semibold block">{currentUser.name}</span>
                  <span className="text-[8px] font-semibold tracking-wider font-mono text-indigo-400 block mt-0.5 mt-1">{currentUser.email}</span>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  title="Logout Session"
                  className="p-2 ml-1 text-slate-400 hover:text-red-400 hover:bg-slate-850 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Menu layout toggle */}
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

            </div>

          </div>
        </div>

        {/* Mobile menu rails */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-slate-900 border-t border-slate-800 py-3 px-4 space-y-2 overflow-hidden"
            >
              <button 
                onClick={() => { setActiveTab('boards'); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold block ${activeTab === 'boards' ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
              >
                Boards Dashboard
              </button>
              <button 
                onClick={() => { setActiveTab('rag'); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold block ${activeTab === 'rag' ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
              >
                AI RAG Copilot
              </button>
              <button 
                onClick={() => { setActiveTab('wiki'); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold block ${activeTab === 'wiki' ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
              >
                Wiki Knowledge Hub
              </button>
              <button 
                onClick={() => { setActiveTab('billing'); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold block ${activeTab === 'billing' ? 'bg-slate-800 text-white' : 'text-slate-305'}`}
              >
                Plans & Limits
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col justify-start" id="workspace-main">
        
        {/* Dynamic header summary indicating sandbox triggers */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-3xl mb-8 shadow-xs flex flex-col md:flex-row gap-5 items-start justify-between relative overflow-hidden">
          {/* Ambient visual strip representing current role */}
          <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
            currentUser.role === 'Admin' ? 'bg-purple-600' : currentUser.role === 'Viewer' ? 'bg-emerald-500' : 'bg-indigo-600'
          }`} />

          <div className="flex items-start gap-4 ml-2">
            <div className={`p-3 rounded-2xl ${
              currentUser.role === 'Admin' ? 'bg-purple-50 text-purple-700' : currentUser.role === 'Viewer' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
            }`}>
              {roleMeta.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display font-bold text-slate-900 text-base sm:text-lg">
                  {roleMeta.title}
                </h1>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${roleMeta.badgeStyle}`}>
                  {currentUser.role}
                </span>
                <span className="text-[10.5px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {currentUser.email}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mt-1.5 max-w-3xl">
                {roleMeta.desc}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 font-mono text-[10.5px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 mr-2 md:self-center shrink-0">
            <Activity className="w-3.5 h-3.5 text-slate-450 animate-pulse" />
            <span className="text-slate-500 font-semibold uppercase">ACTIVE SESSION LATCHED</span>
          </div>
        </div>

        {/* Selected View rendering */}
        <div id="dynamic-tabs-view" className="flex-1 flex flex-col">
          {activeTab === 'boards' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Core Kanban View (span 9 or 12 depending on sidebar logs display of admins) */}
              <div className={currentUser.role === 'Admin' ? 'lg:col-span-9 space-y-4' : 'lg:col-span-12 space-y-4'}>
                
                {currentUser.role === 'Viewer' && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs leading-relaxed flex items-start gap-2.5 shadow-2xs">
                    <AlertTriangle className="w-4 h-4 text-amber-550 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Observer Mode (Read-Only)</strong>
                      <span>Board changes, task relocations, commentary adding, and column adjustments are disabled under this viewer session. Use the <strong>AI RAG Copilot</strong> tab to query documentation, tasks, and system policies.</span>
                    </div>
                  </div>
                )}

                <KanbanBoardView state={state} onRefreshState={syncState} />
              </div>

              {/* Administrative Sidebar Logs - Visible ONLY on Admin dashboard boards view! */}
              {currentUser.role === 'Admin' && (
                <div className="lg:col-span-3 bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-950 shadow-xl space-y-4 h-[650px] overflow-hidden flex flex-col justify-start">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-purple-200">System Logs</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-full font-bold">LIVE STREAM</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3.5 divide-y divide-slate-800/60 pr-1 text-left scrollbar-thin">
                    {state.logs.map((l, idx) => (
                      <div key={l.id || idx} className="text-[11px] pt-3.5 select-none leading-relaxed">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-purple-300 font-mono text-[9px] uppercase tracking-wide bg-purple-950 px-1.5 py-0.5 rounded">
                            {l.action}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">{new Date(l.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-350 mt-1.5 font-sans leading-normal">
                          {l.details}
                        </p>
                        <p className="text-[9px] font-mono text-slate-500 mt-1 italic">
                          By: {l.userName} (ID: {l.userId})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'rag' && (
            <RAGChat 
              onRefreshState={syncState} 
              plan={billing.currentPlan} 
              queriesCount={billing.usage.aiQueriesCount} 
            />
          )}

          {activeTab === 'wiki' && (
            <AdminWiki state={state} onRefreshState={syncState} />
          )}

          {activeTab === 'billing' && (
            <BillingHub billing={billing} onRefreshState={syncState} />
          )}
        </div>

      </main>

      {/* Premium Footer bar */}
      <footer className="bg-white border-t border-slate-200/60 py-5 mt-12 text-center text-slate-400 text-[11px] select-none" id="applet-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 SaaS Kanban Flow. Enterprise Multi-Tenant Relay Server online.</p>
          <div className="flex items-center gap-3 font-mono">
            <span className="text-emerald-500 font-bold">● NODE INSTANCE STABLE</span>
            <span>|</span>
            <span>PORT 3000 PROXY ACTIVE</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
