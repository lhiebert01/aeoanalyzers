import React from 'react';
import { X, Send, CheckCircle2, Loader2 } from 'lucide-react';

/** Contact form → founder's inbox via /api/contact (Resend). Direct, no ticket queue. */
export default function ContactModal({ open, onClose, subject }: { open: boolean; onClose: () => void; subject?: string }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [hp, setHp] = React.useState(''); // honeypot
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) { setStatus('idle'); setError(''); }
  }, [open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending'); setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, company,
          message: subject ? `[${subject}]\n\n${message}` : message,
          company_website: hp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send. Please try again.');
      setStatus('sent');
    } catch (err: any) {
      setStatus('error'); setError(err.message || 'Could not send. Please try again.');
    }
  };

  const field = 'w-full px-4 py-3 rounded-xl border border-zinc-300 focus:border-zinc-900 outline-none transition-colors';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-900 transition-colors"><X className="w-5 h-5" /></button>

        {status === 'sent' ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-7 h-7" /></div>
            <h3 className="text-xl font-black tracking-tight">Message sent</h3>
            <p className="text-zinc-500 mt-2 text-sm">It lands directly in Lindsay's inbox — one business day turnaround.</p>
            <button onClick={onClose} className="mt-6 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all">Done</button>
          </div>
        ) : (
          <>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Contact</div>
            <h3 className="text-2xl font-black tracking-tight">Send a message</h3>
            <p className="text-zinc-500 text-sm mt-2">
              Direct to the founder — no SDR, no ticket queue. One business day turnaround.{subject ? ` (${subject})` : ''}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" className={field} />
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className={field} />
              <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Your question or message…" className={`${field} resize-none`} />
              {/* honeypot — hidden from humans */}
              <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="company_website" aria-hidden="true" className="hidden" />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={status === 'sending'} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-60">
                  {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {status === 'sending' ? 'Sending…' : 'Send to the founder →'}
                </button>
                <button type="button" onClick={onClose} className="px-5 py-3 text-zinc-500 hover:text-zinc-900 font-bold transition-colors">Cancel</button>
              </div>

              <p className="text-[11px] text-zinc-400 pt-1">Sent via Resend from a verified AEOAnalyzers sender. Not stored beyond delivery — it lives in the founder's inbox.</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
