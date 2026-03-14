'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { GiCricketBat } from 'react-icons/gi';

const ROLE_COLORS = {
  Batsman: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  Bowler: 'text-cricket-400 bg-cricket-500/10 border-cricket-500/30',
  'All-Rounder': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  'Wicket Keeper': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTeam(); }, [teamId]);

  const loadTeam = async () => {
    const [{ data: teamData }, { data: playerData }] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('players').select('*').eq('team_id', teamId).order('batting_style'),
    ]);
    setTeam(teamData);
    setPlayers(playerData || []);
    setLoading(false);
  };

  const deletePlayer = async (playerId) => {
    if (!confirm('Remove this player?')) return;
    await supabase.from('players').delete().eq('id', playerId);
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-cricket-500/30 border-t-cricket-500 rounded-full animate-spin" /></div>;
  }

  if (!team) return <div className="text-slate-400 text-center py-12">Team not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/teams" className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
          <FiArrowLeft />
        </Link>
      </div>

      {/* Team header card */}
      <div className="card p-6">
        <div className="h-2 rounded-full mb-6" style={{ background: `linear-gradient(90deg, ${team.primary_color}, ${team.secondary_color})` }} />
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl overflow-hidden shrink-0"
            style={{ background: team.primary_color }}
          >
            {team.logo_url ? <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" /> : team.short_name}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{team.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-gray font-mono">{team.short_name}</span>
              <span className="text-slate-500 text-sm">{players.length} players</span>
            </div>
          </div>
          <Link href={`/teams/${teamId}/edit`} className="btn-ghost text-sm flex items-center gap-1">
            <FiEdit2 size={14} /> Edit
          </Link>
        </div>
      </div>

      {/* Players */}
      <div>
        <div className="section-header">
          <h2 className="section-title">Players ({players.length})</h2>
          <Link href={`/teams/${teamId}/players/add`} className="btn-primary text-sm inline-flex items-center gap-2">
            <FiPlus /> Add Player
          </Link>
        </div>

        {players.length === 0 ? (
          <div className="card p-12 text-center">
            <GiCricketBat className="text-5xl text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">No players yet. Add your first player!</p>
            <Link href={`/teams/${teamId}/players/add`} className="btn-primary inline-flex items-center gap-2">
              <FiPlus /> Add Player
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {players.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-hover p-4 flex items-center gap-4"
              >
                {/* Photo/Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden"
                  style={{ background: team.primary_color }}
                >
                  {player.photo_url ? (
                    <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    player.name?.slice(0, 2).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100 truncate">{player.name}</span>
                    {player.is_captain && <span className="text-xs text-amber-400">(C)</span>}
                    {player.is_wk && <span className="text-xs text-blue-400">(WK)</span>}
                  </div>
                  <span className={`badge text-xs mt-1 border ${ROLE_COLORS[player.role] || 'badge-gray'}`}>
                    {player.role}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {player.jersey_number && (
                    <span className="text-xs text-slate-500 font-mono">#{player.jersey_number}</span>
                  )}
                  <button
                    onClick={() => deletePlayer(player.id)}
                    className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
