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
      *, 
      team1:teams!matches_team1_id_fkey(*), 
      team2:teams!matches_team2_id_fkey(*),
      tournament:tournaments(*)
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
    <div className="obs-overlay min-h-screen relative select-none overflow-hidden font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Chakra+Petch:wght@700&display=swap');
        body, html { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
        .font-outfit { font-family: 'Outfit', sans-serif; }
        .font-chakra { font-family: 'Chakra Petch', sans-serif; }
        
        .premium-glass { 
          background: rgba(255, 255, 255, 0.92); 
          backdrop-filter: blur(20px) saturate(180%); 
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        
        .slanted-team {
          clip-path: polygon(0 0, 85% 0, 100% 100%, 0% 100%);
        }
        
        .slanted-right {
          clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%);
        }

        .shadow-glow {
          filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.4));
        }
        
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .animate-pulse-soft { animation: pulse-soft 2s infinite ease-in-out; }
      `}} />

      {/* ── TOP BADGE (SERIES / TOURNAMENT) ── */}
      <motion.div 
        initial={{ y: -50 }} animate={{ y: 20 }}
        className="fixed top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none origin-top scale-[0.5] sm:scale-75 md:scale-100"
      >
         <div className="flex items-center">
            <div className="bg-slate-900 text-white px-6 py-1.5 rounded-l-full font-outfit text-xs font-black tracking-[0.3em] uppercase border-y border-l border-white/20">
               {match.tournament?.name || 'Cricket Live'}
            </div>
            <div className="bg-blue-600 text-white px-4 py-1.5 rounded-r-full font-outfit text-xs font-black tracking-widest uppercase border border-blue-400 border-l-0 shadow-lg flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-white animate-pulse-soft" />
               LIVE
            </div>
         </div>
      </motion.div>

      {/* ── EVENT FLASH (FULL SCREEN) ── */}
      <AnimatePresence>
        {event && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
          >
            <div className="relative overflow-hidden p-20 scale-[0.6] sm:scale-100">
               <motion.div 
                 initial={{ width: 0 }} animate={{ width: '100%' }}
                 className="absolute inset-0 bg-blue-600 skew-x-[-20deg]" 
               />
               <div className="relative z-10 px-20 py-10 border-8 border-white skew-x-[-20deg] bg-indigo-900 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                 <h1 className="text-[120px] font-black text-white italic tracking-tighter leading-none m-0 shadow-tv">
                   {event}
                 </h1>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN SCOREBOARD BAR (BOTTOM) ── */}
      <div className="fixed bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 z-40 origin-bottom scale-[0.3] min-[420px]:scale-[0.4] sm:scale-[0.55] md:scale-[0.7] lg:scale-[0.85] xl:scale-100 transition-transform duration-500">
        
        {/* Partnership / Recent Balls Small Badge */}
        <AnimatePresence>
          {visibility.score && currentOver.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: -4 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-center mb-0"
            >
              <div className="bg-black/60 backdrop-blur-md px-6 py-1 rounded-t-2xl flex gap-2 border-x border-t border-white/10">
                {currentOver.map((b, i) => (
                   <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-sm
                      ${b==='W'?'bg-red-500':b==='6'?'bg-purple-600':b==='4'?'bg-blue-600':'bg-white/20'}`}>
                     {b==='•'?'':b}
                   </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex h-24 w-[1120px] premium-glass rounded-2xl overflow-hidden items-stretch shadow-tv">
          
          {/* TEAM SECTION */}
          <div className="w-52 relative flex items-center px-6 slanted-team" style={{ backgroundColor: battingTeam?.primary_color || '#1e293b' }}>
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
            <div className="relative z-10 flex items-center gap-4">
               {battingTeam?.logo_url ? (
                  <img src={battingTeam.logo_url} className="w-14 h-14 rounded-full border-2 border-white/50 bg-white p-1 shadow-2xl" />
               ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-2xl border border-white/30 backdrop-blur-md">
                    {battingTeam?.short_name?.charAt(0)}
                  </div>
               )}
               <div className="flex flex-col">
                  <span className="text-white font-chakra text-3xl leading-none drop-shadow-lg -mb-1">{battingTeam?.short_name || 'BAT'}</span>
                  <span className="text-white/60 text-[10px] uppercase font-black tracking-widest leading-none">Innings {match.current_innings}</span>
               </div>
            </div>
          </div>

          {/* BATTING STATS */}
          <div className="flex-1 px-8 flex flex-col justify-center border-r border-slate-200">
            <AnimatePresence mode="wait">
              {visibility.batsmen && (
                <motion.div
                  key={`bats-${striker?.id}-${nonStriker?.id}`}
                  initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -10, opacity: 0 }}
                  className="space-y-1"
                >
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                       <span className={`w-2 h-2 rounded-full ${striker ? 'bg-green-500 animate-pulse outline outline-4 outline-green-500/20' : ''}`} />
                       <span className="text-2xl font-outfit font-black text-slate-900 tracking-tight max-w-[200px] truncate uppercase">{striker?.player_name || 'Batsman 1'}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-chakra font-black text-blue-700">{striker?.runs_scored || 0}</span>
                       <span className="text-sm font-black text-slate-400 italic">({striker?.balls_faced || 0})</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center opacity-60 grayscale-[0.5]">
                    <div className="flex items-center gap-3 pl-5">
                       <span className="text-lg font-outfit font-bold text-slate-600 max-w-[180px] truncate uppercase">{nonStriker?.player_name || 'Batsman 2'}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                       <span className="text-xl font-chakra font-black text-slate-700">{nonStriker?.runs_scored || 0}</span>
                       <span className="text-[11px] font-black text-slate-400">({nonStriker?.balls_faced || 0})</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SCORE BOX (Raised) */}
          <div className="w-80 relative flex items-center justify-center">
            <AnimatePresence>
              {visibility.score && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-12 w-72 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden border-2 border-slate-100"
                >
                   <div className="p-4 flex flex-col items-center">
                      <div className="flex items-baseline gap-1 pointer-events-none">
                         <span className="text-6xl font-chakra font-black text-slate-900">{score}</span>
                         <span className="text-3xl font-chakra font-black text-blue-500">/{wickets}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 border-t border-slate-100 pt-1 w-full justify-center">
                         <div className="text-center">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Overs</div>
                            <div className="text-2xl font-chakra font-black text-slate-700 leading-none">{overs}</div>
                         </div>
                         <div className="w-px h-6 bg-slate-200" />
                         <div className="text-center">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">CRR</div>
                            <div className="text-2xl font-chakra font-black text-slate-700 leading-none">{crr}</div>
                         </div>
                      </div>
                   </div>
                   {target && (
                     <div className="bg-black text-white py-2 text-center text-[10px] font-chakra font-black tracking-[0.2em] uppercase px-4 border-t border-white/10">
                       Need <span className="text-amber-400 mx-1">{runsNeeded}</span> Runs in <span className="text-amber-400 mx-1">{ballsLeft}</span> Balls
                     </div>
                   )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BOWLER SECTION */}
          <div className="flex-1 px-8 flex flex-col justify-center items-end border-l border-slate-200 slanted-right bg-slate-50/50">
             <AnimatePresence mode="wait">
               {visibility.bowler && (
                 <motion.div
                   key={`bowler-${bowler?.id}`}
                   initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 10, opacity: 0 }}
                   className="text-right space-y-1 w-full max-w-[240px]"
                 >
                   <div className="flex items-center justify-end gap-3">
                      <span className="text-2xl font-outfit font-black text-blue-800 tracking-tight truncate uppercase">{bowler?.player_name || 'Bowler'}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-soft" />
                   </div>
                   <div className="flex justify-between items-center bg-white/60 p-1.5 rounded-xl border border-slate-200/50 shadow-sm">
                      <div className="flex flex-col items-start px-2">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Overs</span>
                         <span className="text-lg font-chakra font-black text-slate-700 leading-none">{bowler?.overs_bowled || '0.0'}</span>
                      </div>
                      <div className="flex flex-col px-2 bg-blue-600 rounded-lg text-white">
                         <span className="text-[8px] font-black text-white/60 uppercase tracking-widest leading-none p-1">W-R</span>
                         <span className="text-xl font-chakra font-black leading-none pb-1.5 px-2">{bowler?.wickets_taken || 0}-{bowler?.runs_conceded || 0}</span>
                      </div>
                      <div className="flex flex-col items-end px-2">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">ECO</span>
                         <span className="text-lg font-chakra font-black text-slate-700 leading-none">{bowler?.economy_rate || '0.00'}</span>
                      </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

        </div>
      </div>

      {/* ── FULL SCREEN / SIDE OVERLAYS (PLAYING XI, MATCH INFO) ── */}
      <AnimatePresence>
        {playing11Team && (
          <motion.div
            initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
            className="fixed top-12 left-12 w-[600px] z-50 origin-top-left scale-[0.4] sm:scale-75 md:scale-90 lg:scale-100"
          >
            <div className="bg-white rounded-3xl shadow-tv overflow-hidden border-[6px] border-white">
               <div className="h-40 relative flex items-center px-12" style={{ backgroundColor: playing11Team.primary_color || '#1e293b' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                  <div className="relative z-10 flex items-center gap-8">
                     {playing11Team.logo_url && <img src={playing11Team.logo_url} className="w-24 h-24 rounded-2xl bg-white shadow-2xl p-2 border-4 border-white/20" />}
                     <div>
                        <h1 className="text-5xl font-chakra font-black text-white tracking-widest uppercase m-0 leading-none">{playing11Team.short_name || 'XI'}</h1>
                        <p className="text-white/60 font-outfit uppercase font-black tracking-[0.4em] m-0 mt-2">Playing Eleven</p>
                     </div>
                  </div>
               </div>
               <div className="p-8 space-y-2 grid grid-cols-2 gap-x-12">
                  {playing11Players.slice(0, 11).map((player, idx) => (
                    <motion.div
                      key={player.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.05 }}
                      className="group flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
                    >
                       <div className="flex items-center gap-4">
                          <span className="w-6 text-2xl font-chakra font-black text-blue-500/30 group-hover:text-blue-500">{idx + 1}</span>
                          <span className="text-xl font-outfit font-black text-slate-800 uppercase tracking-tight">{player.name}</span>
                       </div>
                       {player.is_captain && <span className="text-[10px] bg-amber-400 font-extrabold px-2 py-0.5 rounded-lg border border-amber-500 shadow-sm">CPT</span>}
                    </motion.div>
                  ))}
               </div>
               <div className="h-4 w-full" style={{ background: `linear-gradient(90deg, ${playing11Team.primary_color}, ${playing11Team.secondary_color})` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MATCH INFO (Premium Glass) ── */}
      <AnimatePresence>
        {matchInfoVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 1.1, y: 30 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-[800px] z-50 origin-top scale-[0.4] sm:scale-75 md:scale-100"
          >
             <div className="bg-slate-900 rounded-[40px] shadow-tv border-[8px] border-white overflow-hidden p-1">
                <div className="bg-slate-900 p-12 text-center relative">
                   <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                   <div className="text-blue-400 font-outfit text-sm font-black tracking-[0.6em] uppercase mb-4">Official Match Details</div>
                   <h2 className="text-6xl font-chakra font-black text-white uppercase tracking-tighter mb-12 flex justify-center items-center gap-8">
                     {match.team1?.short_name} <span className="text-blue-600 text-3xl">VS</span> {match.team2?.short_name}
                   </h2>
                   
                   <div className="grid grid-cols-3 gap-8 text-center bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
                      <div>
                         <div className="text-blue-500/60 font-black text-[10px] uppercase tracking-widest mb-2">Venue</div>
                         <div className="text-white text-2xl font-bold">{match.venue || 'International Stadium'}</div>
                      </div>
                      <div className="border-x border-white/10">
                         <div className="text-amber-500/60 font-black text-[10px] uppercase tracking-widest mb-2">Toss Info</div>
                         <div className="text-amber-400 text-2xl font-bold">{match.toss_text || 'Decision Pending'}</div>
                      </div>
                      <div>
                         <div className="text-emerald-500/60 font-black text-[10px] uppercase tracking-widest mb-2">Current Status</div>
                         <div className="text-emerald-400 text-2xl font-bold uppercase tracking-tight">{match.status?.replace('_', ' ')}</div>
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
