/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { fetchAppState, clearNotifications, AppState } from './api';
import KanbanBoardView from './components/KanbanBoardView';
import RAGChat from './components/RAGChat';
import AdminWiki from './components/AdminWiki';
import BillingHub from './components/BillingHub';
import { 
  Layers, Sparkles, CreditCard, Settings, Bell, RefreshCw, LogIn, CheckSquare, 
  HelpCircle, UserCheck, CheckCircle, Info, Menu, X, ShieldAlert 
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

  // Load backend state on mount
  const syncState = async (updated?: AppState) => {
    if (updated) {
      setState(updated);
      return;
    }
    setSyncing(true);
    try {
      const res = await fetchAppState();
      setState(res);
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
          setState(data.state);
          setError(null);
        }
      } catch (err) {
        console.error('SSE JSON parsing exception:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('Live sync stream interrupted, fallback polling activated:', err);
      if (!fallbackInterval) {
        fallbackInterval = setInterval(() => {
          syncState();
        }, 4500);
      }
    };

    return () => {
      eventSource.close();
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, []);

  const handleClearNotifications = async () => {
    try {
      const res = await clearNotifications();
      setState(res.state);
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin flex-shrink-0" />
          <h1 className="font-display font-semibold text-slate-800 text-lg">Reassembling SaaS Kanban Container...</h1>
          <p className="text-xs text-slate-500">Checking micro-indexes & Stripe sandbox webhooks</p>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-rose-100 rounded-2xl p-6 text-center space-y-4 shadow-lg">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-pulse flex-shrink-0" />
          <h2 className="font-display font-semibold text-slate-900 text-lg">Server Connection Interrupted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{error || "Could not retrieve tenant state indexes."}</p>
          <button 
            onClick={() => syncState()} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 rounded-xl transition"
          >
            Re-engage Connection
          </button>
        </div>
      </div>
    );
  }

  const { currentUser, billing, notifications } = state;
  const unreadNotifications = notifications.filter(n => n.userId === currentUser.id && !n.isRead);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between font-sans antialiased text-slate-800" id="main-saas-layout">
      {/* Top Banner Navigation bar */}
      <header className="bg-slate-950 text-white border-b border-slate-900 sticky top-0 z-40" id="global-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-xl">
              <CheckSquare className="w-5 h-5 text-white flex-shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-bold tracking-tight text-base sm:text-lg">SaaS Kanban Flow</h1>
                <span className="text-[10px] font-mono tracking-widest uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                  v1.2
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-400">Multi-Tenant Scrum Boards + Structured RAG AI assistant</p>
            </div>
          </div>

          {/* Center tabs switches */}
          <nav className="flex items-center gap-1 sm:gap-2 bg-slate-900 border border-slate-850 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('boards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'boards' 
                  ? 'bg-slate-805 text-white border border-slate-700/60 shadow' 
                  : 'text-slate-400 hover:text-slate-205'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Kanban Board</span>
            </button>

            <button
              onClick={() => setActiveTab('rag')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'rag' 
                  ? 'bg-slate-805 text-white border border-slate-700/60 shadow' 
                  : 'text-slate-400 hover:text-slate-205'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> <span className="hidden sm:inline">RAG Copilot</span>
            </button>

            <button
              onClick={() => setActiveTab('wiki')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'wiki' 
                  ? 'bg-slate-805 text-white border border-slate-700/60 shadow' 
                  : 'text-slate-400 hover:text-slate-205'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Admin & SOPs</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'billing' 
                  ? 'bg-slate-805 text-white border border-slate-700/60 shadow' 
                  : 'text-slate-400 hover:text-slate-250'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Stripe Billing</span>
            </button>
          </nav>

          {/* User profile toggle and notifications bell */}
          <div className="flex items-center gap-3">
            {/* Syncing status */}
            <span className={`p-1 text-slate-400 ${syncing ? 'animate-spin' : ''}`} title="Instant syncing active">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>

            {/* Notifications Alert Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  unreadNotifications.length > 0 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
                    : 'bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Bell className="w-4 h-4 flex-shrink-0" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-[9px] text-white font-bold px-1 py-0.2 rounded-full ring-2 ring-slate-950">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Quick Notifications Drawer */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 text-slate-800 rounded-xl p-4 shadow-xl z-50 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold font-display text-slate-900 flex items-center gap-1">
                        Workspace Notifications
                      </span>
                      {unreadNotifications.length > 0 && (
                        <button
                          onClick={handleClearNotifications}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto">
                      {notifications.filter(n => n.userId === currentUser.id).length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-2.5 italic">
                          No alerts received inside tenant.
                        </p>
                      ) : (
                        notifications
                          .filter(n => n.userId === currentUser.id)
                          .map(nt => (
                            <div 
                              key={nt.id} 
                              className={`p-2.5 rounded-lg border text-[11px] leading-relaxed relative ${
                                nt.isRead 
                                  ? 'bg-slate-50 border-slate-100 text-slate-500' 
                                  : 'bg-indigo-50/40 border-indigo-100 text-slate-850 font-medium'
                              }`}
                            >
                              {nt.text}
                              <span className="block text-[8px] text-slate-400 mt-1 font-mono">
                                {new Date(nt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
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
                className="w-8 h-8 rounded-full ring-2 ring-indigo-500/45 shrink-0 hidden sm:block" 
              />
              <div className="text-left leading-none">
                <span className="text-xs font-semibold block">{currentUser.name}</span>
                <span className="text-[9px] uppercase tracking-wider font-mono text-indigo-400 font-bold block mt-0.5">{currentUser.role}</span>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full" id="workspace-main">
        
        {/* Dynamic header summary indicating sandbox triggers */}
        <div className="bg-white border border-slate-200/60 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
              <UserCheck className="w-5 h-5 flex-shrink-0" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">
                You are operating as {currentUser.name} ({currentUser.role} Context)
              </p>
              <p className="text-[11px] text-slate-500">
                Data persistence is locked under Sandbox Tenant. Real-time REST indexing is active.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Test other RBAC context permissions?</span>
            <button
              onClick={() => {
                setActiveTab('wiki');
                setTimeout(() => {
                  document.getElementById('rbac-role-simulation')?.scrollIntoView({ behavior: 'smooth' });
                }, 200);
              }}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-all font-semibold font-mono"
            >
              SWITCH PROFILE →
            </button>
          </div>
        </div>

        {/* Selected View rendering */}
        <div id="dynamic-tabs-view">
          {activeTab === 'boards' && (
            <KanbanBoardView state={state} onRefreshState={syncState} />
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
      <footer className="bg-white border-t border-slate-200 p-6 text-center text-xs text-slate-500 font-sans mt-12 w-full" id="saas-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-left">
            <p className="font-semibold text-slate-750">SaaS Scrum Kanban Suite © 2026</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Anchored for Gemini 3.5 text modeling retrieval operations.</p>
          </div>
          <div className="text-right font-mono text-[10px] text-slate-400 space-y-1">
            <p>Stripe sandbox status: <span className="text-indigo-600 font-bold">MONITOR_SYNCHRONIZED (Active)</span></p>
            <p>RAG Search indexes: <span className="text-emerald-600 font-bold">100% PARSED</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
