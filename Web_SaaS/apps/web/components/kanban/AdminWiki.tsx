/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState } from '../../lib/types';
import { switchUser, createDocument, deleteDocument, inviteTeamUser } from '../../services/api';
import { 
  Users, Badge, FileText, Plus, ShieldCheck, UserCheck, 
  Trash2, HelpCircle, BookOpen, Clock, Play, Eye, Edit2, UserPlus, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { motion } from 'motion/react';

interface AdminWikiProps {
  state: AppState;
  onRefreshState: (updatedState?: AppState) => void;
}

export default function AdminWiki({ state, onRefreshState }: AdminWikiProps) {
  const { users, currentUser, docs, logs } = state;

  // Swapping session status
  const [swappingId, setSwappingId] = useState<string | null>(null);

  // New SOP form states
  const [showNewDocForm, setShowNewDocForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab state for live Markdown preview toggle
  const [writeTab, setWriteTab] = useState<'edit' | 'preview'>('edit');

  // User invitation states
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Member' | 'Viewer'>('Member');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleSwitchUser = async (userId: string) => {
    if (userId === currentUser.id) return;
    setSwappingId(userId);
    try {
      const res = await switchUser(userId);
      onRefreshState(); // reload full state context to update current user header displays
    } catch (err: any) {
      alert(err.message || 'Failed to switch session user');
    } finally {
      setSwappingId(null);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'Admin') {
      setInviteError('RBAC Access Denied: Only Admins can invite new team members.');
      return;
    }
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError('Name and Email are strictly required fields.');
      return;
    }

    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await inviteTeamUser(inviteName, inviteEmail, inviteRole);
      onRefreshState(res.state);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('Member');
      setInviteSuccess(`Teammate "${inviteName}" successfully invited as ${inviteRole}!`);
      setTimeout(() => setInviteSuccess(null), 5000);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to complete tenant invitation.');
    }
  };

  const handlePublishDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setErrorMsg('Both document title and content are required.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await createDocument(newTitle, newContent);
      onRefreshState(res.state);
      setNewTitle('');
      setNewContent('');
      setWriteTab('edit');
      setShowNewDocForm(false);
      setSuccessMsg(`SOP "${res.doc.title}" successfully published to index database. RAG AI context has rebuilt.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authorization error: Failed to publish.');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (confirm('Delete this SOP catalog? It will be completely removed from the RAG AI search index.')) {
      try {
        const res = await deleteDocument(docId);
        onRefreshState(res.state);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // High-fidelity local markdown parsing engine
  const renderMarkdownLive = (markdownText: string) => {
    if (!markdownText.trim()) {
      return <p className="text-xs text-slate-400 italic">No content written yet. Start typing to see formatted outcomes.</p>;
    }
    const lines = markdownText.split('\n');
    return (
      <div className="space-y-2 text-slate-750 text-xs leading-relaxed max-h-60 overflow-y-auto bg-white border border-slate-205 p-4 rounded-xl font-sans text-left w-full">
        {lines.map((line, lineIndex) => {
          if (line.startsWith('### ')) {
            return <h3 key={lineIndex} className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 mt-3 mb-1 font-display uppercase tracking-wider">{line.slice(4)}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={lineIndex} className="text-sm font-extrabold text-slate-900 border-b border-slate-200/50 pb-1 mt-4 mb-1.5">{line.slice(3)}</h2>;
          }
          if (line.startsWith('# ')) {
            return <h1 key={lineIndex} className="text-base font-black text-slate-950 mt-4 mb-2">{line.slice(2)}</h1>;
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return <li key={lineIndex} className="list-disc pl-3 ml-2 text-slate-600 font-normal">{line.slice(2)}</li>;
          }
          
          // Regex-like bold format replacer **word**
          const words = line.split('**');
          const inlineFormatted = words.map((chunk, itemIdx) => {
            if (itemIdx % 2 === 1) {
              return <strong key={itemIdx} className="font-bold text-indigo-950 bg-indigo-55/40 px-0.5 rounded">{chunk}</strong>;
            }
            return chunk;
          });

          return <p key={lineIndex} className="min-h-[1.1em]">{inlineFormatted}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="admin-wiki-container">
      {/* Sessions / Role simulation panel (RBAC) */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm" id="rbac-role-simulation">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <h3 className="font-display font-semibold text-slate-900 text-sm">RBAC Session Switcher</h3>
        </div>
        <p className="text-xs text-slate-550 font-sans leading-relaxed">
          SaaS Multi-Tenancy enforces strict Role-Based Access Control (RBAC). Swap context below to live-test permissions block warnings across the kanban board:
        </p>

        <div className="space-y-3 pt-2">
          {users.map(u => {
            const isActive = u.id === currentUser.id;
            return (
              <div 
                key={u.id}
                onClick={() => !isActive && handleSwitchUser(u.id)}
                className={`p-3.5 border rounded-xl flex items-center justify-between transition-all select-none ${
                  isActive 
                    ? 'border-indigo-600 bg-indigo-50/45 text-slate-900 font-semibold shadow-slate-100 shadow' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer text-slate-705'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full ring-2 ring-white shadow-xs" />
                  <div>
                    <h4 className="text-xs font-semibold leading-tight">{u.name}</h4>
                    <span className="text-[10px] text-slate-500 block font-sans">{u.email}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[9px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded-full ${
                    u.role === 'Admin' ? 'bg-indigo-600 text-white' :
                    u.role === 'Member' ? 'bg-slate-200 text-slate-700' :
                    'bg-amber-100 text-amber-805'
                  }`}>
                    {u.role}
                  </span>
                  {isActive && (
                    <span className="text-[9px] text-indigo-600 font-bold block mt-1 uppercase font-mono tracking-widest text-center">ACTIVE</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed font-sans mt-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <strong>RBAC matrix details:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li><strong>Admins:</strong> Manage boards/columns, publish Wiki SOP docs, write comments, create tasks.</li>
              <li><strong>Members:</strong> Create tasks, write comments, relocate columns. Cannot delete columns or boards.</li>
              <li><strong>Viewers:</strong> Read-only. Access restricted on all modification requests.</li>
            </ul>
          </div>
        </div>

        {/* Dynamic User Recruiter Box */}
        <div className="border border-slate-205 bg-white p-4 rounded-xl space-y-3.5 mt-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4.5 h-4.5 text-indigo-650 shrink-0" />
            <h4 className="font-display font-semibold text-slate-800 text-xs">Invite Team Member</h4>
          </div>

          {inviteSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-[10.5px] font-sans">
              {inviteSuccess}
            </div>
          )}

          {inviteError && (
            <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-[10.5px] font-sans">
              {inviteError}
            </div>
          )}

          <form onSubmit={handleInviteUser} className="space-y-2.5 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Charlie Brown"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:bg-white outline-none font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                required
                placeholder="charlie@acme.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:bg-white outline-none font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Assigned Privilege Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-205 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-indigo-500 focus:bg-white"
              >
                <option value="Admin">Admin (Full Control)</option>
                <option value="Member">Member (Standard Workspace Access)</option>
                <option value="Viewer">Viewer (Read-Only Observer)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={currentUser.role !== 'Admin'}
              className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-[11px] transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Dispatch Workspace Invite
            </button>
          </form>
        </div>
      </div>

      {/* Docs / Knowledge base panel (Wiki SOP) & Log list */}
      <div className="lg:col-span-2 space-y-6">
        {/* Wiki RAG searchable list */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm" id="wiki-sop-index">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <h3 className="font-display font-semibold text-slate-900 text-sm">Wiki Project SOP Guidelines (AI RAG Repository)</h3>
            </div>
            <button
              onClick={() => {
                if (currentUser.role !== 'Admin') {
                  alert('RBAC Access Denied: Only Admins can publish SOP documents.');
                  return;
                }
                setShowNewDocForm(!showNewDocForm);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" /> Publish Guide
            </button>
          </div>

          <p className="text-xs text-slate-550 font-sans">
            Documents added here are immediately parsed, indexed, and embedded into the <strong>RAG AI prompt context space</strong>. This makes them searchable instantly via the RAG Copilot!
          </p>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-medium">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* New article publisher form */}
          {showNewDocForm && (
            <motion.form 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handlePublishDoc} 
              className="p-4 bg-slate-100 border border-slate-200 rounded-xl space-y-3 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold text-slate-700">Publish SOP Documentation Card</h4>
                
                {/* Visual state tab controls */}
                <div className="flex gap-1 border border-slate-250 p-0.5 rounded-lg bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setWriteTab('edit')}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded font-bold transition-all ${writeTab === 'edit' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-705'}`}
                  >
                    <Edit2 className="w-3 h-3" /> Edit Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setWriteTab('preview')}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded font-bold transition-all ${writeTab === 'preview' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-705'}`}
                  >
                    <Eye className="w-3 h-3" /> Live Preview
                  </button>
                </div>
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <input
                  type="text"
                  required
                  placeholder="Doc title (e.g. Acme Billing and Cancellation policies)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-800 font-bold"
                />
              </div>

              {/* Edit vs Live Markdown rendered view panels */}
              {writeTab === 'edit' ? (
                <div className="space-y-1">
                  <textarea
                    required
                    placeholder="SOP guidelines context. Format using standards like:\n# Big Header\n### Small Header\n**Bold statement**\n- Bullet points\n\nKeep parameters explicit so RAG AI captures accurate summaries."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-800 h-32 resize-none font-sans"
                  />
                </div>
              ) : (
                <div className="min-h-32 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-1 w-full">
                  {renderMarkdownLive(newContent)}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewDocForm(false);
                    setWriteTab('edit');
                  }}
                  className="text-xs border border-slate-200 px-3.5 py-1.5 rounded-lg bg-white text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Publish indexed card
                </button>
              </div>
            </motion.form>
          )}

          {/* List of Docs index cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            {docs.map(doc => (
              <div key={doc.id} className="border border-slate-200/80 rounded-xl p-4 space-y-2.5 bg-slate-50/50 hover:bg-slate-50 transition-all relative">
                {currentUser.role === 'Admin' && (
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-200/50 transition cursor-pointer"
                    title="Remove from AI search index"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5 text-indigo-500" />
                  <h4 className="text-xs font-bold text-slate-850 pr-5 line-clamp-1">{doc.title}</h4>
                </div>

                <div className="text-[11px] text-slate-600 leading-relaxed font-sans line-clamp-4 bg-white border border-slate-100 p-2.5 rounded-lg w-full">
                  {renderMarkdownLive(doc.content)}
                </div>

                <span className="text-[9px] font-mono text-indigo-505 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100/50 block w-max mt-1 font-bold">
                  Indexed active context
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit actions logs list */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm" id="audit-logs">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <h3 className="font-display font-semibold text-slate-900 text-sm">Security Audit Logs (RAG Ingestible Stream)</h3>
          </div>
          <p className="text-xs text-slate-550 font-sans">
            Every creation, transition, and billing change writes an immutable trace record, ensuring complete transparency:
          </p>
          <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1 text-slate-850">
            {logs.slice(0, 15).map(lg => (
              <div key={lg.id} className="text-[10px] font-mono flex items-start gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-lg leading-relaxed justify-between">
                <div>
                  <span className="text-slate-400">[{new Date(lg.createdAt).toLocaleTimeString()}]</span>{' '}
                  <span className="text-slate-500 uppercase font-bold text-[9px]">{lg.action}</span> -{' '}
                   <span className="text-slate-700">{lg.details}</span>
                </div>
                <div className="text-slate-400 text-right font-medium shrink-0">
                  by {lg.userName}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
