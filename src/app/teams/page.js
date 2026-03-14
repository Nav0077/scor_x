'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiPlus, FiSearch, FiEdit2, FiUsers } from 'react-icons/fi';
import { MdGroups } from 'react-icons/md';
import { GiCricketBat } from 'react-icons/gi';

function TeamCard({ team, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card-hover p-5"
    >
      {/* Team color strip */}
      <div className="w-full h-1 rounded-full mb-4" style={{ background: team.primary_color || '#22c55e' }} />

      <div className="flex items-start gap-4">
        {/* Logo / Avatar */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0"
          style={{ background: team.primary_color || '#22c55e' }}
        >
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            (team.short_name || team.name?.slice(0, 2)).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-100 truncate">{team.name}</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{team.short_name}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
            <FiUsers size={11} />
            <span>{team.player_count || 0} players</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Link href={`/teams/${team.id}`} className="flex-1 btn-secondary py-1.5 text-xs text-center">
          View Team
        </Link>
        <Link href={`/teams/${team.id}/edit`} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
          <FiEdit2 size={14} />
        </Link>
      </div>
    </motion.div>
  );
}

export default function TeamsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadTeams();
  }, [user]);

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*, players(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setTeams(
      (data || []).map((t) => ({
        ...t,
        player_count: t.players?.[0]?.count || 0,
      }))
    );
    setLoading(false);
  };

  const filtered = teams.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.short_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="section-header">
        <div>
          <h1 className="section-title">My Teams</h1>
          <p className="text-slate-500 text-sm mt-1">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/teams/create" className="btn-primary inline-flex items-center gap-2 text-sm">
          <FiPlus /> New Team
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams..."
          className="input pl-9 text-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-40 skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <MdGroups className="text-6xl text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">{search ? 'No teams match your search.' : 'No teams yet.'}</p>
          {!search && (
            <Link href="/teams/create" className="btn-primary inline-flex items-center gap-2 mt-2">
              <FiPlus /> Create First Team
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((team, i) => (
            <TeamCard key={team.id} team={team} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
