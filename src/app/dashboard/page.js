'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MdSportsCricket, MdGroups, MdEmojiEvents, MdAdd,
} from 'react-icons/md';
import { FiActivity, FiArrowRight, FiPlus } from 'react-icons/fi';
import { GiCricketBat, GiTrophy } from 'react-icons/gi';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45 } }),
};

function StatusBadge({ status }) {
  const map = {
    live_innings1: { label: 'Live', cls: 'badge-live' },
    live_innings2: { label: 'Live', cls: 'badge-live' },
    completed: { label: 'Done', cls: 'badge-gray' },
    upcoming: { label: 'Soon', cls: 'badge-blue' },
    innings_break: { label: 'Break', cls: 'badge-amber' },
  };
  const cfg = map[status] || { label: status, cls: 'badge-gray' };
  return <span className={cfg.cls + ' badge'}>{cfg.label}</span>;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [supabase] = useState(() => createClient());
  const [stats, setStats] = useState({ teams: 0, matches: 0, live: 0, tournaments: 0 });
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboard();

    // Realtime subscription for live match count
    const channel = supabase
      .channel('live-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        loadDashboard();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const loadDashboard = async () => {
    const [
      { count: teamCount },
      { count: matchCount },
      { count: liveCount },
      { count: tournamentCount },
      { data: recent },
    ] = await Promise.all([
      supabase.from('teams').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('matches').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['live_innings1', 'live_innings2', 'innings_break']),
      supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('matches').select(`
        id, status, match_date, venue,
        innings1_score, innings1_wickets, innings1_overs,
        innings2_score, innings2_wickets, innings2_overs,
        result_text,
        team1:teams!matches_team1_id_fkey(id, name, short_name),
        team2:teams!matches_team2_id_fkey(id, name, short_name)
      `).eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    ]);

    setStats({
      teams: teamCount || 0,
      matches: matchCount || 0,
      live: liveCount || 0,
      tournaments: tournamentCount || 0,
    });
    setRecentMatches(recent || []);
    setLoading(false);
  };

  const statCards = [
    { label: 'Total Teams', value: stats.teams, icon: MdGroups, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/teams' },
    { label: 'Total Matches', value: stats.matches, icon: MdSportsCricket, color: 'text-cricket-400', bg: 'bg-cricket-500/10', href: '/matches' },
    { label: 'Live Now', value: stats.live, icon: FiActivity, color: 'text-red-400', bg: 'bg-red-500/10', href: '/matches?tab=live' },
    { label: 'Tournaments', value: stats.tournaments, icon: MdEmojiEvents, color: 'text-amber-400', bg: 'bg-amber-500/10', href: '/tournaments' },
  ];

  const quickActions = [
    { label: 'New Match', href: '/matches/create', icon: MdSportsCricket, color: 'bg-cricket-600 hover:bg-cricket-500' },
    { label: 'New Team', href: '/teams/create', icon: MdGroups, color: 'bg-blue-700 hover:bg-blue-600' },
    { label: 'New Tournament', href: '/tournaments/create', icon: GiTrophy, color: 'bg-amber-700 hover:bg-amber-600' },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold text-white">
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'Scorer'} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here&apos;s your cricket scoring overview</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, href }, i) => (
          <motion.div key={label} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
            <Link href={href} className="card-hover p-5 flex flex-col gap-3 block">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`${color} text-xl`} />
              </div>
              <div>
                <div className="text-2xl font-black text-white">
                  {loading ? <span className="skeleton w-10 h-7 block rounded" /> : value}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {quickActions.map(({ label, href, icon: Icon, color }) => (
            <Link
              key={label}
              href={href}
              className={`${color} flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 active:scale-95 shadow-lg`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Matches */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <div className="section-header">
          <h2 className="section-title">Recent Matches</h2>
          <Link href="/matches" className="text-sm text-cricket-400 hover:text-cricket-300 flex items-center gap-1 transition-colors">
            View all <FiArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-4 skeleton h-24" />
            ))}
          </div>
        ) : recentMatches.length === 0 ? (
          <div className="card p-12 text-center">
            <GiCricketBat className="text-5xl text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No matches yet. Start scoring!</p>
            <Link href="/matches/create" className="btn-primary inline-flex items-center gap-2">
              <FiPlus /> Create First Match
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentMatches.map((match, i) => (
              <motion.div key={match.id} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
                <Link href={`/matches/${match.id}`} className="card-hover p-4 flex flex-col gap-3 block">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      {match.venue || 'Unknown venue'} · {new Date(match.match_date).toLocaleDateString()}
                    </div>
                    <StatusBadge status={match.status} />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Team 1 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-200 truncate">
                        {match.team1?.name || match.team1_name}
                      </div>
                      {match.innings1_score !== null && (
                        <div className="score-display text-lg font-bold text-white">
                          {match.innings1_score}/{match.innings1_wickets}
                          <span className="text-slate-500 text-sm font-normal ml-1">
                            ({match.innings1_overs} ov)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-slate-600 text-xs font-bold">vs</div>

                    {/* Team 2 */}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-sm font-semibold text-slate-200 truncate">
                        {match.team2?.name || match.team2_name}
                      </div>
                      {match.innings2_score !== null && match.innings2_score > 0 && (
                        <div className="score-display text-lg font-bold text-white">
                          {match.innings2_score}/{match.innings2_wickets}
                          <span className="text-slate-500 text-sm font-normal ml-1">
                            ({match.innings2_overs} ov)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {match.result_text && (
                    <div className="text-xs text-cricket-400 font-medium border-t border-white/5 pt-2">
                      {match.result_text}
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
