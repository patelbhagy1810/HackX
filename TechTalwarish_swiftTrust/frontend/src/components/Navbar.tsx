import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Map, FileText, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const handleLogout = () => { logout(); navigate('/auth'); };

  const links = [
    { to: '/',       label: 'Live Map',  Icon: Map      },
    { to: '/report', label: 'Report',    Icon: FileText },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', Icon: Settings }] : []),
  ];

  return (
    <nav className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 z-50">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-black" />
        </div>
        <span className="font-bold text-white text-sm tracking-tight">
          Swift<span className="text-amber-500">Trust</span>
        </span>
        <span className="hidden md:block font-mono text-xs text-amber-500/50 border border-amber-500/20 px-1.5 py-0.5 rounded">v2.0</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {links.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors
              ${location.pathname === to
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden md:block uppercase tracking-wider">{label}</span>
          </Link>
        ))}
      </div>

      {/* User section */}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-mono text-white">{user?.username}</span>
              <span className={`text-xs font-mono ${user?.role === 'admin' ? 'text-purple-400' : user?.role === 'verified_source' ? 'text-amber-400' : 'text-slate-500'}`}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <Link to="/auth" className="text-xs font-mono bg-amber-500 text-black font-bold px-3 py-1.5 rounded-lg hover:bg-amber-400 transition-colors uppercase tracking-wider">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
