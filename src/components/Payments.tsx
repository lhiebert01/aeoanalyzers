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
      '50 analyses per month',
      'Full detailed breakdown',
      'Optimization roadmap',
      'Historical score tracking',
      'PDF report exports'
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
      '500 analyses per month',
      'Competitor benchmarking',
      'API access for CI/CD',
      'Priority AI processing',
      'Team collaboration tools'
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
          <div className="relative bg-zinc-900 text-white rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
            <div className="flex items-start gap-5">
              <div className="bg-white/10 p-4 rounded-2xl shrink-0">
                <Zap className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold">Day Pass</h3>
                  <span className="text-[10px] font-bold bg-amber-300 text-zinc-900 px-2 py-0.5 rounded-full uppercase tracking-widest">One-time</span>
                </div>
                <p className="text-zinc-300 text-sm max-w-md leading-relaxed">
                  Just need to fix one site? Unlock <strong className="text-white">every fix and download for 24 hours</strong> — the
                  full implementation roadmap, paste-ready JSON-LD, content rewrites, and the Word report. No subscription.
                </p>
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

      <div className="mt-16 p-8 bg-zinc-50 border border-zinc-200 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
            <ShieldCheck className="w-8 h-8 text-zinc-900" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Enterprise Custom</h4>
            <p className="text-zinc-500 text-sm">Need unlimited analyses or custom AI fine-tuning?</p>
          </div>
        </div>
        <button className="px-8 py-3 bg-white border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-all">
          Contact Sales
        </button>
      </div>
    </div>
  );
}
