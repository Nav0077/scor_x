'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

const BallChip = ({ val }) => {
  const cls =
    val === 'W' ? 'bg-red-600 border-red-500' :
    val === '4' ? 'bg-blue-600 border-blue-400' :
    val === '6' ? 'bg-purple-600 border-purple-400' :
    val?.includes('Wd') ? 'bg-yellow-600 border-yellow-400' :
    val?.includes('Nb') ? 'bg-orange-600 border-orange-400' :
    val === '•' ? 'bg-slate-300 border-slate-400' :
    'bg-slate-600 border-slate-500';
  
  return (
    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-[10px] font-black shadow-lg ${cls}`}>
      {val}
    </div>
  );
};

export default function ScoreboardOverlayPage() {
  const { matchId } = useParams();
  const searchParams = useSearchParams();
  const theme = searchParams.get('theme') || 'modern';
  const [supabase] = useState(() => createClient());

  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState(null);
  const [batsmen, setBatsmen] = useState([]);
  const [bowler, setBowler] = useState(null);
  const [currentOver, setCurrentOver] = useState([]);
  const [event, setEvent] = useState(null);
  
  // State for other broadcasts
  const [matchInfoVisible, setMatchInfoVisible] = useState(false);
  const [playing11Team, setPlaying11Team] = useState(null);
  const [playing11Players, setPlaying11Players] = useState([]);
  const [visibility, setVisibility] = useState({ batsmen: true, score: true, bowler: true });

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
          setMatchInfoVisible(false);
          return;
        }
        
        const { data: teamData } = await supabase.from('teams').select('*').eq('id', teamId).single();
        const { data: playersData } = await supabase.from('players').select('*').eq('team_id', teamId).order('id');
        
        setPlaying11Team(teamData);
        setPlaying11Players(playersData || []);
        setTimeout(() => setPlaying11Team(null), 25000);
      })
      .on('broadcast', { event: 'SHOW_MATCH_INFO' }, (payload) => {
        if (payload.payload.show === 'HIDE') {
           setMatchInfoVisible(false);
        } else {
           setMatchInfoVisible(true);
           setTimeout(() => setMatchInfoVisible(false), 20000);
        }
      })
      .on('broadcast', { event: 'TOGGLE_VISIBILITY' }, (payload) => {
        const { element, visible } = payload.payload;
        if (element === 'all') {
          setVisibility({ batsmen: visible, score: visible, bowler: visible });
        } else {
          setVisibility(prev => ({ ...prev, [element]: visible }));
        }
      })
      .on('broadcast', { event: 'SCORE_UPDATE' }, (payload) => {
        const data = payload.payload;
        
        // Update Innings state instantly from broadcast
        setInnings(prev => ({
           ...prev,
           total_score: data.score,
           total_wickets: data.wickets,
           total_overs: String(data.overs),
           total_extras: data.extras
        }));
        
        // Update current over dots
        if (data.currentOver) setCurrentOver(data.currentOver);
        
        // Update Batsmen
        const newBatsmen = [];
        if (data.striker) {
          newBatsmen.push({ 
            ...data.striker, 
            is_striker: true, 
            player_name: data.striker.name, 
            runs_scored: data.striker.runs, 
            balls_faced: data.striker.balls,
            fours: data.striker.fours,
            sixes: data.striker.sixes,
            strike_rate: data.striker.strikeRate
          });
        }
        if (data.nonStriker) {
          newBatsmen.push({ 
            ...data.nonStriker, 
            is_non_striker: true, 
            player_name: data.nonStriker.name, 
            runs_scored: data.nonStriker.runs, 
            balls_faced: data.nonStriker.balls,
            fours: data.nonStriker.fours,
            sixes: data.nonStriker.sixes,
            strike_rate: data.nonStriker.strikeRate
          });
        }
        setBatsmen(newBatsmen);
        
        // Update Bowler
        if (data.bowler) {
          setBowler({ 
            ...data.bowler, 
            player_name: data.bowler.name, 
            wickets_taken: data.bowler.wickets, 
            runs_conceded: data.bowler.runs,
            overs_bowled: data.bowler.overs,
            economy_rate: data.bowler.economy,
            maidens: data.bowler.maidens || 0
          });
        }
      })
      .on('broadcast', { event: 'FLASH_EVENT' }, (payload) => {
        triggerEvent(payload.payload.type);
      })
      .subscribe();

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
  const overs      = String(innings.total_overs || '0.0');
  
  // Mathematically correct CRR calculation
  const oversParts = overs.split('.');
  const overNum = parseInt(oversParts[0]) || 0;
  const ballNum = parseInt(oversParts[1]) || 0;
  const totalLegalBalls = (overNum * 6) + ballNum;
  const crr = totalLegalBalls > 0 ? ((score / totalLegalBalls) * 6).toFixed(2) : '0.00';

  const battingTeam = match.team1_id === innings.batting_team_id ? match.team1 : match.team2;
  const bowlingTeam = match.team1_id === innings.bowling_team_id ? match.team1 : match.team2;

  // Calculate required
  const ballsLeft = Math.max(0, (match.overs * 6) - totalLegalBalls);
  const runsNeeded = target ? Math.max(0, target - score) : null;

  return (
    <div className="obs-overlay min-h-screen relative select-none overflow-hidden text-slate-800">
      {/* ── Force Body Transparency for Streamlabs/OBS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        body, html { background: transparent !important; }
        .clip-left { clip-path: polygon(0 0, 92% 0, 100% 100%, 0 100%); }
        .clip-right { clip-path: polygon(8% 0, 100% 0, 100% 100%, 0 100%); }
        .shadow-tv { box-shadow: 0 15px 35px rgba(0,0,0,0.4); }
        .glass { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.4); }
      `}} />

      {/* ── Event Flash ── */}
      <AnimatePresence>
        {event && (
          <motion.div
            initial={{ opacity: 0, scale: 0.2, y: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 2, y: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed inset-0 flex items-center justify-center top-[-100px] z-[60] pointer-events-none"
          >
            <div className="relative flex items-center justify-center w-[350px] sm:w-[500px] h-[250px] sm:h-[350px]">
              <div className="absolute inset-0 bg-white/95 backdrop-blur-xl shadow-2xl" style={{ clipPath: 'polygon(50% 100%, 0 85%, 0 0, 100% 0, 100% 85%)' }} />
              <div className="text-6xl sm:text-9xl font-black tracking-widest uppercase relative z-10 
                  text-blue-700 [text-shadow:0_12px_0_#1e3a8a,-3px_-3px_0_#fff,3px_3px_0_#fff]" 
                  style={{ WebkitTextStroke: '2px #1e40af' }}>
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
        className="fixed bottom-4 sm:bottom-10 left-1/2 w-[1100px] -ml-[550px] shadow-tv text-slate-800 font-sans z-40 rounded-xl pointer-events-auto origin-bottom scale-[0.32] min-[420px]:scale-[0.4] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.9] xl:scale-100"
      >
        <div className="absolute -top-10 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Live Sync Master</span>
        </div>
        <div className="flex items-stretch h-20 bg-gradient-to-b from-slate-50 to-slate-200 rounded-lg overflow-hidden border border-white shadow-inner">
          
          {/* LEFT: Batting Team */}
          <div className="flex-shrink-0 w-48 bg-gradient-to-b from-slate-800 to-black flex items-center px-4 clip-left z-10">
            <div className="flex items-center gap-3">
              {battingTeam?.logo_url ? (
                 <img src={battingTeam.logo_url} className="w-12 h-12 rounded-full border-2 border-white/90 bg-white shadow-lg object-contain" alt="logo" />
              ) : (
                 <div className="w-12 h-12 rounded-full bg-blue-900 border-2 border-white flex items-center justify-center text-white font-black text-lg shadow-lg">
                    {battingTeam?.short_name?.charAt(0) || 'B'}
                 </div>
              )}
              <span className="text-white text-3xl font-black tracking-widest uppercase drop-shadow-md">
                {battingTeam?.short_name || 'BAT'}
              </span>
            </div>
          </div>

          {/* MIDDLE LEFT: Batsmen Stats */}
          <div className="flex-1 flex flex-col justify-center px-6">
            <AnimatePresence mode="wait">
              {visibility.batsmen && (
                <motion.div
                  key="batsmen-ui"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full"
                >
                  <div className="flex justify-between items-center text-[16px] font-bold text-slate-700">
                    <div className="flex gap-3">
                      <span className="w-44 truncate">{striker?.player_name||'Striker'}*</span>
                      <span className="text-slate-900 font-extrabold w-20 text-right">
                        {striker?.runs_scored||0} <span className="font-medium text-slate-500 text-sm">({striker?.balls_faced||0})</span>
                      </span>
                    </div>
                    {target && <div className="text-rose-700 mr-12 tracking-wide text-xs font-black italic">TARGET {target}</div>}
                  </div>
                  <div className="flex justify-between items-center text-[16px] font-bold text-slate-500">
                    <div className="flex gap-3">
                      <span className="w-44 truncate">{nonStriker?.player_name||'Non-Striker'}</span>
                      <span className="text-slate-700 w-20 text-right">
                        {nonStriker?.runs_scored||0} <span className="font-medium text-slate-400 text-sm">({nonStriker?.balls_faced||0})</span>
                      </span>
                    </div>
                    <div className="mr-12 tracking-wide text-[10px] uppercase font-bold text-slate-400">CRR <span className="text-slate-700 font-black">{crr}</span></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CENTER: Raised Score Block */}
          <AnimatePresence>
            {visibility.score && (
              <motion.div
                key="score-block"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="absolute left-1/2 -translate-x-1/2 -top-10 w-[320px] z-20"
              >
                <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] border-2 border-slate-200 overflow-hidden">
                  <div className="flex justify-center items-center divide-x divide-slate-100 py-2.5 px-3">
                    <div className="px-6 text-[52px] font-black text-blue-800 tracking-tighter leading-none">
                      {score}<span className="text-[36px] text-blue-500">-{wickets}</span>
                    </div>
                    <div className="px-6 text-3xl font-black text-slate-600 leading-none">
                      {overs}
                    </div>
                  </div>
                  
                  {/* OVER-BY-OVER BALL DOTS */}
                  <div className="bg-slate-50 py-1.5 flex justify-center gap-1 border-t border-slate-100">
                     {currentOver.length > 0 ? currentOver.map((b, i) => (
                       <div key={i} className={`w-3 h-3 rounded-full ${b==='W'?'bg-red-500':b==='6'?'bg-purple-500':b==='4'?'bg-blue-500':'bg-slate-300'}`} />
                     )) : (
                       <div className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Over starting</div>
                     )}
                  </div>

                  {target && (
                    <div className="bg-slate-900 py-1.5 text-center text-[11px] text-white font-black uppercase tracking-[0.15em] border-t border-white/10">
                      NEED <b className="text-amber-400 mx-1">{runsNeeded}</b> RUNS IN <b className="text-amber-400 mx-1">{ballsLeft}</b> BALLS
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MIDDLE RIGHT: Bowler */}
          <div className="flex-1 flex flex-col justify-center px-6 items-end pl-[180px]">
             <AnimatePresence mode="wait">
               {visibility.bowler && (
                 <motion.div
                   key="bowler-ui"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="w-full"
                 >
                   <div className="flex gap-4 items-center text-[16px] font-bold text-slate-800 w-full justify-between">
                      <span className="text-blue-700 w-36 truncate font-black uppercase tracking-wider text-left">{bowler?.player_name||'Bowler'}</span>
                      <span className="text-slate-900 font-extrabold text-right">
                        {bowler?.wickets_taken||0}-{bowler?.runs_conceded||0} <span className="font-medium text-slate-400 text-sm">({bowler?.economy_rate||'0.00'})</span>
                      </span>
                   </div>
                   <div className="flex gap-4 items-center text-sm font-bold text-slate-400 w-full justify-between mt-1 tracking-widest">
                      <span className="text-[10px] uppercase font-black text-slate-400">Overs & Maidens</span>
                      <div className="flex gap-2 justify-end font-mono text-[14px] text-slate-800 font-black">
                         {bowler?.overs_bowled || '0.0'} <span className="text-slate-400 text-[10px] font-sans">M: {bowler?.maidens || 0}</span>
                      </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* RIGHT: Bowling Team */}
          <div className="flex-shrink-0 w-48 bg-gradient-to-b from-emerald-600 to-emerald-800 flex items-center justify-end px-4 clip-right z-10 text-right">
            <div className="flex items-center gap-3">
              <span className="text-white text-3xl font-black tracking-widest uppercase shadow-black/50 drop-shadow-md">
                {bowlingTeam?.short_name || 'PAK'}
              </span>
              {bowlingTeam?.logo_url ? (
                 <img src={bowlingTeam.logo_url} className="w-12 h-12 rounded-full border-2 border-white/90 bg-white shadow-lg object-contain" alt="logo" />
              ) : (
                 <div className="w-12 h-12 rounded-full bg-emerald-900 border-2 border-white flex items-center justify-center text-white font-black text-lg shadow-lg">
                    {bowlingTeam?.short_name?.charAt(0) || 'B'}
                 </div>
              )}
            </div>
          </div>

        </div>
      </motion.div>

      {/* ── PLAYING 11 OVERLAY (Responsive TV Graphic) ── */}
      <AnimatePresence>
        {playing11Team && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-4 sm:left-12 top-4 sm:top-12 w-[400px] sm:w-[500px] z-50 origin-top-left scale-[0.4] min-[420px]:scale-[0.5] sm:scale-75 md:scale-90 lg:scale-100"
          >
            <div className="glass rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col border-4 border-white/30">
              {/* Header */}
              <div className="bg-gradient-to-br from-blue-700 to-blue-900 h-32 flex items-center px-8 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                <div className="flex items-center gap-6 relative z-10">
                  {playing11Team.logo_url && (
                    <img src={playing11Team.logo_url} alt="L" className="w-20 h-20 rounded-full border-4 border-white bg-white p-1 shadow-xl" />
                  )}
                  <div>
                    <h2 className="text-white text-4xl font-black uppercase tracking-tighter drop-shadow-lg leading-none m-0">{playing11Team.name}</h2>
                    <div className="bg-sky-400 text-sky-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mt-2 inline-block">Starting Playing XI</div>
                  </div>
                </div>
              </div>

              {/* Player Grid */}
              <div className="p-2 space-y-1">
                {playing11Players.map((player, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + (idx * 0.04) }}
                    key={player.id} 
                    className="flex items-center px-6 py-3 rounded-xl hover:bg-blue-600/5 group transition-colors"
                  >
                     <div className="text-blue-500 font-black w-8 text-sm">{idx + 1}</div>
                     <div className="text-slate-800 font-extrabold text-xl uppercase tracking-wide flex-1">{player.name}</div>
                     {player.role && (
                       <span className="text-[11px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg ml-2 shadow-sm min-w-[55px] text-center">
                         {player.role.includes('Wicket') ? 'WK/BAT' : player.role.includes('All') ? 'ALL R' : player.role.includes('Bowler') ? 'BOWLER' : 'BATTER'}
                       </span>
                     )}
                  </motion.div>
                ))}
              </div>
              <div className="h-4 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MATCH INFO OVERLAY ── */}
      <AnimatePresence>
        {matchInfoVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 w-[700px] z-50 origin-top scale-[0.4] sm:scale-75 md:scale-95 lg:scale-100"
          >
             <div className="glass rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white p-1 overflow-hidden">
                <div className="bg-slate-900 text-white p-4 text-center rounded-xl">
                   <div className="text-[10px] uppercase tracking-[0.3em] font-black text-blue-400 mb-1">Match Information</div>
                   <h2 className="text-3xl font-black uppercase tracking-tight">{match.team1?.name} vs {match.team2?.name}</h2>
                   <div className="flex justify-center gap-12 mt-6 border-t border-white/10 pt-6 px-4">
                      <div className="text-center">
                         <div className="text-[10px] uppercase text-slate-500 font-black mb-1">Venue</div>
                         <div className="text-base font-bold text-slate-200">{match.venue || 'TBA'}</div>
                      </div>
                      <div className="text-center">
                         <div className="text-[10px] uppercase text-slate-500 font-black mb-1">Toss</div>
                         <div className="text-base font-bold text-amber-400">{match.toss_text || 'Toss Pending'}</div>
                      </div>
                      <div className="text-center">
                         <div className="text-[10px] uppercase text-slate-500 font-black mb-1">Status</div>
                         <div className="text-base font-bold text-emerald-400 uppercase">{match.status.replace('_', ' ')}</div>
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
