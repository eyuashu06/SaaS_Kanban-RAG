/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BillingState } from '../../lib/types';
import { upgradePlan } from '../../services/api';
import { 
  CreditCard, Check, ShieldCheck, Activity, Award, Zap, HelpCircle, AlertCircle, Loader2, X 
} from 'lucide-react';
import { motion } from 'motion/react';

interface BillingHubProps {
  billing: BillingState;
  onRefreshState: () => void;
}

export default function BillingHub({ billing, onRefreshState }: BillingHubProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'Free' | 'Pro' | 'Enterprise' | null>(null);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  
  // Custom Card Input states inside Stripe checkout
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('321');
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activePlan = billing.currentPlan;
  const usage = billing.usage;

  // Render limits percentage indicators
  const getLimitsMaxClass = (cur: number, max: number) => {
    const pct = (cur / max) * 100;
    if (pct >= 100) return 'bg-rose-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-indigo-600';
  };

  const PRO_LIMITS = { boards: 5, tasks: 50, queries: 50 };
  const FREE_LIMITS = { boards: 1, tasks: 5, queries: 3 };

  const triggerCheckout = (plan: 'Free' | 'Pro' | 'Enterprise') => {
    if (plan === activePlan) return;
    setSelectedPlan(plan);
    setShowStripeCheckout(true);
  };

  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    
    setLoading(true);
    setSuccessMsg(null);

    // Simulate Stripe payment gateway latency & Webhook synchronization
    setTimeout(async () => {
      try {
        await upgradePlan(selectedPlan);
        setSuccessMsg(`Stripe payment succeeded! Plan swapped to ${selectedPlan}. Webhooks synchronized.`);
        onRefreshState();
        setTimeout(() => {
          setShowStripeCheckout(false);
          setSuccessMsg(null);
          setSelectedPlan(null);
        }, 1500);
      } catch (err: any) {
        alert(err.message || 'Upgrade operation failed');
      } finally {
        setLoading(false);
      }
    }, 1800);
  };

  return (
    <div className="space-y-6" id="billing-hub-view">
      {/* Stripe metadata details */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <CreditCard className="w-6 h-6 flex-shrink-0" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base text-slate-100 flex items-center gap-2">
              SaaS Billing Status
              <span className="text-[10px] uppercase font-mono tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                Stripe Production Mode
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              CustomerId: <code className="font-mono text-indigo-300">{billing.stripeCustomerId || 'Unset'}</code> • SubscriptionId: <code className="font-mono text-indigo-300">{billing.stripeSubscriptionId || 'None'}</code>
            </p>
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400 block font-sans">Current Premium level:</span>
          <span className="font-display font-bold text-2xl text-indigo-400 uppercase tracking-tight flex items-center gap-1.5 mt-0.5 animate-pulse">
            {activePlan} Tier
            <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 inline" />
          </span>
        </div>
      </div>

      {/* Plan Limits meters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h3 className="font-display font-semibold text-slate-900 text-sm">Active Plan Limits Utilization Tracker</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Boards Meter */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Boards Created</span>
              <span className="text-slate-800 font-bold">
                {usage.boardsCount} / {activePlan === 'Free' ? '1' : activePlan === 'Pro' ? '5' : 'Unlimited'}
              </span>
            </div>
            {activePlan !== 'Enterprise' ? (
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${getLimitsMaxClass(usage.boardsCount, activePlan === 'Free' ? 1 : 5)}`}
                  style={{ width: `${Math.min(100, (usage.boardsCount / (activePlan === 'Free' ? 1 : 5)) * 105)}%` }}
                />
              </div>
            ) : (
              <p className="text-[11px] font-mono font-bold text-emerald-600">UNLIMITED CAPACITY ACTIVE</p>
            )}
            <span className="text-[10px] text-slate-400 block">Restricts board creation on the backend models context.</span>
          </div>

          {/* Tasks Meter */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Tasks Cards Count</span>
              <span className="text-slate-800 font-bold">
                {usage.tasksCount} / {activePlan === 'Free' ? '5' : activePlan === 'Pro' ? '50' : 'Unlimited'}
              </span>
            </div>
            {activePlan !== 'Enterprise' ? (
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${getLimitsMaxClass(usage.tasksCount, activePlan === 'Free' ? 5 : 50)}`}
                  style={{ width: `${Math.min(100, (usage.tasksCount / (activePlan === 'Free' ? 5 : 50)) * 105)}%` }}
                />
              </div>
            ) : (
              <p className="text-[11px] font-mono font-bold text-emerald-600">UNLIMITED CAPACITY ACTIVE</p>
            )}
            <span className="text-[10px] text-slate-400 block">Total tasks permitted inside multi-tenant database.</span>
          </div>

          {/* AI Queries Meter */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">RAG AI Assistant queries</span>
              <span className="text-slate-800 font-bold">
                {usage.aiQueriesCount} / {activePlan === 'Free' ? '3' : activePlan === 'Pro' ? '50' : 'Unlimited'}
              </span>
            </div>
            {activePlan !== 'Enterprise' ? (
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${getLimitsMaxClass(usage.aiQueriesCount, activePlan === 'Free' ? 3 : 50)}`}
                  style={{ width: `${Math.min(100, (usage.aiQueriesCount / (activePlan === 'Free' ? 3 : 50)) * 105)}%` }}
                />
              </div>
            ) : (
              <p className="text-[11px] font-mono font-bold text-emerald-600">UNLIMITED CAPACITY ACTIVE</p>
            )}
            <span className="text-[10px] text-slate-400 block">Secure prompt tokens quota search restrictions.</span>
          </div>
        </div>
      </div>

      {/* Pricing Matrix */}
      <h3 className="font-display font-bold text-slate-805 text-lg text-center mt-8">Available Subscriptions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FREE PLAN CARD */}
        <div className={`bg-white border text-sans rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between ${
          activePlan === 'Free' ? 'ring-2 ring-indigo-500/20 border-indigo-500 shadow-sm' : 'border-slate-200 hover:border-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Sandbox Eval</span>
              {activePlan === 'Free' && <span className="text-[10px] font-bold font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">CURRENT PLAN</span>}
            </div>
            <h4 className="font-display font-bold text-xl text-slate-800 mt-2">Free Starter</h4>
            <p className="text-xs text-slate-500 mt-1">Minimal evaluation framework context.</p>
            <div className="mt-4 flex items-baseline">
              <span className="text-2xl font-bold font-display text-slate-900">$0</span>
              <span className="text-xs text-slate-400 ml-1">/ forever</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 mt-6 pt-6 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" /> Max 1 Kanban Board
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" /> Max 3 Columns per board
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" /> Max 5 Task cards total
              </li>
              <li className="flex items-center gap-2 text-rose-500 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> Limited to 3 AI chatbot searches
              </li>
            </ul>
          </div>

          <button
            onClick={() => triggerCheckout('Free')}
            disabled={activePlan === 'Free'}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold text-center leading-tight transition-all cursor-pointer ${
              activePlan === 'Free' 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {activePlan === 'Free' ? 'Starter Engaged' : 'Downgrade to Starter'}
          </button>
        </div>

        {/* PRO PLAN CARD */}
        <div className={`bg-gradient-to-b from-indigo-50/20 to-white border text-sans rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between relative ${
          activePlan === 'Pro' ? 'ring-2 ring-indigo-500/50 border-indigo-600 shadow-lg' : 'border-slate-205 hover:border-slate-350'
        }`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-[9px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border border-indigo-400/20 shadow-md">
            RECOMMENDED FOR TEAMS
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-600 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-indigo-500" /> Professional
              </span>
              {activePlan === 'Pro' && <span className="text-[10px] font-bold font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">CURRENT PLAN</span>}
            </div>
            <h4 className="font-display font-bold text-xl text-slate-800 mt-2">Team Pro Scale</h4>
            <p className="text-xs text-slate-500 mt-1">Excellent for scaling workflows.</p>
            <div className="mt-4 flex items-baseline">
              <span className="text-2xl font-bold font-display text-slate-950">$29</span>
              <span className="text-xs text-slate-400 ml-1">/ month</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 mt-6 pt-6 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" /> Max 5 Kanban Boards
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" /> Max 10 Columns per board
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" /> Max 50 Task cards total
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" /> Up to 50 AI queries
              </li>
            </ul>
          </div>

          <button
            onClick={() => triggerCheckout('Pro')}
            disabled={activePlan === 'Pro'}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold text-center leading-tight transition-all cursor-pointer ${
              activePlan === 'Pro' 
                ? 'bg-indigo-50 text-indigo-400 cursor-not-allowed border border-indigo-205' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/10'
            }`}
          >
            {activePlan === 'Pro' ? 'Pro limits engaged' : 'Upgrade to Team Pro'}
          </button>
        </div>

        {/* ENTERPRISE PLAN CARD */}
        <div className={`bg-slate-950 text-sans text-slate-300 rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between ${
          activePlan === 'Enterprise' ? 'ring-2 ring-emerald-400/40 border-emerald-500' : 'border-slate-850 hover:border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-emerald-400" /> Unlimited High-Scale
              </span>
              {activePlan === 'Enterprise' && <span className="text-[10px] font-bold font-mono bg-emerald-505/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">CURRENT PLAN</span>}
            </div>
            <h4 className="font-display font-bold text-xl text-white mt-2">Executive</h4>
            <p className="text-xs text-slate-450 mt-1">Boundaries bypassed entirely.</p>
            <div className="mt-4 flex items-baseline">
              <span className="text-2xl font-bold font-display text-white">$149</span>
              <span className="text-xs text-slate-500 ml-1">/ month</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-400 mt-6 pt-6 border-t border-slate-900">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Infinite Kanban Boards
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Infinite Columns
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Unlimited Task capacity
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Unlimited AI copilot tasks & comments parsing
              </li>
            </ul>
          </div>

          <button
            onClick={() => triggerCheckout('Enterprise')}
            disabled={activePlan === 'Enterprise'}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold text-center leading-tight transition-all cursor-pointer ${
              activePlan === 'Enterprise' 
                ? 'bg-slate-905 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
            }`}
          >
            {activePlan === 'Enterprise' ? 'Executive Mode Active' : 'Acquire Executive'}
          </button>
        </div>
      </div>

      {/* Stripe Payment Checkout Simulator Modal */}
      {showStripeCheckout && selectedPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden max-w-md w-full shadow-2xl"
          >
            {/* Stripe branded header */}
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold text-sm antialiased uppercase tracking-wide">Stripe Secure Checkout</span>
              </div>
              <button 
                onClick={() => setShowStripeCheckout(false)} 
                className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill summary */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-400 block font-medium">UPGRADE VALUE:</span>
                <span className="font-semibold text-slate-800 uppercase text-sm">Kanban SaaS {selectedPlan} Plan</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">TOTAL DUE:</span>
                <span className="font-display font-bold text-base text-slate-950">
                  {selectedPlan === 'Free' ? '$0.00' : selectedPlan === 'Pro' ? '$29.00' : '$149.00'}
                </span>
              </div>
            </div>

            {/* Simulated Checkout Form */}
            <form onSubmit={handleStripePayment} className="p-5 space-y-4">
              {successMsg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl space-y-1 text-xs text-center">
                  <p className="font-semibold">{successMsg}</p>
                  <p className="text-slate-500">Stripe backend webhooks processed successfully!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1 font-sans text-xs">
                    <label className="text-slate-550 font-semibold block">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      defaultValue="eashenafi82@gmail.com" 
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="space-y-1 font-sans text-xs">
                    <label className="text-slate-550 font-semibold block">Card Details</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CreditCard className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input 
                        type="text" 
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242" 
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 font-sans text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-550 font-semibold block">Expiration Date</label>
                      <input 
                        type="text" 
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY" 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-550 font-semibold block">CVC Security Code</label>
                      <input 
                        type="text" 
                        required
                        maxLength={3}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="CVC" 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-150 font-mono text-center"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start p-3 bg-indigo-50/40 rounded-xl text-[10px] text-slate-500">
                    <ShieldCheck className="w-5 h-5 text-indigo-650 flex-shrink-0 mt-0.5" />
                    <span>Your payments credentials are simulated in Stripe Sandbox Mode. Click pay below to dispatch mock webhook payload events.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white flex-shrink-0" />
                        Awaiting Stripe Gateway...
                      </>
                    ) : (
                      `Transact ${selectedPlan === 'Free' ? '$0.00' : selectedPlan === 'Pro' ? '$29.00' : '$149.00'}`
                    )}
                  </button>
                </>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
