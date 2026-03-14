'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { FiArrowLeft, FiPlus, FiTrophy, FiUsers, FiActivity } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = ['Matches', 'Points Table', 'Teams'];

export default function TournamentDashboard() {
  const { tournamentId } = useParams();
  const supabase = createClient();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('Points Table');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tournamentId]);

  const loadData = async () => {
    const { data: t } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
    if (!t) return;
    setTournament(t);

    const [pts, m, tm] = await Promise.all([
      supabase.from('points_table').select('*').eq('tournament_id', tournamentId).order('points', {ascending:false}).order('nrr', {ascending:false}),
      supabase.from('matches').select('*, team1:teams!matches_team1_id_fkey(name,short_name,logo_url), team2:teams!matches_team2_id_fkey(name,short_name,logo_url)').eq('tournament_id', tournamentId).order('match_date', {ascending:false}),
      supabase.from('tournament_teams').select('*, team:teams(*)').eq('tournament_id', tournamentId)
    ]);
    
    setPointsTable(pts.data || []);
    setMatches(m.data || []);
    setTeams(tm.data || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-cricket-500/30 border-t-cricket-500 rounded-full animate-spin" />
    </div>
  );

  if (!tournament) return <div className="text-center py-12 text-slate-500">Tournament not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card p-6 md:p-8 relative overflow-hidden group border-t-4 border-t-cricket-500">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-cricket-500/10 rounded-full blur-3xl group-hover:bg-cricket-500/20 transition-all duration-700" />
        
        <div className="flex flex-col md:flex-row gap-6 relative z-10">
          <Link href="/tournaments" className="w-10 h-10 shrink-0 rounded-xl bg-dark-200/50 hover:bg-dark-100 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <FiArrowLeft size={18} />
          </Link>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`badge ${tournament.status === 'live' ? 'badge-live' : 'badge-gray'}`}>
                {tournament.status.toUpperCase()}
              </span>
              <span className="text-xs font-mono bg-white/5 text-cricket-300 px-2 py-0.5 rounded uppercase">{tournament.format}</span>
              <span className="text-xs font-mono bg-white/5 text-slate-300 px-2 py-0.5 rounded uppercase">{tournament.tournament_type}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-100">{tournament.name}</h1>
            
            <div className="flex gap-6 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-slate-400">
                <FiUsers className="text-cricket-400" /> <span className="font-semibold text-slate-200">{teams.length}</span> Teams
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <FiActivity className="text-blue-400" /> <span className="font-semibold text-slate-200">{matches.length}</span> Matches
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0 md:w-48">
             {/* Quick Actions for tournament */}
             <Link href={`/matches/create?tournament=${tournamentId}`} className="btn-primary flex items-center justify-center gap-2 h-10 w-full">
              <FiPlus /> New Match
             </Link>
             <button className="btn-ghost flex items-center justify-center gap-2 h-10 w-full">
              <FiPlus /> Add Team
             </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap
            ${activeTab === tab ? 'bg-cricket-600/20 text-cricket-400 border border-cricket-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            
            {activeTab === 'Points Table' && (
              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-dark-300/50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr className="border-b border-white/5">
                      <th className="py-4 px-6">Team</th>
                      <th className="py-4 px-3 text-center">P</th>
                      <th className="py-4 px-3 text-center">W</th>
                      <th className="py-4 px-3 text-center">L</th>
                      <th className="py-4 px-3 text-center">T</th>
                      <th className="py-4 px-3 text-center">NR</th>
                      <th className="py-4 px-4 text-center text-cricket-400 font-bold">PTS</th>
                      <th className="py-4 px-4 text-center">NRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pointsTable.length === 0 ? (
                      <tr><td colSpan="8" className="py-8 text-center text-slate-500">No teams added to points table yet.</td></tr>
                    ) : (
                      pointsTable.map((pt, i) => (
                        <tr key={pt.id} className="hover:bg-white/3 transition-colors">
                          <td className="py-3 px-6 font-semibold text-slate-200 flex items-center gap-3">
                            <span className="text-slate-500 w-4 text-xs">{i+1}</span>
                            {pt.team_name}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">{pt.matches_played}</td>
                          <td className="py-3 px-3 text-center font-mono text-emerald-400">{pt.won}</td>
                          <td className="py-3 px-3 text-center font-mono text-red-400">{pt.lost}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">{pt.tied}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">{pt.no_result}</td>
                          <td className="py-3 px-4 text-center font-bold font-mono text-cricket-400 text-base">{pt.points}</td>
                          <td className="py-3 px-4 text-center font-mono text-amber-400 relative group cursor-help">
                            {Number(pt.nrr).toFixed(3)}
                            <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-dark-400 border border-white/10 rounded text-xs text-slate-400 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl">
                              For: {pt.for_runs}/{Number(pt.for_overs).toFixed(1)} <br/>
                              Agst: {pt.against_runs}/{Number(pt.against_overs).toFixed(1)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'Matches' && (
              <div className="space-y-4">
                {matches.length === 0 ? (
                   <div className="card p-12 text-center text-slate-500">No matches scheduled yet.</div>
                ) : matches.map(m => (
                  <Link key={m.id} href={`/matches/${m.id}`} className="card block hover:ring-1 ring-cricket-500 transition-all p-4">
                    <div className="flex justify-between items-center mb-3 text-xs">
                      <span className={`px-2 py-0.5 rounded font-mono ${m.status.includes('live') ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                        {m.status.toUpperCase().replace('_', ' ')}
                      </span>
                      <span className="text-slate-500">{new Date(m.match_date).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1 font-semibold text-slate-200 truncate">{m.team1_name || m.team1?.name}</div>
                      <div className="px-4 text-slate-600 font-bold text-xs">VS</div>
                      <div className="flex-1 font-semibold text-slate-200 text-right truncate">{m.team2_name || m.team2?.name}</div>
                    </div>
                    {m.result_text && (
                      <div className="mt-3 text-xs text-center font-semibold text-cricket-400 bg-cricket-500/10 py-1.5 rounded">
                        {m.result_text}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {activeTab === 'Teams' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.length === 0 ? (
                  <div className="col-span-full card p-12 text-center text-slate-500">No teams added yet.</div>
                ) : teams.map(t => (
                  <Link href={`/teams/${t.team_id}`} key={t.id} className="card p-4 flex items-center gap-4 hover:border-white/10 transition-colors">
                    {t.team?.logo_url ? (
                      <img src={t.team.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover bg-dark-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-dark-200 flex items-center justify-center text-xl font-bold" style={{color: t.team?.primary_color}}>
                        {t.team?.name?.[0] || 'T'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-200">{t.team?.name}</div>
                      <div className="text-xs text-slate-500">{t.group_name && `Group ${t.group_name}`}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
