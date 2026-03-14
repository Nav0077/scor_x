'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScoreboardOverlayPage() {
  const { matchId } = useParams();
  const searchParams = useSearchParams();
  const theme = searchParams.get('theme') || 'modern';
  const supabase = createClient();

  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState(null);
  const [batsmen, setBatsmen] = useState([]);
  const [bowler, setBowler] = useState(null);
  const [lastBall, setLastBall] = useState(null);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    loadData();

    // Real-time subscriptions
    const channel = supabase
      .channel(`scoreboard-${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => setMatch(prev => ({ ...prev, ...payload.new }))
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'innings', filter: `match_id=eq.${matchId}` },
        (payload) => setInnings(prev => ({ ...prev, ...payload.new }))
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balls', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setLastBall(payload.new);
          const b = payload.new;
          if (b.is_six) triggerEvent('SIX');
          else if (b.is_boundary) triggerEvent('FOUR');
          else if (b.is_wicket) triggerEvent('WICKET');
          // Refresh batting/bowling data
          loadBattingBowling();
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'batting_scorecard', filter: `match_id=eq.${matchId}` },
        () => loadBattingBowling()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [matchId]);

  const loadData = async () => {
    const { data: m } = await supabase.from('matches').select(`
      *, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)
    `).eq('id', matchId).single();
    setMatch(m);

    const inningsNum = m?.current_innings || 1;
    const { data: i } = await supabase.from('innings').select('*')
      .eq('match_id', matchId).eq('innings_number', inningsNum).single();
    setInnings(i);

    await loadBattingBowling();
  };

  const loadBattingBowling = async () => {
    const { data: bsc } = await supabase.from('batting_scorecard').select('*, player:players(name)')
      .eq('match_id', matchId).or('is_striker.eq.true,is_non_striker.eq.true');
    setBatsmen(bsc || []);

    const { data: bwl } = await supabase.from('bowling_scorecard').select('*, player:players(name)')
      .eq('match_id', matchId).eq('is_current_bowler', true).single();
    setBowler(bwl);
  };

  const triggerEvent = (ev) => {
    setEvent(ev);
    setTimeout(() => setEvent(null), 3000);
  };

  if (!match) return null;

  const striker    = batsmen.find(b => b.is_striker);
  const nonStriker = batsmen.find(b => b.is_non_striker);
  const target     = innings?.target;
  const score      = innings?.total_score || 0;
  const wickets    = innings?.total_wickets || 0;
  const overs      = innings?.total_overs || 0;
  const crr        = innings?.total_overs && parseFloat(innings.total_overs) > 0
    ? ((score / parseFloat(innings.total_overs))).toFixed(2) : '0.00';

  const battingTeam = match.innings1_batting_team === match.team1_id ? match.team1 : match.team2;

  return (
    <div className="obs-overlay min-h-screen relative select-none">
      {/* ── Event Flash ── */}
      <AnimatePresence>
        {event && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, y: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className={`text-8xl font-black tracking-widest drop-shadow-2xl
              ${event === 'SIX' ? 'text-purple-400 [text-shadow:0_0_40px_#a855f7,0_0_80px_#a855f7]' :
                event === 'FOUR' ? 'text-blue-400 [text-shadow:0_0_40px_#3b82f6,0_0_80px_#3b82f6]' :
                'text-red-400 [text-shadow:0_0_40px_#ef4444,0_0_80px_#ef4444]'}`}
            >
              {event}!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Scoreboard Bar ── */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 z-40"
      >
        {/* Modern Theme */}
        {theme === 'modern' && (
          <div className="bg-gradient-to-r from-dark-400/95 to-dark-300/95 backdrop-blur-md border-t border-white/10">
            <div className="flex items-stretch">
              {/* Team name + score */}
              <div className="flex items-center gap-4 px-5 py-3 bg-cricket-600/20 border-r border-white/10">
                {battingTeam?.logo_url && (
                  <img src={battingTeam.logo_url} className="w-8 h-8 rounded" alt="logo" />
                )}
                <div>
                  <div className="text-xs text-slate-400 font-medium">{battingTeam?.short_name || 'TEAM'}</div>
                  <div className="score-display text-2xl font-black text-white leading-none">
                    {score}/{wickets}
                  </div>
                </div>
                <div className="text-slate-400 text-sm font-mono">({overs} ov)</div>
              </div>

              {/* CRR + Target */}
              <div className="flex items-center gap-6 px-5">
                <div className="text-center">
                  <div className="text-xs text-slate-500">CRR</div>
                  <div className="text-lg font-bold text-cricket-400">{crr}</div>
                </div>
                {target && (
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Need</div>
                    <div className="text-lg font-bold text-amber-400">
                      {Math.max(0, target - score)} off {Math.max(0, (match.overs * 6) - (
                        Math.floor(parseFloat(overs)) * 6 + Math.round((parseFloat(overs) % 1) * 10)
                      ))}b
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px bg-white/5" />

              {/* Batsmen */}
              <div className="flex items-center gap-4 px-5">
                {striker && (
                  <div>
                    <div className="text-xs text-cricket-400 font-semibold">{striker.player_name}* <span className="text-slate-400 font-mono">{striker.runs_scored}({striker.balls_faced})</span></div>
                  </div>
                )}
                {nonStriker && (
                  <div>
                    <div className="text-xs text-slate-400">{nonStriker.player_name} <span className="font-mono">{nonStriker.runs_scored}({nonStriker.balls_faced})</span></div>
                  </div>
                )}
              </div>

              <div className="w-px bg-white/5 ml-auto" />

              {/* Bowler */}
              {bowler && (
                <div className="flex items-center px-5">
                  <div>
                    <div className="text-xs text-slate-500">Bowling</div>
                    <div className="text-xs text-slate-300 font-semibold">
                      {bowler.player_name} <span className="font-mono text-slate-400">{bowler.overs_bowled}-{bowler.maidens}-{bowler.runs_conceded}-{bowler.wickets_taken}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ScorX branding strip */}
            <div className="h-0.5 bg-gradient-to-r from-cricket-600 via-cricket-400 to-cricket-600" />
          </div>
        )}

        {/* Minimal Theme */}
        {theme === 'minimal' && (
          <div className="bg-black/80 backdrop-blur-sm border-t border-white/5 px-6 py-2 flex items-center gap-6">
            <span className="text-sm font-mono text-white">{battingTeam?.name}</span>
            <span className="score-display text-xl font-black text-white">{score}/{wickets}</span>
            <span className="text-sm text-slate-400 font-mono">({overs} ov)</span>
            {target && <span className="text-sm text-amber-400">Need {Math.max(0, target-score)}</span>}
            <div className="flex-1" />
            {striker && <span className="text-xs text-slate-300">{striker.player_name}* {striker.runs_scored}</span>}
            {nonStriker && <span className="text-xs text-slate-400">{nonStriker.player_name} {nonStriker.runs_scored}</span>}
          </div>
        )}

        {/* Classic Theme */}
        {theme === 'classic' && (
          <div className="bg-navy-900/95 border-t-4 border-cricket-500">
            <div className="flex items-center bg-cricket-700 px-6 py-1">
              <span className="text-xs text-white/80 font-semibold tracking-wider uppercase">LIVE</span>
              <div className="w-2 h-2 rounded-full bg-white ml-2 animate-pulse" />
              <div className="flex-1" />
              <span className="text-xs text-white/60">ScorX LIVE</span>
            </div>
            <div className="bg-dark-400/95 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="score-display text-3xl font-black text-white">{score}/{wickets}</div>
                <div className="text-slate-400 font-mono">({overs} ov)</div>
                {target && <div className="text-amber-400 font-semibold">Target: {target} · Need {Math.max(0,target-score)}</div>}
              </div>
              <div className="flex gap-6 text-sm">
                {striker && (
                  <div className="text-right">
                    <div className="text-cricket-300 font-bold">{striker.player_name}*</div>
                    <div className="text-slate-400 font-mono text-xs">{striker.runs_scored} ({striker.balls_faced}) SR: {striker.balls_faced > 0 ? ((striker.runs_scored/striker.balls_faced)*100).toFixed(0) : 0}</div>
                  </div>
                )}
                {bowler && (
                  <div className="text-right border-l border-white/10 pl-6">
                    <div className="text-slate-300 font-bold">{bowler.player_name}</div>
                    <div className="text-slate-400 font-mono text-xs">{bowler.overs_bowled}-{bowler.maidens}-{bowler.runs_conceded}-{bowler.wickets_taken}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
