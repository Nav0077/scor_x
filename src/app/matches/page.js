'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiPlus, FiSearch, FiTarget } from 'react-icons/fi';
import { MdSportsCricket } from 'react-icons/md';

const TABS = ['All', 'Live', 'Completed', 'Upcoming'];
const STATUS_FILTERS = {
  All: null,
  Live: ['live_innings1', 'live_innings2', 'innings_break'],
  Completed: ['completed'],
  Upcoming: ['upcoming', 'toss'],
};

function MatchCard({ match }) {
  const isLive = ['live_innings1', 'live_innings2', 'innings_break'].includes(match.status);
  const isCompleted = match.status === 'completed';

  return (
    <Link href={`/matches/${match.id}${isLive ? '/score' : ''}`} className="card-hover p-4 block">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">{new Date(match.match_date).toLocaleDateString()} · {match.venue || 'Unknown venue'}</span>
        <div className="flex items-center gap-2">
          {isLive && <span className="flex items-center gap-1 badge badge-live"><span className="live-dot" /> LIVE</span>}
          {isCompleted && <span className="badge badge-gray">Done</span>}
          {!isLive && !isCompleted && <span className="badge badge-blue">Upcoming</span>}
          <span className="text-xs text-slate-600">{match.overs} ov</span>
        </div>
      </div>

      <div className="flex items-stretch justify-between gap-3">
        {/* Team 1 */}
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-200">{match.team1?.name || match.team1_name}</div>
          {match.innings1_batting_team === match.team1_id && match.innings1_score != null ? (
            <div className="score-display text-2xl font-black text-white">
              {match.innings1_score}/{match.innings1_wickets}
              <span className="text-slate-500 text-sm font-normal ml-1">({match.innings1_overs} ov)</span>
            </div>
          ) : match.innings2_batting_team === match.team1_id && match.innings2_score != null ? (
            <div className="score-display text-2xl font-black text-white">
              {match.innings2_score}/{match.innings2_wickets}
              <span className="text-slate-500 text-sm font-normal ml-1">({match.innings2_overs} ov)</span>
            </div>
          ) : <div className="text-slate-600 text-sm mt-1">Yet to bat</div>}
        </div>

        <div className="flex items-center text-slate-600 text-xs font-bold">vs</div>

        {/* Team 2 */}
        <div className="flex-1 text-right">
          <div className="text-sm font-semibold text-slate-200">{match.team2?.name || match.team2_name}</div>
          {match.innings1_batting_team === match.team2_id && match.innings1_score != null ? (
            <div className="score-display text-2xl font-black text-white">
              {match.innings1_score}/{match.innings1_wickets}
              <span className="text-slate-500 text-sm font-normal ml-1">({match.innings1_overs} ov)</span>
            </div>
          ) : match.innings2_batting_team === match.team2_id && match.innings2_score != null ? (
            <div className="score-display text-2xl font-black text-white">
              {match.innings2_score}/{match.innings2_wickets}
              <span className="text-slate-500 text-sm font-normal ml-1">({match.innings2_overs} ov)</span>
            </div>
          ) : <div className="text-slate-600 text-sm mt-1">Yet to bat</div>}
        </div>
      </div>

      {match.result_text && (
        <div className="text-xs text-cricket-400 font-medium mt-3 border-t border-white/5 pt-2">
          {match.result_text}
        </div>
      )}

      {isLive && (
        <div className="mt-3 btn-primary text-xs text-center py-1.5 rounded-lg">Score This Match →</div>
      )}
    </Link>
  );
}

export default function MatchesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadMatches();
  }, [user]);

  const loadMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select(`
        id, status, match_date, venue, overs,
        team1_id, team2_id, team1_name, team2_name,
        innings1_batting_team, innings1_score, innings1_wickets, innings1_overs,
        innings2_batting_team, innings2_score, innings2_wickets, innings2_overs,
        result_text,
        team1:teams!matches_team1_id_fkey(id, name, short_name),
        team2:teams!matches_team2_id_fkey(id, name, short_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setMatches(data || []);
    setLoading(false);
  };

  const filtered = matches.filter(m => {
    const statusFilter = STATUS_FILTERS[activeTab];
    const matchesStatus = !statusFilter || statusFilter.includes(m.status);
    const matchesSearch = !search ||
      (m.team1?.name || m.team1_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.team2?.name || m.team2_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.venue || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="section-header">
        <div>
          <h1 className="section-title">Matches</h1>
          <p className="text-slate-500 text-sm mt-1">{matches.length} match{matches.length !== 1 ? 'es' : ''}</p>
        </div>
        <Link href="/matches/create" className="btn-primary inline-flex items-center gap-2 text-sm">
          <FiPlus /> New Match
        </Link>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search matches..." className="input pl-9 text-sm w-56" />
        </div>
        <div className="flex gap-1 bg-dark-100/50 rounded-lg p-1 border border-white/5">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors
                ${activeTab === tab ? 'bg-cricket-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card h-28 skeleton" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <MdSportsCricket className="text-6xl text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No matches found.</p>
          <Link href="/matches/create" className="btn-primary inline-flex items-center gap-2">
            <FiPlus /> Create Match
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((match, i) => (
            <motion.div key={match.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <MatchCard match={match} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
