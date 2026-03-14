'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FiBell, FiSearch } from 'react-icons/fi';

export default function DashboardTopBar() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="h-14 border-b border-white/5 bg-dark-300/50 backdrop-blur-sm flex items-center px-6 gap-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-xs hidden sm:flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5">
        <FiSearch className="text-slate-500 text-sm shrink-0" />
        <input
          placeholder="Search matches, teams..."
          className="bg-transparent text-sm text-slate-400 placeholder-slate-600 outline-none w-full"
        />
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <button className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors relative">
        <FiBell size={18} />
      </button>

      {/* Avatar */}
      <button
        onClick={signOut}
        title="Sign Out"
        className="w-8 h-8 rounded-full bg-cricket-600 flex items-center justify-center text-xs font-bold text-white hover:bg-cricket-500 transition-colors"
      >
        {initials}
      </button>
    </header>
  );
}
