import React, { useState, useEffect } from 'react';
import { supabase, supabaseQuery } from '../supabase';
import {
  Users,
  TrendingUp,
  ShieldAlert,
  ExternalLink,
  Search,
  Mail,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart
} from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pro: 0, free: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Use direct REST API to bypass Supabase client issues
      const { data, error } = await supabaseQuery(
        'users',
        'select=*&order=created_at.desc&limit=100',
        10000
      );

      if (error) throw new Error(error.message);

      const userData = data || [];
      setUsers(userData);

      if (userData.length === 0) {
        setFetchError('No users returned. The admin RLS policy may not be configured in Supabase. Run the is_admin() function and admin policy SQL in your Supabase SQL Editor.');
      }

      const proCount = userData.filter((u: any) => u.subscription_status?.toLowerCase() === 'pro').length;
      setStats({
        total: userData.length,
        pro: proCount,
        free: userData.length - proCount
      });
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setFetchError(err.message || 'Failed to fetch users. Check your Supabase connection and RLS policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleResetPassword = async (email: string) => {
    setActionLoading(email);
    try {
      // Client-side: send reset email via Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: `Password reset email sent to ${email}` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SuperAdmin Dashboard</h2>
          <p className="text-zinc-500">Manage users, monitor growth, and handle support tasks.</p>
        </div>
        <div className="flex gap-3">
          <a
            href="https://analytics.google.com/analytics/web/#/p14235134644/reports/intelligenthome"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold hover:bg-zinc-50 transition-all"
          >
            <BarChart className="w-4 h-4" />
            Open GA4
          </a>
          <button
            onClick={fetchUsers}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* RLS Error Banner */}
      {fetchError && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-2">Admin Dashboard Issue</p>
              <p className="text-sm text-amber-700 mb-3">{fetchError}</p>
              <details className="text-xs text-amber-600">
                <summary className="cursor-pointer font-bold hover:text-amber-800">Fix: Run this SQL in Supabase SQL Editor</summary>
                <pre className="mt-2 bg-white/60 rounded-xl p-4 font-mono text-[11px] text-zinc-700 overflow-x-auto whitespace-pre">{`-- Step 1: Create the admin detection function
CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN lower(user_email) IN ('lindsay.hiebert@gmail.com', 'liindsay.hiebert@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing admin policy if it exists (ignore error if not)
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;

-- Step 3: Create admin read-all policy
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.is_admin((SELECT auth.jwt() ->> 'email')));

-- Step 4: Update your admin user's subscription_status
UPDATE public.users
SET subscription_status = 'admin', role = 'admin'
WHERE lower(email) = 'lindsay.hiebert@gmail.com';`}</pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-500" />}
          label="Total Users"
          value={stats.total}
          sub="All time signups"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-emerald-500" />}
          label="Pro Subscribers"
          value={stats.pro}
          sub={`${((stats.pro / stats.total) * 100 || 0).toFixed(1)}% conversion`}
        />
        <StatCard
          icon={<ShieldAlert className="w-6 h-6 text-amber-500" />}
          label="Free Users"
          value={stats.free}
          sub="Potential for upgrade"
        />
      </div>

      {/* User Management */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-lg">User Management</h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/10 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <div className={`mx-6 mt-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-200 mx-auto" />
                    <p className="text-xs text-zinc-400 mt-3">Loading users from Supabase...</p>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 font-bold text-xs">
                          {user.display_name?.[0] || user.email?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">{user.display_name || 'No Name'}</div>
                          <div className="text-xs text-zinc-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${user.subscription_status?.toLowerCase() === 'pro' ? 'bg-emerald-100 text-emerald-600' : user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        {user.role === 'admin' ? 'Admin' : user.subscription_status || 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleResetPassword(user.email)}
                        disabled={actionLoading === user.email}
                        className="text-xs font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 ml-auto"
                      >
                        {actionLoading === user.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                        Reset Pwd
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-zinc-400 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: number | string, sub: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-2 bg-zinc-50 rounded-xl">
          {icon}
        </div>
        <span className="text-sm font-bold text-zinc-500">{label}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <p className="text-xs text-zinc-400">{sub}</p>
    </div>
  );
}
