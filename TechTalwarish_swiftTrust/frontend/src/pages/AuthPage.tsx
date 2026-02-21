import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode]         = useState<Mode>('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({ username: '', email: '', password: '', role: 'citizen' });

  const { login } = useAuth();
  const navigate  = useNavigate();

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload  = mode === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password, role: form.role };

      const { data } = await api.post(endpoint, payload);
      login(data.token, data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(32,82,149,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(32,82,149,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500 rounded-xl mb-4 shadow-lg shadow-amber-500/20">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Swift<span className="text-amber-500">Trust</span></h1>
          <p className="text-slate-400 text-sm mt-1 font-mono">Universal Truth Engine v2.0</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          {/* Tab toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1 mb-6">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all capitalize
                  ${mode === m ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Username</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="john_doe"
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="user@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Role</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                >
                  <option value="citizen">Citizen</option>
                  <option value="verified_source">Verified Source (Police / Media)</option>
                </select>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-black font-bold py-3 rounded-lg transition-all text-sm tracking-wider uppercase mt-2"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
