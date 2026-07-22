import React, { useState } from 'react';
import { Check, Zap, ShieldCheck, Cpu, ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';

const PLANS = [
  {
    id: 'pro',
    name: 'Pro Optimizer',
    price: '$49',
    period: '/mo',
    description: 'Perfect for freelance developers and small marketing teams.',
    features: [
      '8 Citation Sweeps / mo — all 4 AI engines, with transcripts',
      'Unlimited AEO analyses & fixes',
      'Answer-fidelity + competitor “cited instead” list',
      'Historical score & citation tracking',
      'DOCX / PDF report exports'
    ],
    buttonText: 'Upgrade to Pro',
    popular: true
  },
  {
    id: 'business',
    name: 'Business Authority',
    price: '$199',
    period: '/mo',
    description: 'For mid-sized agencies and growing SaaS companies.',
    features: [
      '20 Citation Sweeps / mo — all 4 AI engines, with transcripts',
      'Unlimited AEO analyses & fixes',
      'AI-crawler telemetry & drift monitoring',
      'Competitor benchmarking & authority-gap report',
      'Priority processing & team tools'
    ],
    buttonText: 'Upgrade to Business',
    popular: false
  }
];

interface PaymentsProps {
  user: any;
  userProfile?: any;
  onAuthRequired: () => void;
}

export default function Payments({ user, userProfile, onAuthRequired }: PaymentsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const { url, error } = await response.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: any) {
      console.error('Portal error:', err);
      alert(err.message || 'Failed to open billing portal.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    setLoading(planId);
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId, 
          userId: user.id,
          email: user.email
        }),
      });
      
      const { url, error } = await response.json();
      if (error) throw new Error(error);

      // Redirect to the checkout URL (mock or real)
      window.location.href = url;
    } catch (err) {
      console.error('Subscription error:', err);
      alert('Failed to initiate subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold tracking-tight mb-4">Choose your AEO Tier</h2>
        <p className="text-zinc-500 text-lg max-w-2xl mx-auto mb-8">
          Scale your Answer Engine Optimization with professional tools and higher analysis limits.
        </p>
        
        {(userProfile?.subscription_status === 'Pro' || userProfile?.subscription_status === 'Business') && (
          <button 
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-900 rounded-xl font-bold hover:bg-zinc-200 transition-all border border-zinc-200"
          >
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Manage My Subscription
          </button>
        )}
      </div>

      {/* One-time Day Pass — perfect for users with a single site who won't
          subscribe. Only shown once the one-time price is configured in env. */}
      {import.meta.env.VITE_STRIPE_PRICE_ID_REPORT && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="relative bg-zinc-900 text-white rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 overflow-hidden">
            <div className="flex items-start gap-5">
              <div className="bg-white/10 p-4 rounded-2xl shrink-0">
                <Zap className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold">Day Pass</h3>
                  <span className="text-[10px] font-bold bg-amber-300 text-zinc-900 px-2 py-0.5 rounded-full uppercase tracking-widest">One-time</span>
                </div>
                <p className="text-zinc-300 text-sm max-w-md leading-relaxed mb-4">
                  Just need to fix one site? Unlock <strong className="text-white">everything for 24 hours</strong> — no subscription.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    '3 Citation Sweeps (all 4 AI engines)',
                    'Full implementation roadmap',
                    'Paste-ready JSON-LD (verified)',
                    'Before/after content rewrites',
                    'Word (.docx) report + handoff',
                    'Unlimited analyses for 24 hours',
                  ].map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                      <Check className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$24</span>
                <span className="text-zinc-400 text-sm">/ 24h</span>
              </div>
              <button
                onClick={() => handleSubscribe('report')}
                disabled={loading !== null}
                className="bg-white text-zinc-900 px-8 py-3 rounded-xl font-bold hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading === 'report' ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Get Day Pass <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {PLANS.map((plan) => (
          <motion.div 
            key={plan.id}
            whileHover={{ y: -5 }}
            className={`relative bg-white border rounded-3xl p-8 flex flex-col shadow-sm transition-all ${plan.popular ? 'border-zinc-900 ring-4 ring-zinc-900/5' : 'border-zinc-200'}`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-zinc-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-zinc-500 font-medium">{plan.period}</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">
                {plan.description}
              </p>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 bg-emerald-50 p-0.5 rounded-full">
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                  <span className="text-zinc-600">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading !== null}
              className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${plan.popular ? 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/10' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'}`}
            >
              {loading === plan.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  {plan.buttonText}
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Entitlements & add-ons — make caps and extras explicit */}
      <div className="mt-16 max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold tracking-tight text-center mb-2">What's included — and what counts as a Sweep</h3>
        <p className="text-zinc-500 text-center mb-8 max-w-2xl mx-auto">The AEO diagnostic (score + fixes) is unlimited on every paid plan. <strong className="text-zinc-700">Citation Sweeps</strong> — the live multi-engine measurement — are the metered entitlement.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Included Citation Sweeps</div>
            <ul className="space-y-2 text-sm text-zinc-700">
              <li className="flex justify-between"><span>Free</span><span className="font-bold text-zinc-500">1 Quick Check (Google/Gemini)</span></li>
              <li className="flex justify-between"><span>Day Pass ($24)</span><span className="font-bold">3 full sweeps</span></li>
              <li className="flex justify-between"><span>Pro ($49/mo)</span><span className="font-bold">8 full sweeps / month</span></li>
              <li className="flex justify-between"><span>Business ($199/mo)</span><span className="font-bold">20 full sweeps / month</span></li>
            </ul>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">What one Sweep covers</div>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>One domain, all 4 engines (ChatGPT, Claude, Perplexity, Gemini)</span></li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>Up to 15 query-runs (e.g., 5 questions × 3 runs), with stored transcripts</span></li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>Same price for a 1-page site or a 100,000-page site — a sweep asks the engines, it doesn't crawl your pages</span></li>
            </ul>
          </div>
        </div>
        <p className="text-center text-zinc-400 text-sm mt-6">Need more sweeps than your plan includes? <strong className="text-zinc-600">Add-on sweep credits</strong> and higher-volume monitoring are available — <a href="#" onClick={(e) => e.preventDefault()} className="underline">contact us</a> or upgrade your plan.</p>
      </div>

      <div className="mt-12 p-8 bg-zinc-50 border border-zinc-200 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
            <ShieldCheck className="w-8 h-8 text-zinc-900" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Enterprise & Agencies</h4>
            <p className="text-zinc-500 text-sm">Need high-volume sweeps, more monitored domains, or white-label reports?</p>
          </div>
        </div>
        <button className="px-8 py-3 bg-white border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-all">
          Contact Sales
        </button>
      </div>
    </div>
  );
}
