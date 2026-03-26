import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Loader2, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Chrome, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthMode = 'login' | 'signup' | 'reset';

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      // Redirect happens automatically — onAuthStateChange in App.tsx handles the rest
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Login failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
          },
        });
        if (signUpError) throw signUpError;

        const user = data.user;
        if (user) {
          const isAdminEmail = email.toLowerCase() === 'lindsay.hiebert@gmail.com' ||
                               email.toLowerCase() === 'liindsay.hiebert@gmail.com';

          const { error: profileError } = await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            display_name: displayName || email.split('@')[0],
            role: isAdminEmail ? 'admin' : 'user',
            subscription_status: 'free',
          });
          if (profileError) {
            console.error('Profile creation error:', profileError);
          }
        }

        onAuthSuccess();
      } else if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onAuthSuccess();
      } else if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (resetError) throw resetError;
        setMessage('Password reset email sent. Please check your inbox.');
        setMode('login');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
        </h2>
        <p className="text-zinc-500 text-sm">
          {mode === 'login' ? 'Sign in to access your AEO dashboard' : mode === 'signup' ? 'Start securing your AI citations today' : 'Enter your email to receive a reset link'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all outline-none"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="email"
              placeholder="name@company.com"
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {mode !== 'reset' && (
          <div className="space-y-1">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-xs font-bold text-zinc-900 hover:underline"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-400 font-bold tracking-widest">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border border-zinc-200 text-zinc-900 py-3 rounded-xl font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-3"
        >
          <Chrome className="w-5 h-5" />
          Google Account
        </button>
      </div>

      <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
        <p className="text-zinc-500 text-sm">
          {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="ml-2 font-bold text-zinc-900 hover:underline"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-600 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
