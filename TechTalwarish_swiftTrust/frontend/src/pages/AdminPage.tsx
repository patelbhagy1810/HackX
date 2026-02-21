import { useEffect, useState, useRef } from 'react';
import { Shield, Users, AlertTriangle, CheckCircle, Terminal, RefreshCw } from 'lucide-react';
import { api, getSocket } from '../utils/api';
import { LogEntry, TruthEvent, User } from '../types';

const SEV_COLOR: Record<string, string> = {
  LOW: '#4d9fff', MEDIUM: '#f5c842', HIGH: '#f0a500', CRITICAL: '#e03030',
};
const LOG_COLOR: Record<string, string> = {
  info: '#b0b8cc', success: '#00c97a', error: '#e03030', warn: '#f0a500',
};

export default function AdminPage() {
  const [tab, setTab]         = useState<'log' | 'events' | 'users'>('log');
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [events, setEvents]   = useState<TruthEvent[]>([]);
  const [users, setUsers]     = useState<User[]>([]);
  const [stats, setStats]     = useState({ totalUsers: 0, activeEvents: 0, totalEvents: 0 });
  const [loading, setLoading] = useState(false);
  const logRef                = useRef<HTMLDivElement>(null);

  // Socket connection
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_admin');

    socket.on('admin_log', (entry: LogEntry) => {
      setLogs(prev => [...prev.slice(-200), entry]); // keep last 200
    });
    socket.on('event_update', (updated: TruthEvent) => {
      setEvents(prev => {
        const idx = prev.findIndex(e => e._id === updated._id);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = updated; return copy; }
        return [updated, ...prev];
      });
    });

    fetchAll();
    return () => { socket.off('admin_log'); socket.off('event_update'); };
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [evRes, usrRes, stRes] = await Promise.all([
        api.get('/admin/events'),
        api.get('/admin/users'),
        api.get('/admin/stats'),
      ]);
      setEvents(evRes.data);
      setUsers(usrRes.data);
      setStats(stRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const resolveEvent = async (id: string) => {
    await api.put(`/events/${id}/resolve`);
    fetchAll();
  };

  const updateUser = async (id: string, payload: object) => {
    await api.put(`/admin/users/${id}`, payload);
    fetchAll();
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Admin Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-500" />
          <span className="font-mono text-sm text-white font-bold uppercase tracking-wider">Admin Console</span>
          <span className="font-mono text-xs text-amber-500/60 border border-amber-500/20 px-2 py-0.5 rounded">UTE v2.0</span>
        </div>
        <button onClick={fetchAll} disabled={loading} className="text-slate-400 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-3 gap-px bg-slate-800 border-b border-slate-800">
        {[
          { label: 'Active Events', value: stats.activeEvents, color: 'text-amber-500' },
          { label: 'Total Users',   value: stats.totalUsers,   color: 'text-blue-400' },
          { label: 'Total Events',  value: stats.totalEvents,  color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 px-6 py-3 flex items-center gap-3">
            <span className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</span>
            <span className="text-xs font-mono text-slate-500 uppercase">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {([['log', Terminal, 'Live Log'], ['events', AlertTriangle, 'Events'], ['users', Users, 'Users']] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors
              ${tab === key ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">

        {/* LIVE LOG */}
        {tab === 'log' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-slate-400">LIVE ACTIVITY CONSOLE</span>
              </div>
              <button onClick={() => setLogs([])} className="text-xs font-mono text-slate-600 hover:text-red-400">CLEAR</button>
            </div>
            <div ref={logRef} className="h-[60vh] overflow-y-auto p-4 space-y-1 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-slate-600 italic">Waiting for engine activity...</p>
              ) : logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-slate-600 flex-shrink-0">{log.timestamp}</span>
                  <span style={{ color: LOG_COLOR[log.type] ?? LOG_COLOR.info }}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EVENTS TABLE */}
        {tab === 'events' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950">
                  {['Event Name', 'Status', 'Confidence', 'Severity', 'Reports', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-white text-xs">{ev.eventName}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                        ev.status === 'VERIFIED'  ? 'bg-green-900/40 text-green-400' :
                        ev.status === 'DISPUTED'  ? 'bg-red-900/40 text-red-400' :
                        ev.status === 'RESOLVED'  ? 'bg-slate-700 text-slate-400' :
                        'bg-amber-900/30 text-amber-400'
                      }`}>{ev.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${ev.confidenceScore}%`, background: SEV_COLOR[ev.severity] }} />
                        </div>
                        <span className="text-xs font-mono text-slate-300">{ev.confidenceScore.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold" style={{ color: SEV_COLOR[ev.severity] }}>{ev.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{ev.reportCount}</td>
                    <td className="px-4 py-3">
                      {ev.active && (
                        <button
                          onClick={() => resolveEvent(ev._id)}
                          className="flex items-center gap-1.5 text-xs font-mono bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-800/40 px-3 py-1.5 rounded transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> RESOLVE
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* USERS TABLE */}
        {tab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950">
                  {['Username', 'Email', 'Role', 'Trust Score', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-white text-xs">{user.username}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                        user.role === 'admin'           ? 'bg-purple-900/40 text-purple-400' :
                        user.role === 'verified_source' ? 'bg-amber-900/40 text-amber-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${user.trustScore}%` }} />
                        </div>
                        <span className="text-xs font-mono text-slate-300">{user.trustScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono ${user.banned ? 'text-red-400' : 'text-green-400'}`}>
                        {user.banned ? '● BANNED' : '● ACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateUser(user.id, { banned: !user.banned })}
                          className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                            user.banned
                              ? 'border-green-800 text-green-400 hover:bg-green-900/30'
                              : 'border-red-800 text-red-400 hover:bg-red-900/30'
                          }`}
                        >
                          {user.banned ? 'Unban' : 'Ban'}
                        </button>
                        {user.role !== 'verified_source' && user.role !== 'admin' && (
                          <button
                            onClick={() => updateUser(user.id, { role: 'verified_source' })}
                            className="text-xs font-mono px-2 py-1 rounded border border-amber-800 text-amber-400 hover:bg-amber-900/30 transition-colors"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
