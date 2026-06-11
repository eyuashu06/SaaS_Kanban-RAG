/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { askAiAssistant } from '../../services/api';
import { ChatMessage } from '../../lib/types';
import { Sparkles, Send, ShieldAlert, BadgeInfo, HelpCircle, Loader } from 'lucide-react';
import { motion } from 'motion/react';

interface RAGChatProps {
  onRefreshState: () => void;
  plan: string;
  queriesCount: number;
}

export default function RAGChat({ onRefreshState, plan, queriesCount }: RAGChatProps) {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: "Hello! I am your Kanban RAG AI Assistant. I can help you run deep analysis on task logs, board columns, team workloads, due dates, billing levels, and wiki policies. If you ask about external topics, I will happily guide you through the features and structure of our SaaS application!",
      createdAt: new Date().toISOString()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    // Check plan limits first if plan is Free
    if (plan === 'Free' && queriesCount >= 3) {
      setError("AI limits reached: You have exhausted all 3 AI queries allocated to your Free plan. Upgrade subscription to Pro or Enterprise to chat with assistant!");
      return;
    }

    setError(null);
    const userMessage: ChatMessage = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const data = await askAiAssistant(textToSend);
      const assistantMessage: ChatMessage = {
        id: 'ai_' + Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: data.text,
        sources: data.sources || [],
        createdAt: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, assistantMessage]);
      onRefreshState(); // refresh for queries counts
    } catch (err: any) {
      setError(err.message || 'Failed to chat with AI');
    } finally {
      setLoading(false);
    }
  };

  const PROMPT_CHIPS = [
    { title: '⚠️ Overdue Tasks', query: 'What tasks are overdue?' },
    { title: '📊 Project Progress', query: 'Show project progress statistics.' },
    { title: '⚡ Workload Inspection', query: 'Who is overloaded?' },
    { title: '📄 Wiki SOP Policies', query: 'What is the billing plan limit policy on the free tier?' },
    { title: '🔒 Outside Query (Strict test)', query: 'Who is the Prime Minister of the United Kingdom?' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[650px] overflow-hidden shadow-2xl" id="rag-chat-hub">
      {/* Header bar */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl text-slate-950">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-slate-100 text-base">RAG AI Kanban Assistant</h2>
              <span className="text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/20">
                STRICT RAG RULES
              </span>
            </div>
            <p className="text-xs text-slate-400">Context: Active Boards + Comments + Activity Logs + SOP Documents</p>
          </div>
        </div>
        <div className="text-right font-mono text-xs text-slate-500">
          Plan Usage: <span className="text-slate-300 font-semibold">{plan === 'Enterprise' ? '∞' : `${queriesCount}/${plan === 'Free' ? '3' : '50'}`}</span> queries
        </div>
      </div>

      {/* Constraints Warning Alert */}
      <div className="bg-emerald-950/20 border-b border-emerald-900/40 px-4 py-2 flex items-start gap-2.5 text-xs text-emerald-400/90">
        <ShieldAlert className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Helpful Platform Context:</strong> I prioritize active Boards, Wiki Docs, and Logs. If you ask about external topics, I will politely present our platform's core highlights, features, and capabilities to keep you on track.
        </div>
      </div>

      {/* Chat Messages flow */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 bg-slate-950/40">
        {chatHistory.map((msg, idx) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-slate-500">
                {msg.sender === 'user' ? 'YOU' : 'AI CO-PILOT'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-tr-none' 
                : 'bg-slate-800 border border-slate-705 text-slate-100 rounded-tl-none font-sans'
            }`}>
              <div className="whitespace-pre-line prose prose-invert max-w-none">
                {msg.text}
              </div>

              {/* Retrieved Sources metadata display */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase flex items-center gap-1.5 align-middle">
                    <BadgeInfo className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 inline" />
                    Knowledge Sources Retrieved:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((src, sIdx) => (
                      <span key={sIdx} className="text-[9px] font-mono bg-slate-900 border border-slate-700 text-teal-400 px-2 py-0.5 rounded-md">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-slate-400 text-xs p-3 bg-slate-900 border border-slate-800 rounded-xl w-72 animate-pulse">
            <Loader className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0 inline" />
            <span>Scanning indexes + fetching AI reply...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-955/30 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Operation Rejected</p>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="bg-slate-950 p-3 pt-1 border-t border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none w-full">
        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> Suggested Queries:
        </span>
        {PROMPT_CHIPS.map((chip, cIdx) => (
          <button
            key={cIdx}
            onClick={() => handleSend(chip.query)}
            disabled={loading}
            className="text-[11px] bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-full cursor-pointer flex-shrink-0 transition-all font-sans antialiased active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chip.title}
          </button>
        ))}
      </div>

      {/* Footer message editor input */}
      <div className="bg-slate-950 p-4 border-t border-slate-850">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(query);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            placeholder="Ask about overdue tasks, workload imbalances, or wiki policy guidelines..."
            className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-755 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 rounded-xl transition-all cursor-pointer font-semibold flex items-center justify-center min-w-12 active:scale-95"
          >
            <Send className="w-4 h-4 flex-shrink-0" />
          </button>
        </form>
        <p className="text-[10px] text-slate-600 text-center mt-2.5 font-sans">
          The co-pilot evaluates timestamps relative to June 5, 2026. Hallucinations are physically blocked by prompt boundaries.
        </p>
      </div>
    </div>
  );
}
