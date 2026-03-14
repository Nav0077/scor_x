'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ScoringEngine, DISMISSAL_TYPES, EXTRA_TYPES, formatOvers } from '@/lib/engine/ScoringEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiRefreshCw, FiChevronsRight, FiList, FiSettings } from 'react-icons/fi';
import { MdUndo, MdSwapHoriz } from 'react-icons/md';
import Link from 'next/link';

// ─── Ball display helper ─────────────────────────────────────────
function BallChip({ val }) {
  const cls =
    val === 'W' ? 'ball-w' :
    val === '4' ? 'ball-4' :
    val === '6' ? 'ball-6' :
    val?.startsWith('Wd') ? 'ball-wide' :
    val?.startsWith('Nb') ? 'ball-nb' :
    val === '•' ? 'ball-dot' :
    'ball-run';
  return <div className={`ball-indicator ${cls}`}>{val}</div>;
}

// ─── Bowler/Batsman card ─────────────────────────────────────────
function PlayerStat({ label, name, stats, isStriker }) {
  return (
    <div className={`flex-1 p-2.5 rounded-lg ${isStriker ? 'bg-cricket-500/10 border border-cricket-500/30' : 'bg-white/5'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        {isStriker && <span className="text-cricket-400 text-xs">*</span>}
      </div>
      <div className="text-sm font-bold text-slate-100 truncate">{name || '—'}</div>
      {stats && <div className="text-xs text-slate-400 mt-0.5 font-mono">{stats}</div>}
    </div>
  );
}

// ─── Wicket Dialog ───────────────────────────────────────────────
function WicketDialog({ players, onConfirm, onClose }) {
  const [wicketType, setWicketType] = useState('');
  const [dismissedId, setDismissedId] = useState('');
  const [fielderId, setFielderId] = useState('');

  const selected = DISMISSAL_TYPES.find(d => d.id === wicketType);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-300 border border-white/10 rounded-2xl p-5 w-full max-w-sm space-y-4"
      >
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          🏏 Wicket — How?
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {DISMISSAL_TYPES.map(d => (
            <button key={d.id} onClick={() => setWicketType(d.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all
                ${wicketType === d.id ? 'bg-red-600/20 border-red-500 text-red-300' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {d.label}
            </button>
          ))}
        </div>

        {selected?.needsFielder && (
          <div>
            <label className="label text-xs">Fielder / Wicket Keeper</label>
            <select value={fielderId} onChange={e => setFielderId(e.target.value)} className="input text-sm">
              <option value="">Select fielder</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {wicketType === 'run_out' && (
          <div>
            <label className="label text-xs">Who is out? (run-out)</label>
            <select value={dismissedId} onChange={e => setDismissedId(e.target.value)} className="input text-sm">
              <option value="">Striker (default)</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button
            disabled={!wicketType}
            onClick={() => onConfirm({ wicketType, dismissedId: dismissedId || null, fielderId: fielderId || null })}
            className="btn-danger flex-1 text-sm disabled:opacity-40"
          >
            Confirm Wicket
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── New Batsman Dialog ──────────────────────────────────────────
function NewBatsmanDialog({ players, onConfirm }) {
  const [selected, setSelected] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-300 border border-white/10 rounded-2xl p-5 w-full max-w-sm space-y-4"
      >
        <h3 className="text-base font-bold text-white">🏃 Next Batsman</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {players.map(p => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm border transition-all text-left
                ${selected === p.id ? 'border-cricket-500 bg-cricket-500/10 text-cricket-300' : 'border-white/5 text-slate-300 hover:border-white/15'}`}>
              <div className="w-8 h-8 rounded-full bg-cricket-600/30 flex items-center justify-center font-bold text-xs">
                {p.name?.slice(0, 1)}
              </div>
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-slate-500">{p.role}</div>
              </div>
            </button>
          ))}
          {players.length === 0 && <p className="text-slate-500 text-sm text-center">No more batsmen available.</p>}
        </div>
        <button disabled={!selected} onClick={() => onConfirm(selected)} className="btn-primary w-full disabled:opacity-40">
          Send In
        </button>
      </motion.div>
    </div>
  );
}

// ─── New Bowler Dialog ───────────────────────────────────────────
function NewBowlerDialog({ players, previousBowlerId, onConfirm }) {
  const [selected, setSelected] = useState('');
  const available = players.filter(p => p.id !== previousBowlerId);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-300 border border-white/10 rounded-2xl p-5 w-full max-w-sm space-y-4"
      >
        <h3 className="text-base font-bold text-white">🤾 Select Bowler (Over {Math.floor(0)})</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {available.map(p => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm border transition-all text-left
                ${selected === p.id ? 'border-cricket-500 bg-cricket-500/10 text-cricket-300' : 'border-white/5 text-slate-300 hover:border-white/15'}`}>
              <div className="w-8 h-8 rounded-full bg-cricket-600/30 flex items-center justify-center font-bold text-xs">
                {p.name?.slice(0, 1)}
              </div>
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-slate-500">{p.bowling_style || 'Bowler'}</div>
              </div>
            </button>
          ))}
        </div>
        <button disabled={!selected} onClick={() => onConfirm(selected)} className="btn-primary w-full disabled:opacity-40">
          Confirm Bowler
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Scoring Page ───────────────────────────────────────────
export default function ScoringPage() {
  const { matchId } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const engineRef = useRef(null);

  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState(null);
  const [battingPlayers, setBattingPlayers] = useState([]);
  const [bowlingPlayers, setBowlingPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state driven from engine
  const [scoreDisplay, setScoreDisplay] = useState({ score: 0, wickets: 0, overs: '0.0', extras: 0 });
  const [strikerDisplay, setStrikerDisplay] = useState(null);
  const [nonStrikerDisplay, setNonStrikerDisplay] = useState(null);
  const [bowlerDisplay, setBowlerDisplay] = useState(null);
  const [currentOverDisplay, setCurrentOverDisplay] = useState([]);
  const [lastOverDisplay, setLastOverDisplay] = useState(null);

  // Dialogs
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [showNewBatsman, setShowNewBatsman] = useState(false);
  const [showNewBowler, setShowNewBowler] = useState(false);
  const [showInningsBreak, setShowInningsBreak] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Extras sub-mode
  const [extraMode, setExtraMode] = useState(null); // 'wide' | 'noball' | 'bye' | 'legbye'
  const [pendingExtra, setPendingExtra] = useState(null);

  // Event flash
  const [flashEvent, setFlashEvent] = useState(null);

  const [innings2Opener1, setInnings2Opener1] = useState('');
  const [innings2Opener2, setInnings2Opener2] = useState('');
  const [innings2Bowler, setInnings2Bowler] = useState('');
  const [target, setTarget] = useState(null);

  // ── Load match data ──
  useEffect(() => { loadMatch(); }, [matchId]);

  const loadMatch = async () => {
    const { data: matchData } = await supabase.from('matches').select(`
      *, 
      team1:teams!matches_team1_id_fkey(*),
      team2:teams!matches_team2_id_fkey(*)
    `).eq('id', matchId).single();

    if (!matchData) { router.push('/matches'); return; }
    setMatch(matchData);

    // Load current innings
    const inningsNum = matchData.current_innings || 1;
    const { data: inningsData } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', matchId)
      .eq('innings_number', inningsNum)
      .single();

    if (!inningsData) { setLoading(false); return; }
    setInnings(inningsData);

    // Set target for innings 2
    if (inningsNum === 2) {
      setTarget(matchData.innings1_score + 1);
    }

    // Load batting players
    const battingTeamId = inningsData.batting_team_id;
    const bowlingTeamId = inningsData.bowling_team_id;
    const { data: bPlayers } = await supabase.from('players').select('*').eq('team_id', battingTeamId);
    const { data: wPlayers } = await supabase.from('players').select('*').eq('team_id', bowlingTeamId);
    setBattingPlayers(bPlayers || []);
    setBowlingPlayers(wPlayers || []);

    // Load existing batting scorecard to rebuild engine
    const { data: bScorecard } = await supabase.from('batting_scorecard').select('*').eq('innings_id', inningsData.id);
    const { data: wScorecard } = await supabase.from('bowling_scorecard').select('*').eq('innings_id', inningsData.id);
    const { data: prevBalls }  = await supabase.from('balls').select('*').eq('innings_id', inningsData.id).order('ball_sequence');

    // Reconstruct engine from existing data
    const engine = new ScoringEngine({ maxOvers: matchData.overs, maxWickets: 10 });
    engineRef.current = engine;

    // Seed batting scorecard
    (bScorecard || []).forEach((bs, i) => {
      engine.initBatsman(bs.player_id, bs.player_name, i + 1);
      if (bs.is_striker) engine.striker = bs.player_id;
      if (bs.is_non_striker) engine.nonStriker = bs.player_id;
      engine.battingScorecard[bs.player_id] = {
        ...engine.battingScorecard[bs.player_id],
        runs: bs.runs_scored, balls: bs.balls_faced,
        fours: bs.fours, sixes: bs.sixes,
        isOut: bs.is_out, dismissalType: bs.dismissal_type,
        dismissalText: bs.dismissal_text || '',
      };
    });

    // Seed bowling scorecard
    (wScorecard || []).forEach((ws, i) => {
      engine.initBowler(ws.player_id, ws.player_name);
      engine.bowlingScorecard[ws.player_id] = {
        ...engine.bowlingScorecard[ws.player_id],
        legalBalls: Math.floor(parseFloat(ws.overs_bowled)) * 6 + Math.round((parseFloat(ws.overs_bowled) % 1) * 10),
        runs: ws.runs_conceded, wickets: ws.wickets_taken,
        wides: ws.wides, noballs: ws.no_balls, dots: ws.dots,
        maidens: ws.maidens,
      };
      if (ws.is_current_bowler) engine.currentBowler = ws.player_id;
    });

    // Restore innings totals from DB
    engine.innings.totalScore   = inningsData.total_score || 0;
    engine.innings.totalWickets = inningsData.total_wickets || 0;
    engine.innings.legalBalls   = Math.floor(parseFloat(inningsData.total_overs || 0)) * 6 + Math.round(((parseFloat(inningsData.total_overs || 0)) % 1) * 10);
    engine.innings.totalExtras  = inningsData.total_extras || 0;

    refreshUI(engine);
    setLoading(false);
  };

  const refreshUI = (engine) => {
    const e = engine || engineRef.current;
    if (!e) return;
    setScoreDisplay({
      score: e.innings.totalScore,
      wickets: e.innings.totalWickets,
      overs: formatOvers(e.innings.legalBalls),
      extras: e.innings.totalExtras,
    });
    setStrikerDisplay(e.striker ? e.getBatsmanBoard(e.striker) : null);
    setNonStrikerDisplay(e.nonStriker ? e.getBatsmanBoard(e.nonStriker) : null);
    setBowlerDisplay(e.currentBowler ? e.getBowlerBoard(e.currentBowler) : null);
    setCurrentOverDisplay([...e.currentOverBalls]);
    if (e.completedOvers.length > 0) {
      const last = e.completedOvers[e.completedOvers.length - 1];
      setLastOverDisplay({ runs: last.runs, balls: last.balls });
    }
  };

  const flash = (event) => {
    setFlashEvent(event);
    setTimeout(() => setFlashEvent(null), 2500);
  };

  // ── Save ball to Supabase ──
  const saveBall = useCallback(async (opts, result) => {
    if (!innings) return;
    const engine = engineRef.current;
    const seq = engine.innings.totalDeliveries;

    const overNumber = Math.floor((engine.innings.legalBalls - (result.isLegalDelivery ? 1 : 0)) / 6);
    const ballNumber = (engine.innings.legalBalls - (result.isLegalDelivery ? 1 : 0)) % 6 + (result.isLegalDelivery ? 1 : 0);

    const syncPromises = [];

    syncPromises.push(
      supabase.from('balls').insert({
        innings_id: innings.id, match_id: matchId,
        over_number: overNumber, ball_number: ballNumber,
        ball_sequence: seq,
        batsman_id: engine.striker,
        non_striker_id: engine.nonStriker,
        bowler_id: engine.currentBowler,
        runs_scored: opts.runs || 0,
        extras: result.extraAmount,
        extra_type: opts.extraType,
        total_runs: result.totalRunsThisBall,
        is_wicket: opts.isWicket || false,
        wicket_type: opts.wicketType,
        is_boundary: (opts.runs === 4),
        is_six: (opts.runs === 6),
        is_dot: (opts.runs === 0 && !result.extraAmount && !opts.isWicket),
        shot_direction: opts.shotDirection,
        wagon_zone: opts.wagonZone,
      })
    );

    // Update innings in DB
    const iOvers = formatOvers(engine.innings.legalBalls);
    syncPromises.push(
      supabase.from('innings').update({
        total_score: engine.innings.totalScore,
        total_wickets: engine.innings.totalWickets,
        total_overs: iOvers,
        total_extras: engine.innings.totalExtras,
        extras_wides: engine.innings.extrasWides,
        extras_noballs: engine.innings.extrasNoballs,
        extras_byes: engine.innings.extrasByes,
        extras_legbyes: engine.innings.extrasLegbyes,
      }).eq('id', innings.id)
    );

    // Update match score summary
    const inningsNum = match?.current_innings || 1;
    const updateData = inningsNum === 1
      ? { innings1_score: engine.innings.totalScore, innings1_wickets: engine.innings.totalWickets, innings1_overs: iOvers }
      : { innings2_score: engine.innings.totalScore, innings2_wickets: engine.innings.totalWickets, innings2_overs: iOvers };
      
    syncPromises.push(
      supabase.from('matches').update(updateData).eq('id', matchId)
    );

    // Update batting scorecard entries
    if (engine.striker) {
      const bs = engine.battingScorecard[engine.striker];
      syncPromises.push(
        supabase.from('batting_scorecard').update({
          runs_scored: bs.runs, balls_faced: bs.balls,
          fours: bs.fours, sixes: bs.sixes,
          is_striker: bs.isStriker, is_non_striker: bs.isNonStriker,
          strike_rate: bs.balls > 0 ? ((bs.runs / bs.balls) * 100).toFixed(2) : 0,
        }).eq('innings_id', innings.id).eq('player_id', engine.striker)
      );
    }

    if (engine.currentBowler) {
      const bow = engine.getBowlerBoard(engine.currentBowler);
      syncPromises.push(
        supabase.from('bowling_scorecard').update({
          overs_bowled: bow.overs,
          runs_conceded: bow.runs,
          wickets_taken: bow.wickets,
          economy_rate: bow.economy,
          wides: bow.wides, no_balls: bow.noballs, dots: bow.dots, maidens: bow.maidens,
        }).eq('innings_id', innings.id).eq('player_id', engine.currentBowler)
      );
    }

    // Fire all network requests concurrently to reduce lag on poor connections
    await Promise.allSettled(syncPromises);
  }, [innings, matchId, match]);

  // ── Overlay Broadcasts ──
  const broadcastPlaying11 = (teamId) => {
    supabase.channel(`scoreboard-${matchId}`).send({
      type: 'broadcast',
      event: 'SHOW_PLAYING_11',
      payload: { teamId }
    });
    flash(teamId === 'HIDE' ? 'HIDDEN' : 'XI SENT');
  };

  // ── Handle run/extra button press ──
  const handleScore = async (runs, extraType = null, extraRuns = 0) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (extraMode && !extraType) {
      extraType = extraMode;
      setExtraMode(null);
    }

    const result = engine.recordBall({ runs, extraType, extraRuns });
    refreshUI(engine);
    // Optimistic UI - async persistence
    saveBall({ runs, extraType, extraRuns }, result).catch(console.error);

    // Flash events
    if (runs === 6) flash('SIX');
    else if (runs === 4) flash('FOUR');

    // Check innings end
    if (result.inningsEnded) {
      if ((match?.current_innings || 1) === 1) {
        setShowInningsBreak(true);
      } else {
        const resultText = engine.getMatchResult({
          team1Name: match?.team1?.name, team2Name: match?.team2?.name,
          battingFirst: 2, target,
        });
        await supabase.from('matches').update({ status: 'completed', result_text: resultText }).eq('id', matchId);
        setShowResult(true);
      }
    } else if ((match?.current_innings || 1) === 2 && engine.checkTargetAchieved(target)) {
      const resultText = engine.getMatchResult({
        team1Name: match?.team1?.name, team2Name: match?.team2?.name,
        battingFirst: 2, target,
      });
      await supabase.from('matches').update({ status: 'completed', result_text: resultText }).eq('id', matchId);
      setShowResult(true);
    } else if (result.overComplete) {
      setShowNewBowler(true);
    } else if (result.wicketResult) {
      flash('WICKET');
      const remaining = battingPlayers.filter(p =>
        !Object.values(engine.battingScorecard).find(bs => bs.id === p.id)
      );
      if (engine.innings.totalWickets < 10 && remaining.length > 0) {
        setShowNewBatsman(true);
      }
    }
  };

  const handleWicket = (opts) => {
    const engine = engineRef.current;
    if (!engine) return;
    setShowWicketDialog(false);
    handleScore(0, null, 0); // Will be replaced by actual ball recording with wicket
    // Actually record with wicket opts
    const result = engine.undo(); // undo the blank ball we just added
    if (result) refreshUI(engine);
    // Now record the actual wicket
    const res = engine.recordBall({ runs: 0, ...opts, isWicket: true });
    refreshUI(engine);
    saveBall({ runs: 0, ...opts, isWicket: true }, res).catch(console.error);
    flash('WICKET');
    if (res.wicketResult && engine.innings.totalWickets < 10) {
      const remaining = battingPlayers.filter(p =>
        !Object.values(engine.battingScorecard).some(bs => bs.id === p.id)
      );
      if (remaining.length > 0) setShowNewBatsman(true);
    }
    if (res.overComplete) setShowNewBowler(true);
  };

  const handleNewBatsman = (playerId) => {
    const engine = engineRef.current;
    const player = battingPlayers.find(p => p.id === playerId);
    if (!player || !engine) return;
    const pos = Object.keys(engine.battingScorecard).length + 1;
    engine.initBatsman(playerId, player.name, pos);
    if (!engine.striker) engine.setStriker(playerId);
    else if (!engine.nonStriker) engine.setNonStriker(playerId);
    // Insert into batting scorecard in DB
    supabase.from('batting_scorecard').insert({
      innings_id: innings.id, match_id: matchId,
      player_id: player.id, player_name: player.name,
      batting_position: pos,
      is_striker: !engine.striker || engine.striker === playerId,
    });
    engine.initPartnership(engine.striker, engine.nonStriker);
    refreshUI(engine);
    setShowNewBatsman(false);
  };

  const handleNewBowler = (playerId) => {
    const engine = engineRef.current;
    const player = bowlingPlayers.find(p => p.id === playerId);
    if (!player || !engine) return;
    engine.initBowler(playerId, player.name);
    if (!engine.bowlingScorecard[playerId]) {
      supabase.from('bowling_scorecard').insert({
        innings_id: innings.id, match_id: matchId,
        player_id: player.id, player_name: player.name,
        bowling_position: Object.keys(engine.bowlingScorecard).length,
        is_current_bowler: true,
      });
    } else {
      supabase.from('bowling_scorecard').update({ is_current_bowler: false }).eq('innings_id', innings.id).neq('player_id', playerId);
      supabase.from('bowling_scorecard').update({ is_current_bowler: true }).eq('innings_id', innings.id).eq('player_id', playerId);
    }
    refreshUI(engine);
    setShowNewBowler(false);
  };

  const handleUndo = () => {
    const engine = engineRef.current;
    if (!engine || !engine.canUndo()) return;
    engine.undo();
    refreshUI(engine);
  };

  const startInnings2 = async () => {
    const i2target = scoreDisplay.score + 1;
    setTarget(i2target);
    // Create innings 2
    const { data: newInnings } = await supabase.from('innings').insert({
      match_id: matchId,
      innings_number: 2,
      batting_team_id: match.innings2_batting_team,
      bowling_team_id: match.innings1_batting_team,
      target: i2target,
      status: 'in_progress',
    }).select().single();

    await supabase.from('matches').update({ current_innings: 2, status: 'live_innings2' }).eq('id', matchId);

    // Reload with innings 2
    setShowInningsBreak(false);
    setInnings(newInnings);
    // Reinit engine
    const engine = new ScoringEngine({ maxOvers: match.overs, maxWickets: 10 });
    engineRef.current = engine;
    // Batting team for innings 2 is the one that bowled in innings 1
    const battingTeamId2 = match.innings2_batting_team;
    const bowlingTeamId2 = match.innings1_batting_team;
    const { data: bPlay } = await supabase.from('players').select('*').eq('team_id', battingTeamId2);
    const { data: wPlay } = await supabase.from('players').select('*').eq('team_id', bowlingTeamId2);
    setBattingPlayers(bPlay || []);
    setBowlingPlayers(wPlay || []);
    refreshUI(engine);
    setShowNewBatsman(false);
    setMatch(m => ({ ...m, current_innings: 2, status: 'live_innings2' }));

    // Open openers selection
    setShowNewBatsman(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-400">
        <div className="w-10 h-10 border-2 border-cricket-500/30 border-t-cricket-500 rounded-full animate-spin" />
      </div>
    );
  }

  const currentInnings = match?.current_innings || 1;
  const battingTeamName = currentInnings === 1 ? match?.team1?.name : match?.team2?.name;
  const bowlingTeamName = currentInnings === 1 ? match?.team2?.name : match?.team1?.name;

  const rrr = target ? engineRef.current?.getRequiredRate(target) : null;
  const runsNeeded = target ? engineRef.current?.getRunsNeeded(target) : null;
  const ballsLeft = engineRef.current?.getBallsLeft() || 0;

  return (
    <div className="min-h-screen bg-dark-400 flex flex-col max-w-md mx-auto relative">
      {/* Flash Event Overlay */}
      <AnimatePresence>
        {flashEvent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className={`fixed inset-0 z-40 flex items-center justify-center pointer-events-none`}
          >
            <div className={`text-6xl font-black ${flashEvent === 'SIX' ? 'text-purple-400 glow-purple' : flashEvent === 'FOUR' ? 'text-blue-400 glow-blue' : 'text-red-400 glow-red'}`}>
              {flashEvent}!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Nav Bar */}
      <div className="sticky top-0 z-30 bg-dark-300/95 backdrop-blur-sm border-b border-white/5 flex items-center gap-3 px-4 py-3">
        <Link href="/matches" className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
          <FiArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 truncate">
            {match?.team1?.name} vs {match?.team2?.name}
          </div>
        </div>
        <Link href={`/matches/${matchId}`} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors" title="Scorecard">
          <FiList size={16} />
        </Link>
        <Link href={`/scoreboard/${matchId}`} target="_blank" className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors" title="Live Scoreboard">
          <FiChevronsRight size={16} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* ── Main Score Display ── */}
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500 mb-1">{battingTeamName} · Innings {currentInnings}</div>
              <div className="score-display text-4xl font-black text-white">
                {scoreDisplay.score}/{scoreDisplay.wickets}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-400 text-sm">({scoreDisplay.overs} ov)</span>
                <span className="text-xs text-slate-500">CRR: {engineRef.current?.getCurrentRunRate() || '0.00'}</span>
              </div>
            </div>
            {target && (
              <div className="text-right">
                <div className="text-xs text-slate-500">Target</div>
                <div className="text-2xl font-black text-amber-400">{target}</div>
                <div className="text-xs text-cricket-400 mt-0.5">
                  Need {runsNeeded} off {ballsLeft}b
                </div>
                <div className="text-xs text-slate-500">RRR: {rrr}</div>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-600 mt-2">Extras: {scoreDisplay.extras}</div>
        </div>

        {/* ── Batsmen ── */}
        <div className="flex gap-2">
          <PlayerStat
            label="Striker"
            name={strikerDisplay?.name}
            stats={strikerDisplay ? `${strikerDisplay.runs} (${strikerDisplay.balls}) | SR: ${strikerDisplay.strikeRate}` : '—'}
            isStriker
          />
          <PlayerStat
            label="Non-Striker"
            name={nonStrikerDisplay?.name}
            stats={nonStrikerDisplay ? `${nonStrikerDisplay.runs} (${nonStrikerDisplay.balls})` : '—'}
          />
        </div>

        {/* ── Bowler ── */}
        <PlayerStat
          label="Bowling"
          name={bowlerDisplay?.name}
          stats={bowlerDisplay ? `${bowlerDisplay.overs}-${bowlerDisplay.maidens}-${bowlerDisplay.runs}-${bowlerDisplay.wickets} | Econ: ${bowlerDisplay.economy}` : '—'}
        />

        {/* ── Current Over ── */}
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">This Over</span>
            <span className="text-xs text-slate-400 font-mono">{currentOverDisplay.length}/6</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {currentOverDisplay.map((b, i) => <BallChip key={i} val={b} />)}
            {Array.from({ length: Math.max(0, 6 - currentOverDisplay.length) }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full border border-dashed border-white/10" />
            ))}
          </div>
          {lastOverDisplay && (
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              Last over: <span className="text-slate-400">{lastOverDisplay.runs} runs</span>
              {lastOverDisplay.balls.map((b, i) => <span key={i} className="font-mono">{b}</span>)}
            </div>
          )}
        </div>

        {/* ── Extras mode indicator ── */}
        {extraMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium text-center"
          >
            {extraMode.toUpperCase()} mode — tap runs below
            <button onClick={() => setExtraMode(null)} className="ml-3 text-slate-500 hover:text-slate-300 text-xs">(cancel)</button>
          </motion.div>
        )}

        {/* ── Run buttons ── */}
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 6].map((r) => (
            <button
              key={r}
              onClick={() => extraMode ? handleScore(r, extraMode) : handleScore(r)}
              className={r === 4 ? 'run-btn run-btn-four' : r === 6 ? 'run-btn run-btn-six' : r === 0 ? 'run-btn run-btn-dot' : 'run-btn run-btn-1'}
            >
              {r === 0 ? '•' : r}
            </button>
          ))}
        </div>

        {/* ── Extras row ── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'wide', label: 'Wide', color: 'bg-yellow-900/40 border-yellow-600/50 text-yellow-300 hover:bg-yellow-800/40' },
            { key: 'noball', label: 'No Ball', color: 'bg-orange-900/40 border-orange-600/50 text-orange-300 hover:bg-orange-800/40' },
            { key: 'bye', label: 'Bye', color: 'bg-teal-900/40 border-teal-600/50 text-teal-300 hover:bg-teal-800/40' },
            { key: 'legbye', label: 'Leg Bye', color: 'bg-teal-900/40 border-teal-600/50 text-teal-300 hover:bg-teal-800/40' },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => setExtraMode(extraMode === key ? null : key)}
              className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${color} ${extraMode === key ? 'ring-2 ring-yellow-400/50 scale-95' : ''}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── WICKET button ── */}
        <button
          onClick={() => setShowWicketDialog(true)}
          className="w-full py-4 rounded-xl font-black text-lg tracking-wider
                     bg-red-900/50 border-2 border-red-500 text-red-300
                     hover:bg-red-800/50 hover:border-red-400
                     active:scale-95 transition-all glow-red"
        >
          WICKET
        </button>

        {/* ── Utility buttons ── */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleUndo} className="btn-ghost text-sm flex items-center justify-center gap-2 py-2.5 border border-white/10 rounded-xl">
            <MdUndo size={16} /> Undo Ball
          </button>
          <button onClick={() => engineRef.current?.manualSwapStrike() && refreshUI()} className="btn-ghost text-sm flex items-center justify-center gap-2 py-2.5 border border-white/10 rounded-xl">
            <MdSwapHoriz size={16} /> Swap Strike
          </button>
        </div>

        {/* ── Overlay Controls ── */}
        <div className="card p-3 space-y-2 border-cricket-500/30 mt-4 bg-dark-500/50">
          <div className="text-xs text-cricket-400 font-semibold mb-1 uppercase tracking-wider text-center">Streamlabs Overlays</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => broadcastPlaying11(match?.team1_id)} className="btn-secondary text-xs font-bold flex items-center justify-center py-2.5 rounded-lg border border-white/10 shadow hover:bg-white/10">
              📺 Show {match?.team1?.short_name || 'Team 1'} XI
            </button>
            <button onClick={() => broadcastPlaying11(match?.team2_id)} className="btn-secondary text-xs font-bold flex items-center justify-center py-2.5 rounded-lg border border-white/10 shadow hover:bg-white/10">
              📺 Show {match?.team2?.short_name || 'Team 2'} XI
            </button>
            <button onClick={() => broadcastPlaying11('HIDE')} className="col-span-2 text-xs font-bold flex items-center justify-center py-2.5 rounded-lg border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all">
              ❌ Hide All Overlays
            </button>
          </div>
        </div>

        <div className="h-6" />
      </div>

      {/* ── Dialogs ── */}
      <AnimatePresence>
        {showWicketDialog && (
          <WicketDialog
            players={[...bowlingPlayers]}
            onConfirm={handleWicket}
            onClose={() => setShowWicketDialog(false)}
          />
        )}
        {showNewBatsman && (
          <NewBatsmanDialog
            players={battingPlayers.filter(p => !Object.values(engineRef.current?.battingScorecard || {}).some(bs => bs.id === p.id))}
            onConfirm={handleNewBatsman}
          />
        )}
        {showNewBowler && (
          <NewBowlerDialog
            players={bowlingPlayers}
            previousBowlerId={engineRef.current?.previousBowler}
            onConfirm={handleNewBowler}
          />
        )}
      </AnimatePresence>

      {/* ── Innings Break ── */}
      {showInningsBreak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-300 border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center space-y-4"
          >
            <div className="text-5xl mb-2">🏏</div>
            <h2 className="text-2xl font-black text-white">Innings Over!</h2>
            <div className="score-display text-4xl font-black text-cricket-400">
              {scoreDisplay.score}/{scoreDisplay.wickets}
            </div>
            <p className="text-slate-400 text-sm">({scoreDisplay.overs} overs)</p>
            <p className="text-slate-300">Target: <span className="font-black text-amber-400 text-xl">{scoreDisplay.score + 1}</span></p>
            <button onClick={startInnings2} className="btn-primary w-full py-3">
              Start 2nd Innings
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Match Result ── */}
      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-300 border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center space-y-4"
          >
            <div className="text-5xl">🏆</div>
            <h2 className="text-xl font-black text-cricket-400">Match Over!</h2>
            <p className="text-slate-200 font-semibold text-sm">
              {engineRef.current?.getMatchResult({
                team1Name: match?.team1?.name, team2Name: match?.team2?.name,
                battingFirst: currentInnings, target
              })}
            </p>
            <div className="flex gap-2">
              <Link href={`/matches/${matchId}`} className="btn-primary flex-1 text-sm text-center">
                View Scorecard
              </Link>
              <Link href="/matches" className="btn-secondary flex-1 text-sm text-center">
                All Matches
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
