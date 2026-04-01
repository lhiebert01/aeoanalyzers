import React, { useState, useEffect } from 'react';
import ImplementationRoadmap from './components/ImplementationRoadmap';
import { Search, ShieldCheck, Zap, BarChart3, AlertCircle, CheckCircle2, ArrowRight, Loader2, Globe, Cpu, Swords, Copy, Check, User as UserIcon, LogOut, History, CreditCard, LayoutDashboard, Settings, BookOpen, ShieldAlert, BarChart, Lock, Mail, FileText, Layout, ShoppingBag, Code, Info, ExternalLink, ChevronRight, ChevronDown, Share2, Linkedin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HelmetProvider } from 'react-helmet-async';
import { supabase, supabaseQuery, supabaseInsert, supabaseUpdate, setAccessToken } from './supabase';

interface AppUser {
  id: string;
  email: string;
}
import { analyzeWebsite, performCompetitiveDuel, type AnalysisResult, type CompetitiveResult } from './services/geminiService';
import Auth from './components/Auth';
import Payments from './components/Payments';
import AdminDashboard from './components/AdminDashboard';
import UserGuide from './components/UserGuide';
import MarketingLanding from './components/MarketingLanding';
import PressKit from './components/PressKit';
import SEO from './components/SEO';
import AdvancedAnalysisCards from './components/AdvancedAnalysisCards';
import { getOrganizationJsonLd, getWebSiteJsonLd, getBreadcrumbJsonLd } from './lib/json-ld';

type View = 'analyzer' | 'history' | 'payments' | 'settings' | 'auth' | 'admin' | 'guide' | 'landing' | 'privacy' | 'terms' | 'press';

// Simple GA4 Tracking Hook
const useGA4 = () => {
  const trackEvent = (eventName: string, params?: any) => {
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, params);
    }
    console.log(`[GA4] Event: ${eventName}`, params);
  };
  return { trackEvent };
};

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    try {
      const info = JSON.parse(error.message);
      return { hasError: true, errorInfo: info };
    } catch {
      return { hasError: true, errorInfo: { error: error.message } };
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-zinc-200 rounded-3xl p-8 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Security Access Error</h2>
            <p className="text-zinc-500 mb-6">
              {this.state.errorInfo?.error?.includes('insufficient permissions') 
                ? "Your account doesn't have the necessary permissions to access this data. This might be a temporary configuration issue."
                : "An unexpected error occurred while communicating with our database."}
            </p>
            
            {this.state.errorInfo && (
              <div className="bg-zinc-50 rounded-2xl p-4 text-left mb-6 overflow-hidden">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Technical Details</p>
                <pre className="text-[10px] font-mono text-zinc-600 whitespace-pre-wrap break-all">
                  {JSON.stringify(this.state.errorInfo, null, 2)}
                </pre>
              </div>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [view, setView] = useState<View>('landing');
  const [guideType, setGuideType] = useState<'user' | 'faq' | 'summary'>('user');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [freeUses, setFreeUses] = useState<number>(() => {
    const saved = localStorage.getItem('aeo_free_uses');
    return saved ? parseInt(saved) : 0;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { trackEvent } = useGA4();

  const FREE_LIMIT = 1; // Changed from 3 to 1 as per user request to protect value

  const isAdmin = user?.email?.toLowerCase() === 'lindsay.hiebert@gmail.com' || 
                  user?.email?.toLowerCase() === 'liindsay.hiebert@gmail.com';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      
      // Remove session_id from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      if (userProfile) {
        setUserProfile({ ...userProfile, subscription_status: 'Pro' });
      }
      trackEvent('subscription_success', { plan: 'Pro', sessionId });
    }
  }, [userProfile]);

  // Analyzer State
  const [url, setUrl] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [isDuel, setIsDuel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [duelResult, setDuelResult] = useState<CompetitiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);

  const navigateTo = (newView: View) => {
    setView(newView);
    setIsMenuOpen(false);
    if (newView !== 'analyzer') {
      setIsViewingHistory(false);
    }
    const path = newView === 'privacy' ? '/privacy' : newView === 'terms' ? '/terms' : '/';
    window.history.pushState({}, '', path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePath = () => {
      const path = window.location.pathname;
      if (path === '/privacy') setView('privacy');
      else if (path === '/terms') setView('terms');
      else if (path === '/' && view !== 'landing') {
        // Only auto-redirect if we're not explicitly on landing
        if (user && view === 'auth') setView('analyzer');
      }
    };
    handlePath();
    window.addEventListener('popstate', handlePath);
    return () => window.removeEventListener('popstate', handlePath);
  }, [user]);

  useEffect(() => {
    // Safety timeout: if auth check takes more than 2 seconds, show the app anyway
    const timeout = setTimeout(() => {
      console.log('[Auth] Safety timeout fired — forcing app render');
      setIsAuthReady(true);
    }, 2000);

    const handleSession = async (session: any) => {
      try {
        if (session?.user) {
          // Cache the access token so REST helpers never need to call getSession()
          setAccessToken(session.access_token || null);
          const appUser: AppUser = { id: session.user.id, email: session.user.email || '' };
          setUser(appUser);

          try {
            // Fetch profile using direct REST API (bypasses Supabase client queuing issues)
            const { data: profiles, error: profileError } = await supabaseQuery(
              'users',
              `select=*&id=eq.${session.user.id}`,
              8000
            );
            console.log('[Auth] Profile fetch result:', { profiles: profiles?.length, error: profileError });

            const profile = profiles?.[0];

            if (profileError || !profile) {
              // No profile exists yet (e.g. Google OAuth first login) — create one
              const email = session.user.email || '';
              const isAdminEmail = email.toLowerCase() === 'lindsay.hiebert@gmail.com' ||
                                   email.toLowerCase() === 'liindsay.hiebert@gmail.com';
              const { data: newProfiles } = await supabaseInsert('users', {
                id: session.user.id,
                email,
                display_name: session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || email.split('@')[0],
                role: isAdminEmail ? 'admin' : 'user',
                subscription_status: 'free',
              });
              if (newProfiles?.[0]) setUserProfile(newProfiles[0]);
            } else {
              setUserProfile(profile);
            }
          } catch (err) {
            console.error('[Auth] Error loading profile:', err);
          }

          trackEvent('login', { method: 'Supabase' });
          if (view === 'auth') {
            setView('analyzer');
          }
        } else {
          setAccessToken(null);
          setUser(null);
          setUserProfile(null);
          if (view !== 'privacy' && view !== 'terms') {
            setView('landing');
          }
        }
      } catch (err) {
        console.error('[Auth] Unexpected error in handleSession:', err);
      } finally {
        setIsAuthReady(true);
      }
    };

    // Track if initial session has been handled to prevent double-firing
    let initialSessionHandled = false;

    // Check existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialSessionHandled = true;
      return handleSession(session);
    }).catch((err) => {
      console.error('[Auth] getSession failed:', err);
      initialSessionHandled = true;
      setIsAuthReady(true);
    });

    // Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the INITIAL_SESSION event if we already handled it via getSession()
      if (event === 'INITIAL_SESSION' && initialSessionHandled) return;
      await handleSession(session).catch((err) => {
        console.error('[Auth] onAuthStateChange error:', err);
        setIsAuthReady(true);
      });
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchHistory = async (userId?: string) => {
    const id = userId || user?.id;
    console.log('[History] fetchHistory called with userId:', id);
    if (!id) {
      setLoadingHistory(false);
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      // Use direct REST API to bypass Supabase client issues
      const { data, error } = await supabaseQuery(
        'analysis_history',
        `select=*&user_id=eq.${id}&order=created_at.desc&limit=20`,
        10000
      );
      console.log('[History] Query result:', { count: data?.length, error });
      if (error) throw new Error(error.message);
      setHistory(data || []);
    } catch (err) {
      console.error('[History] Error fetching history:', err);
      setHistory([]);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (view === 'history' && user?.id) {
      fetchHistory(user.id);
    } else if (view === 'history') {
      setLoadingHistory(false);
      setHistory([]);
    }
  }, [view, user?.id]);

  const fetchHtml = async (targetUrl: string) => {
    const response = await fetch('/api/fetch-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: targetUrl,
        userId: user?.id
      }),
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `Failed to fetch ${targetUrl}`);
    }
    const { html } = await response.json();
    return html;
  };

  const updateUsageCount = async () => {
    if (!user || !userProfile) return;

    const newCount = (userProfile.usage_count || 0) + 1;
    try {
      // Use direct REST API to bypass Supabase client issues
      await supabaseUpdate('users', `id=eq.${user.id}`, {
        usage_count: newCount,
        last_analysis_at: new Date().toISOString(),
      });
      setUserProfile({ ...userProfile, usage_count: newCount });
    } catch (err) {
      console.error('Error updating usage count:', err);
    }
  };

  const saveToHistory = async (res: any, urlToSave: string, compUrl?: string) => {
    if (!user) return;
    try {
      // Use direct REST API to bypass Supabase client issues
      const { error: insertError } = await supabaseInsert('analysis_history', {
        user_id: user.id,
        url: urlToSave,
        score: res.score,
        citation_probability: res.citationProbability,
        full_result: JSON.stringify(res),
        is_duel: !!compUrl,
        competitor_url: compUrl || null,
        competitor_score: res.competitorScore || null,
      });
      if (insertError) throw new Error(insertError.message);
      console.log('[History] Saved analysis to history');
    } catch (err) {
      console.error('Error saving to history:', err);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Check Free Tier Limit
    const isPro = userProfile?.subscription_status?.toLowerCase() === 'pro' ||
                 userProfile?.subscription_status?.toLowerCase() === 'business' ||
                 isAdmin;

    // Check both local storage and database usage count for logged in users
    const effectiveUsageCount = user ? (userProfile?.usage_count || 0) : freeUses;

    if (!isPro && effectiveUsageCount >= FREE_LIMIT) {
      setError(`You've reached the free limit of ${FREE_LIMIT} analysis. Please sign in or upgrade to continue.`);
      setView(user ? 'payments' : 'auth');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setDuelResult(null);
    setIsViewingHistory(false);

    try {
      trackEvent('analysis_start', { isDuel, url });
      if (isDuel && competitorUrl) {
        const [html1, html2] = await Promise.all([
          fetchHtml(url),
          fetchHtml(competitorUrl)
        ]);
        const duel = await performCompetitiveDuel(url, html1, competitorUrl, html2);
        setDuelResult(duel);
        setLoading(false);

        // Update free uses if not pro
        if (!isPro) {
          const newCount = freeUses + 1;
          setFreeUses(newCount);
          localStorage.setItem('aeo_free_uses', newCount.toString());
        }

        // Save to DB in background (don't block UI)
        if (user) {
          saveToHistory(
            {
              ...duel.user,
              competitorScore: duel.competitor.score
            },
            url,
            competitorUrl
          ).catch(console.error);
          updateUsageCount().catch(console.error);
        }
        trackEvent('analysis_complete', { type: 'duel', winner: duel.winner });
      } else {
        const html = await fetchHtml(url);
        const analysis = await analyzeWebsite(url, html);
        setResult(analysis);
        setLoading(false);

        // Update free uses if not pro
        if (!isPro) {
          const newCount = freeUses + 1;
          setFreeUses(newCount);
          localStorage.setItem('aeo_free_uses', newCount.toString());
        }

        // Save to DB in background (don't block UI)
        if (user) {
          saveToHistory(analysis, url).catch(console.error);
          updateUsageCount().catch(console.error);
        }
        trackEvent('analysis_complete', { type: 'single', score: analysis.score });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleViewHistoryDetail = (item: any) => {
    if (!item.full_result) {
      setError('This analysis was saved without detailed results. Please re-run the analysis.');
      return;
    }
    try {
      const data = JSON.parse(item.full_result);
      if (item.is_duel) {
        setDuelResult({
          user: data.user || data,
          competitor: data.competitor || { score: item.competitor_score, criteria: [], recommendations: [], summary: '', citationProbability: 0 },
          verdict: data.verdict || 'Historical data only.',
          winner: data.winner || (item.score > item.competitor_score ? 'user' : 'competitor')
        });
        setResult(null);
        setUrl(item.url);
        setCompetitorUrl(item.competitor_url);
        setIsDuel(true);
      } else {
        setResult(data);
        setDuelResult(null);
        setUrl(item.url);
        setIsDuel(false);
      }
      setIsViewingHistory(true);
      setView('analyzer');
      window.scrollTo(0, 0);
    } catch (e) {
      console.error('Error parsing history detail:', e);
      setError('Could not load analysis details. This record might be from an older version.');
    }
  };

  const handleSignOut = () => {
    setAccessToken(null);
    setUser(null);
    setUserProfile(null);
    supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthReady) {
    return (
      <HelmetProvider>
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
        </div>
      </HelmetProvider>
    );
  }

  const getBreadcrumbs = () => {
    const items = [{ name: 'Home', item: '/' }];
    if (view === 'guide') items.push({ name: 'User Guide', item: '/guide' });
    if (view === 'privacy') items.push({ name: 'Privacy Policy', item: '/privacy' });
    if (view === 'terms') items.push({ name: 'Terms of Service', item: '/terms' });
    if (view === 'analyzer') items.push({ name: 'AEO Analyzers', item: '/analyzer' });
    return getBreadcrumbJsonLd(items);
  };

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans">
      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-5 h-5" />
            Subscription Successful! Welcome to Pro.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <button 
              onClick={() => navigateTo('landing')}
              aria-label="AEO Analyzers Home"
              className="flex items-center gap-3 hover:opacity-80 transition-all group"
            >
              <div className="bg-zinc-900 p-2 rounded-xl group-hover:rotate-6 transition-transform">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-xl tracking-tighter leading-none">AEO ANALYZERS</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Answer Engine Optimization</span>
              </div>
            </button>
            
            <nav className="hidden lg:flex items-center gap-2">
              <NavButton active={view === 'landing'} onClick={() => navigateTo('landing')} icon={<Globe className="w-4 h-4" />} label="Why AEO?" />
              {user && (
                <>
                  <div className="w-px h-6 bg-zinc-200 mx-2" />
                  <NavButton active={view === 'analyzer'} onClick={() => navigateTo('analyzer')} icon={<LayoutDashboard className="w-4 h-4" />} label="Analyzer" />
                  <NavButton active={view === 'history'} onClick={() => navigateTo('history')} icon={<History className="w-4 h-4" />} label="History" />
                  <NavButton active={view === 'payments'} onClick={() => navigateTo('payments')} icon={<CreditCard className="w-4 h-4" />} label="Pricing" />
                </>
              )}
              <NavButton active={view === 'guide' && guideType === 'faq'} onClick={() => { setView('guide'); setGuideType('faq'); }} icon={<BookOpen className="w-4 h-4" />} label="FAQ" />
              {isAdmin && (
                <NavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<ShieldAlert className="w-4 h-4" />} label="Admin" />
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-tight">{userProfile?.display_name || user.email?.split('@')[0]}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-purple-500 animate-pulse' : userProfile?.subscription_status?.toLowerCase() === 'pro' || userProfile?.subscription_status?.toLowerCase() === 'business' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{isAdmin ? 'Admin' : userProfile?.subscription_status || 'Free'}</span>
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  aria-label="Sign Out"
                  className="p-2.5 hover:bg-zinc-100 rounded-xl transition-all text-zinc-400 hover:text-red-500"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
                  className="lg:hidden p-2.5 hover:bg-zinc-100 rounded-xl transition-all"
                >
                  {isMenuOpen ? <Check className="w-5 h-5" /> : <LayoutDashboard className="w-5 h-5" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setView('auth')}
                  className="hidden sm:block text-sm font-bold text-zinc-500 hover:text-zinc-900 px-4 py-2 transition-all"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setView('auth')}
                  className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
                >
                  Get Started
                </button>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Toggle Menu"
                  className="lg:hidden p-2.5 hover:bg-zinc-100 rounded-xl transition-all"
                >
                  <LayoutDashboard className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-zinc-100 bg-white overflow-hidden"
            >
              <div className="p-6 space-y-2">
                <NavButton active={view === 'landing'} onClick={() => navigateTo('landing')} icon={<Globe className="w-4 h-4" />} label="Why AEO?" />
                {user && (
                  <>
                    <NavButton active={view === 'analyzer'} onClick={() => navigateTo('analyzer')} icon={<LayoutDashboard className="w-4 h-4" />} label="Analyzer" />
                    <NavButton active={view === 'history'} onClick={() => navigateTo('history')} icon={<History className="w-4 h-4" />} label="History" />
                    <NavButton active={view === 'payments'} onClick={() => navigateTo('payments')} icon={<CreditCard className="w-4 h-4" />} label="Pricing" />
                  </>
                )}
                <NavButton active={view === 'guide' && guideType === 'faq'} onClick={() => { setView('guide'); setGuideType('faq'); setIsMenuOpen(false); }} icon={<BookOpen className="w-4 h-4" />} label="FAQ" />
                {isAdmin && (
                  <NavButton active={view === 'admin'} onClick={() => { setView('admin'); setIsMenuOpen(false); }} icon={<ShieldAlert className="w-4 h-4" />} label="Admin" />
                )}
                {!user && (
                  <button 
                    onClick={() => { setView('auth'); setIsMenuOpen(false); }}
                    className="w-full mt-4 bg-zinc-900 text-white px-6 py-3 rounded-xl text-sm font-bold"
                  >
                    Sign In / Get Started
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="py-12 flex-1">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MarketingLanding onGetStarted={() => setView(user ? 'analyzer' : 'auth')} />
            </motion.div>
          )}

          {view === 'auth' && !user && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Auth onAuthSuccess={() => setView('analyzer')} />
            </motion.div>
          )}

          {view === 'payments' && (
            <motion.div 
              key="payments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Payments 
                user={user} 
                userProfile={userProfile}
                onAuthRequired={() => setView('auth')} 
              />
            </motion.div>
          )}

          {view === 'admin' && isAdmin && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminDashboard />
            </motion.div>
          )}

          {view === 'guide' && (
            <motion.div 
              key="guide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <UserGuide isAdmin={isAdmin} initialGuide={guideType as any} />
            </motion.div>
          )}

          {view === 'privacy' && (
            <motion.div 
              key="privacy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto px-6 py-12"
            >
              <SEO 
                title="Privacy Policy - AEO Analyzers"
                description="Our commitment to your data privacy and how we handle your information at AEO Analyzers."
                author="Lindsay Hiebert"
                publishedDate="2026-03-22T00:00:00Z"
              />
              <div className="prose prose-zinc prose-sm md:prose-base max-w-none bg-white border border-zinc-200 rounded-[3rem] p-10 md:p-16 shadow-sm">
                <h1 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Privacy Policy</h1>
                <p className="text-zinc-500 font-mono uppercase tracking-widest text-xs mb-12">Last updated: March 22, 2026</p>
                
                <section className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-900">1. Data Collection & Simulation</h2>
                    <p className="text-zinc-600 leading-relaxed">
                      AEO Analyzers collects minimal personal data required to provide our simulation services. This includes your email address for account management and the URLs you submit for analysis. We do not store the full HTML content of analyzed sites beyond the duration of the simulation.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-900">2. AI Processing & Privacy</h2>
                    <p className="text-zinc-600 leading-relaxed">
                      Our analysis is powered by the Google Gemini API. When you submit a URL, we fetch the public content and send a sanitized version to the LLM for reasoning. We do not use your proprietary data to train our models.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-900">3. Payment Information</h2>
                    <p className="text-zinc-600 leading-relaxed">
                      All payment processing is handled securely by Stripe. AEO Analyzers does not store your credit card details or sensitive financial information on our servers.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-900">4. Cookies & Tracking</h2>
                    <p className="text-zinc-600 leading-relaxed">
                      We use essential cookies for authentication and session management. We also use GA4 for anonymous usage tracking to improve the platform's performance and user experience.
                    </p>
                  </div>
                </section>

                <button onClick={() => navigateTo('landing')} className="mt-16 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 w-fit">
                  <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
                </button>
              </div>
            </motion.div>
          )}

          {view === 'terms' && (
            <motion.div 
              key="terms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto px-6 py-12"
            >
              <SEO 
                title="Terms of Service - AEO Analyzers"
                description="The rules and guidelines for using the AEO Analyzers platform."
                author="Lindsay Hiebert"
                publishedDate="2026-03-22T00:00:00Z"
              />
              <div className="prose prose-zinc prose-sm md:prose-base max-w-none bg-white border border-zinc-200 rounded-[3rem] p-10 md:p-16 shadow-sm">
                <h1 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Terms of Service</h1>
                <p className="text-zinc-500 font-mono uppercase tracking-widest text-xs mb-12">Last updated: March 22, 2026</p>
                
                <section className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-900">1. Acceptance of Terms</h2>
                    <p className="text-zinc-600 leading-relaxed">
                      By accessing AEO Analyzers, you agree to be bound by these Terms. Our service is provided "as is," and we make no guarantees regarding the absolute accuracy of AI-generated scores, as search algorithms and LLM behaviors change frequently.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-900">2. Usage Limits</h2>
                    <p className="text-zinc-600 leading-relaxed">
                      Free users are limited to one analysis. Pro and Business users are subject to the monthly limits defined in their respective tiers. Attempting to bypass these limits via automated scripts or multiple accounts is a violation of these terms.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-900">3. Intellectual Property</h2>
                    <p className="text-zinc-600 leading-relaxed">
                      The AEO Analyzers platform, including its proprietary scoring algorithms and UI design, is the property of AEO Analyzers. You retain all rights to the website content you submit for analysis.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-900">4. Termination</h2>
                    <p className="text-zinc-600 leading-relaxed">
                      We reserve the right to terminate or suspend access to our service immediately, without prior notice, for any breach of these Terms.
                    </p>
                  </div>
                </section>

                <button onClick={() => navigateTo('landing')} className="mt-16 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 w-fit">
                  <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
                </button>
              </div>
            </motion.div>
          )}

          {view === 'press' && (
            <motion.div 
              key="press"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PressKit />
            </motion.div>
          )}

          {view === 'history' && user && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto px-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Analysis History</h2>
                <button 
                  onClick={() => fetchHistory()}
                  disabled={loadingHistory}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-all"
                >
                  <Loader2 className={`w-5 h-5 ${loadingHistory ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                </div>
              ) : history.length > 0 ? (
                <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Website</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Score</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Citation Prob.</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {history.map((item) => (
                        <tr 
                          key={item.id} 
                          onClick={() => handleViewHistoryDetail(item)}
                          className="hover:bg-zinc-50 transition-all cursor-pointer group"
                        >
                          <td className="px-6 py-4 font-medium text-sm text-zinc-900 truncate max-w-[200px] flex items-center gap-2">
                            {item.url}
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all text-zinc-400" />
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-sm">{item.score}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-emerald-600 font-bold">{item.citation_probability}%</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${item.is_duel ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                              {item.is_duel ? 'Duel' : 'Single'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-900 transition-all flex items-center gap-1">
                              View <ChevronRight className="w-3 h-3" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20 bg-white border border-zinc-200 rounded-3xl border-dashed">
                  <p className="text-zinc-400">No analysis history found. Start by analyzing a website!</p>
                </div>
              )}
            </motion.div>
          )}

          {view === 'analyzer' && (
            <motion.div 
              key="analyzer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SEO 
                title="AEO Analyzers - Score Your Website"
                description="Analyze your website's performance in AI search results and get actionable insights to improve your citations."
                author="Lindsay Hiebert"
                publishedDate="2026-03-22T00:00:00Z"
              />
              <div className="max-w-5xl mx-auto px-6">
                {isViewingHistory && (
                  <div className="mb-8 flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4">
                    <div className="flex items-center gap-3">
                      <History className="w-5 h-5 text-zinc-400" />
                      <div>
                        <span className="text-sm font-bold text-zinc-900">Viewing Saved Analysis</span>
                        <span className="text-xs text-zinc-500 ml-2">{url}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setView('history')}
                      className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-all font-bold text-sm bg-white border border-zinc-200 px-4 py-2 rounded-xl"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      Back to History
                    </button>
                  </div>
                )}
                {/* Hero Section */}
                <section className="text-center mb-16">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-block px-4 py-1.5 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold mb-6 uppercase tracking-wider"
                  >
                    Multiple AI Engines. One Score. 90 Seconds.
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
                  >
                    Secure your <span className="text-zinc-500">AI Citation.</span>
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-zinc-500 text-lg max-w-2xl mx-auto mb-10"
                  >
                    We simulate how Gemini, ChatGPT, and Perplexity perceive your site — delivering insights that would take a web team hundreds of hours, in 90 seconds.
                  </motion.p>

                  <motion.form 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onSubmit={handleAnalyze}
                    className="max-w-3xl mx-auto space-y-6"
                  >
                    <div className={`grid gap-2 p-2 bg-white border-2 border-zinc-900 rounded-[2rem] shadow-2xl focus-within:ring-8 focus-within:ring-zinc-900/5 transition-all ${isDuel ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                      <div className="flex items-center pl-4 border-r border-zinc-100 last:border-0">
                        <Globe className="w-6 h-6 text-zinc-400 mr-4" />
                        <input 
                          type="url" 
                          placeholder="Your Website URL"
                          aria-label="Your Website URL"
                          className="w-full bg-transparent border-none focus:ring-0 text-zinc-900 font-bold placeholder:text-zinc-300 py-4 text-lg"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          required
                        />
                      </div>
                      {isDuel && (
                        <div className="flex items-center pl-4">
                          <Swords className="w-6 h-6 text-zinc-400 mr-4" />
                          <input 
                            type="url" 
                            placeholder="Competitor URL"
                            aria-label="Competitor URL"
                            className="w-full bg-transparent border-none focus:ring-0 text-zinc-900 font-bold placeholder:text-zinc-300 py-4 text-lg"
                            value={competitorUrl}
                            onChange={(e) => setCompetitorUrl(e.target.value)}
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* Usage Progress for Free Users */}
                    {user && userProfile?.subscription_status?.toLowerCase() !== 'pro' && userProfile?.subscription_status?.toLowerCase() !== 'business' && (
                      <div className="max-w-xs mx-auto">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                          <span>Free Usage</span>
                          <span>{userProfile?.usage_count || 0} / {FREE_LIMIT}</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((userProfile?.usage_count || 0) / FREE_LIMIT) * 100}%` }}
                            className="h-full bg-zinc-900"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button 
                        type="submit"
                        disabled={loading}
                        aria-label={isDuel ? 'Start Competitive Duel' : 'Analyze AEO Score'}
                        className="w-full sm:w-auto bg-zinc-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Running AI Simulation...
                          </>
                        ) : (
                          <>
                            {isDuel ? 'Start Competitive Duel' : 'Analyze AEO Score'}
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsDuel(!isDuel)}
                        aria-label={isDuel ? 'Switch to Single Analysis' : 'Switch to Competitive Duel'}
                        className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border ${isDuel ? 'bg-zinc-100 border-zinc-200 text-zinc-900' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-900'}`}
                      >
                        <Swords className="w-5 h-5" />
                        {isDuel ? 'Single Analysis' : 'Competitive Duel'}
                      </button>
                    </div>
                  </motion.form>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center gap-3 text-red-600 text-sm max-w-lg mx-auto"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { setError(null); handleAnalyze(e as any); }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all"
                      >
                        Retry Analysis
                      </button>
                    </motion.div>
                  )}
                </section>

                {/* Duel Results */}
                <AnimatePresence mode="wait">
                  {duelResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      <div className="bg-zinc-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                          <Swords className="w-48 h-48" />
                        </div>
                        <div className="relative z-10">
                          <h2 className="text-3xl font-bold mb-4">The Verdict</h2>
                          <p className="text-xl text-zinc-300 leading-relaxed max-w-3xl">
                            "{duelResult.verdict}"
                          </p>
                          <div className="mt-8 flex items-center gap-4">
                            <div className={`px-6 py-2 rounded-full font-bold uppercase tracking-widest text-sm ${duelResult.winner === 'user' ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                              {duelResult.winner === 'user' ? '🏆 You are Winning' : 'You are Trailing'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ScoreCard title="Your Site" result={duelResult.user} isWinner={duelResult.winner === 'user'} />
                        <ScoreCard title="Competitor" result={duelResult.competitor} isWinner={duelResult.winner === 'competitor'} />
                      </div>

                      <ShareResults 
                        score={duelResult.user.score} 
                        citationProbability={duelResult.user.citationProbability} 
                        isDuel={true} 
                      />
                    </motion.div>
                  )}

                  {/* Single Result */}
                  {result && !duelResult && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-8"
                    >
                      {/* Score & Citation Probability */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                            <CircularProgress score={result.score} />
                            <span className="absolute text-4xl font-bold">{result.score}</span>
                          </div>
                          <h3 className="text-xl font-bold mb-2">AEO Score</h3>
                          <p className="text-sm text-zinc-500">Answer Engine Optimization</p>
                        </div>

                        <div className="md:col-span-1 bg-zinc-900 text-white border border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl">
                          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                            <CircularProgress score={result.citationProbability} color="text-emerald-500" />
                            <span className="absolute text-4xl font-bold text-emerald-500">{result.citationProbability}%</span>
                          </div>
                          <h3 className="text-xl font-bold mb-2">Citation Prob.</h3>
                          <p className="text-sm text-zinc-400">Likelihood of AI Attribution</p>
                        </div>

                        <div className="md:col-span-1 bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm flex flex-col justify-center">
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-zinc-900" />
                            Summary
                          </h3>
                          <p className="text-zinc-600 text-sm leading-relaxed">
                            {result.summary}
                          </p>
                        </div>
                      </div>

                      <ShareResults
                        score={result.score}
                        citationProbability={result.citationProbability}
                      />

                      {/* Score Formula Breakdown */}
                      {result.scoreBreakdown && (
                        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
                          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                            <BarChart className="w-5 h-5 text-zinc-900" />
                            Score Formula
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                            {([
                              { label: 'Entity', value: result.scoreBreakdown.entity, weight: '30%', desc: 'Schema.org & Identity' },
                              { label: 'Density', value: result.scoreBreakdown.density, weight: '30%', desc: 'Facts & Statistics' },
                              { label: 'Clarity', value: result.scoreBreakdown.clarity, weight: '20%', desc: 'Direct Answerability' },
                              { label: 'Structure', value: result.scoreBreakdown.structure, weight: '20%', desc: 'Semantic HTML' },
                            ] as const).map((item) => (
                              <div key={item.label} className="text-center">
                                <div className="text-3xl font-bold text-zinc-900">{item.value}</div>
                                <div className="text-sm font-bold text-zinc-700 mt-1">{item.label}</div>
                                <div className="text-[10px] text-zinc-400 uppercase tracking-widest">{item.weight} weight</div>
                                <div className="mt-2 h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-zinc-900 rounded-full transition-all" style={{ width: `${item.value}%` }} />
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-1">{item.desc}</div>
                              </div>
                            ))}
                          </div>
                          <p className="text-center text-xs text-zinc-400 font-mono">
                            Score = E×0.3 + D×0.3 + C×0.2 + S×0.2
                          </p>
                        </div>
                      )}

                      {/* Implementation Roadmap (Premium Feature) */}
                      <ImplementationRoadmap
                        isPaid={userProfile?.subscription_status?.toLowerCase() === 'pro' || userProfile?.subscription_status?.toLowerCase() === 'business' || isAdmin}
                        onUpgrade={() => setView('payments')}
                        analyzedUrl={url}
                        analysisResult={result}
                        displayName={userProfile?.display_name}
                        citationProbability={result.citationProbability}
                        recommendations={result.recommendations}
                      />

                      {/* Advanced Analysis Cards */}
                      <AdvancedAnalysisCards result={result} />

                      {/* Detailed Criteria */}
                      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                          <h3 className="font-bold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            AEO Breakdown
                          </h3>
                        </div>
                        <div className="divide-y divide-zinc-100">
                          {result.criteria.map((item, idx) => (
                            <div key={idx} className="p-6 flex flex-col md:flex-row md:items-center gap-4">
                              <div className="md:w-1/4">
                                <div className="text-sm font-bold text-zinc-900">{item.name}</div>
                                <div className="flex items-center gap-1 mt-1">
                                  {[...Array(10)].map((_, i) => (
                                    <div 
                                      key={i} 
                                      className={`h-1.5 w-full rounded-full ${i < item.score ? 'bg-zinc-900' : 'bg-zinc-100'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="flex-1 text-sm text-zinc-600">
                                {item.feedback}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-zinc-200 text-center">
        <div className="flex items-center justify-center gap-6 mb-4">
          <button onClick={() => navigateTo('press')} className="text-xs text-zinc-400 hover:text-zinc-900 transition-all">Press Kit</button>
          <button onClick={() => navigateTo('privacy')} className="text-xs text-zinc-400 hover:text-zinc-900 transition-all">Privacy Policy</button>
          <button onClick={() => navigateTo('terms')} className="text-xs text-zinc-400 hover:text-zinc-900 transition-all">Terms of Service</button>
        </div>
        <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest">
          AEO Analyzers // The Answer Engine
        </p>
      </footer>
      </div>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      aria-label={label}
      className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2.5 transition-all duration-300 ${active ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'}`}
    >
      <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
      {label}
    </button>
  );
}

function ScoreCard({ title, result, isWinner }: { title: string, result: AnalysisResult, isWinner: boolean }) {
  return (
    <div className={`p-10 rounded-[2.5rem] border-2 transition-all duration-500 ${isWinner ? 'bg-white border-zinc-900 shadow-2xl scale-[1.02]' : 'bg-zinc-50/50 border-zinc-200 opacity-60 hover:opacity-100'}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Entity Analysis</span>
          <h3 className="text-2xl font-black tracking-tight">{title}</h3>
        </div>
        {isWinner && (
          <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            Winning
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">AEO Score</div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black tracking-tighter">{result.score}</span>
            <span className="text-zinc-300 font-bold">/100</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Citation</div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black tracking-tighter text-emerald-500">{result.citationProbability}</span>
            <span className="text-emerald-200 font-bold">%</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-8 border-t border-zinc-100">
        {result.criteria.slice(0, 3).map((c, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{c.name}</span>
              <span className="text-xs font-black">{c.score}/10</span>
            </div>
            <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${isWinner ? 'bg-zinc-900' : 'bg-zinc-300'}`}
                style={{ width: `${c.score * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CircularProgress({ score, color = "text-zinc-900", size = 128, strokeWidth = 8 }: { score: number, color?: string, size?: number, strokeWidth?: number }) {
  const radius = (size / 2) - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="transparent"
        className="text-zinc-100"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`${color} transition-all duration-1000 ease-out`}
      />
    </svg>
  );
}

function ShareResults({ score, citationProbability, isDuel = false }: { score: number, citationProbability: number, isDuel?: boolean }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = "https://aeoanalyzers.com";
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 p-8 bg-zinc-50 border border-zinc-200 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8"
    >
      <div className="text-center md:text-left">
        <h4 className="text-xl font-black mb-2 tracking-tight">Proud of your score?</h4>
        <p className="text-zinc-500 text-sm">Share your results and help others dominate AI search.</p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
        <button 
          onClick={shareOnLinkedIn}
          className="w-full sm:w-auto px-8 py-4 bg-[#0077b5] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2.5 hover:scale-105 transition-all shadow-lg shadow-blue-900/20"
        >
          <Linkedin className="w-4 h-4" />
          Share on LinkedIn
        </button>
        <button 
          onClick={handleCopy}
          className="w-full sm:w-auto px-8 py-4 bg-white text-zinc-900 border border-zinc-200 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2.5 hover:scale-105 transition-all"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          {copied ? 'Link Copied!' : 'Copy Link'}
        </button>
      </div>
    </motion.div>
  );
}
