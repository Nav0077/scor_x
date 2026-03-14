'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScoreboardOverlayPage() {
  const { matchId } = useParams();
  const searchParams = useSearchParams();
  const theme = searchParams.get('theme') || 'modern';
  const [supabase] = useState(() => createClient());

  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState(null);
  const [batsmen, setBatsmen] = useState([]);
  const [bowler, setBowler] = useState(null);
  const [lastBall, setLastBall] = useState(null);
  const [event, setEvent] = useState(null);

  // Playing XI Mode States
  const [playing11Team, setPlaying11Team] = useState(null);
  const [playing11Players, setPlaying11Players] = useState([]);

  useEffect(() => {
    loadData();

    // Real-time subscriptions for Streamlabs overlay
    const channel = supabase
      .channel(`scoreboard-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        () => loadData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'innings', filter: `match_id=eq.${matchId}` },
        () => loadData()
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balls', filter: `match_id=eq.${matchId}` },
        (payload) => {
          if (payload.new) {
             const b = payload.new;
             if (b.is_six) triggerEvent('SIX');
             else if (b.is_boundary) triggerEvent('FOUR');
             else if (b.is_wicket) triggerEvent('WICKET');
          }
          // We don't fetch data here because innings/matches updates will fire alongside this and fetch data
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batting_scorecard', filter: `match_id=eq.${matchId}` },
        () => loadBattingBowling()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bowling_scorecard', filter: `match_id=eq.${matchId}` },
        () => loadBattingBowling()
      )
      .on('broadcast', { event: 'SHOW_PLAYING_11' }, async (payload) => {
        const teamId = payload.payload.teamId;
        if (teamId === 'HIDE') {
          setPlaying11Team(null);
          setPlaying11Players([]);
          return;
        }
        
        // Fetch team & players details
        const { data: teamData } = await supabase.from('teams').select('*').eq('id', teamId).single();
        const { data: playersData } = await supabase.from('players').select('*').eq('team_id', teamId).order('id');
        
        setPlaying11Team(teamData);
        setPlaying11Players(playersData || []);
        
        // Auto-hide after 25 seconds
        setTimeout(() => setPlaying11Team(null), 25000);
      })
      .subscribe((status) => {
         console.log('Realtime connected:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase]);

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
    setTimeout(() => setEvent(null), 4000);
  };

  if (!match || !innings) return null;

  const striker    = batsmen.find(b => b.is_striker);
  const nonStriker = batsmen.find(b => b.is_non_striker);
  const target     = innings.target;
  const score      = innings.total_score || 0;
  const wickets    = innings.total_wickets || 0;
  const overs      = innings.total_overs || 0;
  const crr        = innings.total_overs && parseFloat(innings.total_overs) > 0
    ? ((score / parseFloat(innings.total_overs))).toFixed(2) : '0.00';

  const battingTeam = match.team1_id === innings.batting_team_id ? match.team1 : match.team2;
  const bowlingTeam = match.team1_id === innings.bowling_team_id ? match.team1 : match.team2;

  // Calculate required
  const ballsLeft = Math.max(0, (match.overs * 6) - (Math.floor(parseFloat(overs)) * 6 + Math.round((parseFloat(overs) % 1) * 10)));
  const runsNeeded = target ? Math.max(0, target - score) : null;

  return (
    <div className="obs-overlay min-h-screen relative select-none overflow-hidden">
      {/* ── Force Body Transparency for Streamlabs/OBS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        body, html { background: transparent !important; }
        .clip-left { clip-path: polygon(0 0, 92% 0, 100% 100%, 0 100%); }
        .clip-right { clip-path: polygon(8% 0, 100% 0, 100% 100%, 0 100%); }
        .shadow-tv { box-shadow: 0 15px 35px rgba(0,0,0,0.5); }
      `}} />

      {/* ── Event Flash ── */}
      <AnimatePresence>
        {event && (
          <motion.div
            initial={{ opacity: 0, scale: 0.2, y: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, y: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed inset-0 flex items-center justify-center top-[-100px] z-50 pointer-events-none"
          >
            {/* 3D Shield Background similar to user image */}
            <div className="relative flex items-center justify-center w-[400px] h-[300px]">
              <div className="absolute inset-0 bg-white/90 backdrop-blur-md" style={{ clipPath: 'polygon(50% 100%, 0 75%, 0 0, 100% 0, 100% 75%)' }} />
              <div className="text-6xl sm:text-8xl font-black tracking-widest drop-shadow-2xl uppercase relative z-10 
                  text-blue-600 [text-shadow:0_10px_0_#1e3a8a,-2px_-2px_0_#60a5fa,2px_2px_0_#60a5fa]" 
                  style={{ WebkitTextStroke: '2px white' }}>
                {event}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Scoreboard Bar (TV Style Theme) ── */}
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        className="fixed bottom-2 sm:bottom-10 left-1/2 w-[1100px] -ml-[550px] shadow-tv text-slate-800 font-sans z-40 rounded-xl pointer-events-auto origin-bottom scale-[0.3] min-[400px]:scale-[0.35] sm:scale-[0.5] md:scale-75 lg:scale-90 xl:scale-100"
      >
        <div className="flex items-stretch h-20 bg-gradient-to-b from-slate-100 to-slate-300 rounded-lg overflow-hidden border border-white/40 shadow-inner">
          
          {/* LEFT: Batting Team */}
          <div className="flex-shrink-0 w-48 bg-gradient-to-b from-blue-500 to-blue-800 flex items-center px-4 clip-left z-10">
            <div className="flex items-center gap-3">
              {battingTeam?.logo_url ? (
                 <img src={battingTeam.logo_url} className="w-10 h-10 rounded-full border-2 border-white/80 bg-white shadow-lg" alt="logo" />
              ) : (
                 <div className="w-10 h-10 rounded-full bg-blue-900 border-2 border-white/50 flex items-center justify-center text-white font-bold text-xs ring-offset-blue-800 ring-2 ring-white/20 shadow-lg">
                    {battingTeam?.short_name?.charAt(0) || 'B'}
                 </div>
              )}
              <span className="text-white text-3xl font-black tracking-widest uppercase shadow-black/50 drop-shadow-md">
                {battingTeam?.short_name || 'IND'}
              </span>
            </div>
          </div>

          {/* MIDDLE LEFT: Batsmen Stats & Match Info */}
          <div className="flex-1 flex flex-col justify-center px-4">
            <div className="flex justify-between items-center text-[15px] font-semibold text-slate-700">
               <div className="flex gap-2">
                 <span className="w-40 truncate">{striker?.player_name||'Striker'}*</span>
                 <span className="text-slate-900 font-bold w-16 text-right">
                   {striker?.runs_scored||0} <span className="font-normal text-slate-500">({striker?.balls_faced||0})</span>
                 </span>
               </div>
               {target && <div className="text-red-700 mr-12 tracking-wide text-sm font-bold">Target {target} <span className="text-slate-500 font-normal">({match.overs * 6})</span></div>}
            </div>
            <div className="flex justify-between items-center text-[15px] font-semibold text-slate-500">
               <div className="flex gap-2">
                 <span className="w-40 truncate">{nonStriker?.player_name||'Non-Striker'}</span>
                 <span className="text-slate-700 w-16 text-right">
                   {nonStriker?.runs_scored||0} <span className="font-normal text-slate-400">({nonStriker?.balls_faced||0})</span>
                 </span>
               </div>
               <div className="mr-12 tracking-wide text-sm">CUR RR <span className="font-bold text-slate-700">{crr}</span></div>
            </div>
          </div>

          {/* CENTER: Raised Score Block */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-[260px] z-20">
            <div className="bg-gradient-to-b from-slate-50 to-slate-200 rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.5)] border border-white/80 overflow-hidden backdrop-blur-md">
              <div className="flex justify-center items-center divide-x divide-slate-300/60 py-1.5 px-2">
                 <div className="px-5 text-[42px] font-black text-blue-700 tracking-tighter leading-none drop-shadow-sm">
                   {score}<span className="text-[34px] text-blue-600">-{wickets}</span>
                 </div>
                 <div className="px-5 text-3xl font-black text-slate-600 leading-none drop-shadow-sm">
                   {overs}
                 </div>
              </div>
              {target && (
                <div className="bg-gradient-to-b from-slate-200 to-slate-300 py-1 text-center text-[13px] text-slate-700 font-medium border-t border-white/50">
                   Required <b className="text-slate-900 text-[14px]">{runsNeeded}</b> runs in <b className="text-slate-900 text-[14px]">{ballsLeft}</b> balls
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE RIGHT: Bowler & Over Balls */}
          <div className="flex-1 flex flex-col justify-center px-4 items-end pl-[140px]">
             <div className="flex gap-4 items-center text-[15px] font-semibold text-slate-700 w-full justify-between">
                <span className="text-red-700 w-32 truncate font-bold text-left uppercase tracking-wider">{bowler?.player_name||'Bowler'}</span>
                <span className="text-slate-900 font-bold ml-auto text-right">
                  {bowler?.wickets_taken||0}-{bowler?.runs_conceded||0} <span className="font-normal text-slate-500">({bowler?.economy_rate||'0.00'})</span>
                </span>
             </div>
             <div className="flex gap-4 items-center text-sm font-bold text-slate-700 w-full justify-between mt-0.5 tracking-widest">
                <span className="text-slate-500 text-xs uppercase tracking-widest font-bold">Total Ov</span>
                <div className="flex gap-1 justify-end font-mono text-[14px]">
                   {bowler?.overs_bowled || '0.0'}
                </div>
             </div>
          </div>

          {/* RIGHT: Bowling Team */}
          <div className="flex-shrink-0 w-48 bg-gradient-to-b from-green-700 to-green-900 flex items-center justify-end px-4 clip-right z-10 text-right">
            <div className="flex items-center gap-3">
              <span className="text-white text-3xl font-black tracking-widest uppercase shadow-black/50 drop-shadow-md">
                {bowlingTeam?.short_name || 'PAK'}
              </span>
              {bowlingTeam?.logo_url ? (
                 <img src={bowlingTeam.logo_url} className="w-10 h-10 rounded-full border-2 border-white/80 bg-white shadow-lg object-contain p-0.5" alt="logo" />
              ) : (
                 <div className="w-10 h-10 rounded-full bg-green-900 border-2 border-white/50 flex items-center justify-center text-white font-bold text-xs ring-offset-green-800 ring-2 ring-white/20 shadow-lg">
                    {bowlingTeam?.short_name?.charAt(0) || 'B'}
                 </div>
              )}
            </div>
          </div>

        </div>
      </motion.div>

      {/* ── PLAYING 11 OVERLAY (Full Screen TV Graphic) ── */}
      <AnimatePresence>
        {playing11Team && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50, transition: { duration: 0.5 } }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-16 top-16 bottom-36 w-[450px] shadow-[0_15px_40px_rgba(0,0,0,0.6)] rounded-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header / Team Intro */}
            <div className="flex-none bg-gradient-to-br from-blue-700 to-blue-900 h-28 flex items-center px-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-12 -translate-y-24" />
               <div className="flex items-center gap-5 relative z-10 w-full">
                  {playing11Team.logo_url && (
                     <img src={playing11Team.logo_url} alt="Logo" className="w-16 h-16 rounded-full border-2 border-white/80 shadow-md bg-white object-contain p-1" />
                  )}
                  <div>
                    <h2 className="text-white text-3xl font-black uppercase tracking-wider drop-shadow-md leading-none mb-1">{playing11Team.short_name || 'TEAM'}</h2>
                    <h3 className="text-blue-200 text-sm font-bold uppercase tracking-widest leading-none">Playing XI</h3>
                  </div>
               </div>
            </div>

            {/* Players List */}
            <div className="flex-1 bg-gradient-to-b from-slate-100 to-slate-300 p-0 flex flex-col justify-start">
               {playing11Players.map((player, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (idx * 0.05), duration: 0.4 }}
                    key={player.id} 
                    className="flex items-center border-b border-white/50 px-6 py-2.5 odd:bg-slate-200/40"
                  >
                     <div className="text-slate-400 font-bold w-6">{idx + 1}</div>
                     <div className="text-slate-800 font-bold text-[17px] uppercase tracking-wide flex-1 mr-2">{player.name}</div>
                     {player.role && (
                       <span className="text-[10px] uppercase tracking-widest font-black bg-blue-600/10 text-blue-700 px-2.5 py-1 rounded-sm border border-blue-600/20">
                         {player.role.includes('Wicket') ? 'WK' : player.role.includes('All') ? 'AR' : player.role.includes('Bowler') ? 'BOWL' : 'BAT'}
                       </span>
                     )}
                  </motion.div>
               ))}
            </div>
            {/* Footer Branding bg */}
            <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 flex-none" />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
