'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { FiPlus, FiSearch, FiTrophy } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function TournamentsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) loadTournaments();
  }, [user]);

  const loadTournaments = async () => {
    const { data } = await supabase.from('tournaments')
      .select('*, points_table(count), matches(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTournaments(data || []);
    setLoading(false);
  };

  const filtered = tournaments.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Tournaments</h1>
          <p className="text-slate-500 text-sm mt-1">Organize and manage cricket series and leagues</p>
        </div>
        <Link href="/tournaments/create" className="btn-primary flex items-center gap-2 w-fit">
          <FiPlus size={18} /> New Tournament
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search tournaments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10 bg-dark-200/50"
        />
      </div>

      {/* Tournament Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse h-40">
              <div className="h-4 bg-white/5 rounded w-1/2 mb-4" />
              <div className="h-3 bg-white/5 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-cricket-500/10 flex items-center justify-center text-cricket-500">
            <FiTrophy size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">No tournaments found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Create a tournament to manage multiple matches, points tables, and teams in one place.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t, idx) => (
            <motion.div key={t.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: idx*0.05 }}>
              <Link href={`/tournaments/${t.id}`} className="card card-hover p-5 block h-full group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border
                    ${t.status === 'live' ? 'bg-cricket-500/20 border-cricket-500/30 text-cricket-400' : 
                      t.status === 'completed' ? 'bg-slate-800 border-white/10 text-slate-400' :
                      'bg-blue-500/20 border-blue-500/30 text-blue-400'}`}>
                    <FiTrophy size={20} />
                  </div>
                  <span className={`badge ${t.status === 'live' ? 'badge-live' : t.status === 'completed' ? 'badge-gray' : 'badge-blue'}`}>
                    {t.status === 'live' && <span className="live-dot mr-1" />}
                    {t.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-200 group-hover:text-cricket-400 transition-colors line-clamp-1">
                  {t.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 font-mono uppercase tracking-wider">
                  <span className="bg-white/5 px-2 py-0.5 rounded">{t.format}</span>
                  <span>•</span>
                  <span>{t.tournament_type}</span>
                </div>
                
                <div className="flex border-t border-white/5 mt-4 pt-4 text-sm text-slate-400">
                  <div className="flex-1 text-center border-r border-white/5">
                    <div className="font-bold text-white">{t.points_table[0].count}</div>
                    <div className="text-xs">Teams</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="font-bold text-white">{t.matches[0].count}</div>
                    <div className="text-xs">Matches</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
