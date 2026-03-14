'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiCheck } from 'react-icons/fi';
import { MdSportsCricket } from 'react-icons/md';

const OVER_OPTIONS = [5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];

const STEPS = ['Setup', 'Toss', 'Playing XI', 'Openers', 'Confirm'];

export default function CreateMatchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState([]);

  // Form fields
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [overs, setOvers] = useState(20);
  const [customOvers, setCustomOvers] = useState('');
  const [venue, setVenue] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 16));
  const [tournamentId, setTournamentId] = useState('');
  const [tournaments, setTournaments] = useState([]);

  // Toss
  const [tossWonBy, setTossWonBy] = useState('');
  const [tossDecision, setTossDecision] = useState('');

  // Playing XI
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [playing11Team1, setPlaying11Team1] = useState([]);
  const [playing11Team2, setPlaying11Team2] = useState([]);

  // Openers
  const [battingTeamId, setBattingTeamId] = useState('');
  const [bowlingTeamId, setBowlingTeamId] = useState('');
  const [opener1, setOpener1] = useState('');
  const [opener2, setOpener2] = useState('');
  const [openingBowler, setOpeningBowler] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: t }, { data: tour }] = await Promise.all([
        supabase.from('teams').select('id, name, short_name, primary_color, logo_url').eq('user_id', user.id),
        supabase.from('tournaments').select('id, name').eq('user_id', user.id).eq('status', 'upcoming'),
      ]);
      setTeams(t || []);
      setTournaments(tour || []);
    })();
  }, [user]);

  useEffect(() => {
    if (team1Id) {
      supabase.from('players').select('*').eq('team_id', team1Id).then(({ data }) => setTeam1Players(data || []));
    }
  }, [team1Id]);

  useEffect(() => {
    if (team2Id) {
      supabase.from('players').select('*').eq('team_id', team2Id).then(({ data }) => setTeam2Players(data || []));
    }
  }, [team2Id]);

  useEffect(() => {
    if (tossWonBy && tossDecision) {
      const bat = tossDecision === 'bat' ? tossWonBy : (tossWonBy === team1Id ? team2Id : team1Id);
      const bowl = bat === team1Id ? team2Id : team1Id;
      setBattingTeamId(bat);
      setBowlingTeamId(bowl);
    }
  }, [tossWonBy, tossDecision]);

  const effectiveOvers = customOvers ? parseInt(customOvers) : overs;
  const team1 = teams.find(t => t.id === team1Id);
  const team2 = teams.find(t => t.id === team2Id);
  const battingTeam = teams.find(t => t.id === battingTeamId);
  const bowlingTeam = teams.find(t => t.id === bowlingTeamId);
  const battingPlaying11 = battingTeamId === team1Id ? playing11Team1 : playing11Team2;
  const bowlingPlaying11 = bowlingTeamId === team1Id ? playing11Team1 : playing11Team2;

  const togglePlayer = (setFn, playerId) =>
    setFn(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);

  const canProceed = [
    team1Id && team2Id && team1Id !== team2Id && effectiveOvers >= 1,
    tossWonBy && tossDecision,
    playing11Team1.length >= 2 && playing11Team2.length >= 2,
    opener1 && opener2 && opener1 !== opener2 && openingBowler,
    true,
  ][step];

  const startMatch = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Create match
      const { data: match, error: matchErr } = await supabase.from('matches').insert({
        user_id: user.id,
        tournament_id: tournamentId || null,
        team1_id: team1Id, team2_id: team2Id,
        team1_name: team1.name, team2_name: team2.name,
        overs: effectiveOvers,
        venue: venue || null,
        match_date: matchDate,
        toss_won_by: tossWonBy,
        toss_decision: tossDecision,
        innings1_batting_team: battingTeamId,
        innings2_batting_team: bowlingTeamId,
        status: 'live_innings1',
        current_innings: 1,
      }).select().single();

      if (matchErr) throw matchErr;

      // 2. Create innings 1
      const { data: innings, error: inningsErr } = await supabase.from('innings').insert({
        match_id: match.id,
        innings_number: 1,
        batting_team_id: battingTeamId,
        bowling_team_id: bowlingTeamId,
        status: 'in_progress',
      }).select().single();

      if (inningsErr) throw inningsErr;

      // 3. Create batting scorecard entries for openers
      const battingPlayers = battingTeamId === team1Id ? team1Players : team2Players;
      const op1 = battingPlayers.find(p => p.id === opener1);
      const op2 = battingPlayers.find(p => p.id === opener2);
      const allBatting = battingTeamId === team1Id ? playing11Team1 : playing11Team2;

      await supabase.from('batting_scorecard').insert([
        { innings_id: innings.id, match_id: match.id, player_id: op1.id, player_name: op1.name, batting_position: 1, is_striker: true },
        { innings_id: innings.id, match_id: match.id, player_id: op2.id, player_name: op2.name, batting_position: 2, is_non_striker: true },
      ]);

      // 4. Create bowling scorecard entry for opening bowler
      const bowlingPlayers = bowlingTeamId === team1Id ? team1Players : team2Players;
      const obowler = bowlingPlayers.find(p => p.id === openingBowler);
      await supabase.from('bowling_scorecard').insert({
        innings_id: innings.id, match_id: match.id,
        player_id: obowler.id, player_name: obowler.name,
        bowling_position: 1, is_current_bowler: true,
      });

      router.push(`/matches/${match.id}/score`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/matches" className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="section-title">New Match</h1>
          <p className="text-slate-500 text-sm">Set up your cricket match</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
              ${i < step ? 'bg-cricket-600 text-white' : i === step ? 'bg-cricket-500 text-white' : 'bg-dark-100 text-slate-500'}`}>
              {i < step ? <FiCheck size={12} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full transition-colors ${i < step ? 'bg-cricket-600' : 'bg-dark-100'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-500 font-medium">Step {step + 1}: {STEPS[step]}</div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="card p-6 space-y-4"
        >
          {/* STEP 0: Basic Setup */}
          {step === 0 && (
            <>
              <h2 className="font-bold text-white text-lg">Match Setup</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Team 1 *</label>
                  <select value={team1Id} onChange={e => { setTeam1Id(e.target.value); setPlaying11Team1([]); }} className="input">
                    <option value="">Select team</option>
                    {teams.filter(t => t.id !== team2Id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Team 2 *</label>
                  <select value={team2Id} onChange={e => { setTeam2Id(e.target.value); setPlaying11Team2([]); }} className="input">
                    <option value="">Select team</option>
                    {teams.filter(t => t.id !== team1Id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Overs per innings *</label>
                <div className="flex flex-wrap gap-2">
                  {OVER_OPTIONS.map(o => (
                    <button key={o} type="button" onClick={() => { setOvers(o); setCustomOvers(''); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border
                        ${overs === o && !customOvers ? 'bg-cricket-600 border-cricket-500 text-white' : 'bg-dark-100 border-white/10 text-slate-300 hover:border-cricket-500/50'}`}>
                      {o}
                    </button>
                  ))}
                  <input
                    type="number" min={1} max={100}
                    value={customOvers}
                    onChange={(e) => { setCustomOvers(e.target.value); setOvers(0); }}
                    placeholder="Custom"
                    className="input w-24 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Venue</label>
                  <input value={venue} onChange={e => setVenue(e.target.value)} className="input" placeholder="Stadium / Ground name" />
                </div>
                <div>
                  <label className="label">Match Date</label>
                  <input type="datetime-local" value={matchDate} onChange={e => setMatchDate(e.target.value)} className="input" />
                </div>
              </div>

              {tournaments.length > 0 && (
                <div>
                  <label className="label">Link to Tournament (optional)</label>
                  <select value={tournamentId} onChange={e => setTournamentId(e.target.value)} className="input">
                    <option value="">None</option>
                    {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {/* STEP 1: Toss */}
          {step === 1 && (
            <>
              <h2 className="font-bold text-white text-lg">Toss</h2>
              <div>
                <p className="label">Who won the toss?</p>
                <div className="flex gap-3 mt-2">
                  {[team1, team2].filter(Boolean).map(t => (
                    <button key={t.id} type="button" onClick={() => setTossWonBy(t.id)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all
                        ${tossWonBy === t.id ? 'border-cricket-500 bg-cricket-500/15 text-cricket-300' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              {tossWonBy && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="label">Chose to…</p>
                  <div className="flex gap-3 mt-2">
                    {['bat', 'bowl'].map(d => (
                      <button key={d} type="button" onClick={() => setTossDecision(d)}
                        className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 capitalize transition-all
                          ${tossDecision === d ? 'border-cricket-500 bg-cricket-500/15 text-cricket-300' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {battingTeam && bowlingTeam && (
                <div className="p-3 rounded-lg bg-cricket-500/10 border border-cricket-500/20 text-sm text-cricket-300">
                  🏏 <strong>{battingTeam.name}</strong> will bat first · <strong>{bowlingTeam.name}</strong> will bowl
                </div>
              )}
            </>
          )}

          {/* STEP 2: Playing XI */}
          {step === 2 && (
            <>
              <h2 className="font-bold text-white text-lg">Select Playing XI</h2>
              {[{teamId: team1Id, players: team1Players, playing11: playing11Team1, setFn: setPlaying11Team1, team: team1},
                {teamId: team2Id, players: team2Players, playing11: playing11Team2, setFn: setPlaying11Team2, team: team2}
              ].map(({team, players, playing11, setFn}) => (
                <div key={team?.id}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-200">{team?.name}</label>
                    <span className="text-xs text-slate-500">{playing11.length} selected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {players.map(p => (
                      <button key={p.id} type="button" onClick={() => togglePlayer(setFn, p.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all text-left
                          ${playing11.includes(p.id) ? 'border-cricket-500 bg-cricket-500/10 text-cricket-300' : 'border-white/5 text-slate-400 hover:border-white/15'}`}>
                        <div className="w-6 h-6 rounded-full bg-cricket-600/30 flex items-center justify-center font-bold shrink-0" style={{ background: team?.primary_color }}>
                          {p.name?.slice(0,1)}
                        </div>
                        <span className="truncate">{p.name}</span>
                        {p.is_captain && <span className="text-amber-400 ml-auto">(C)</span>}
                      </button>
                    ))}
                  </div>
                  {players.length === 0 && <p className="text-xs text-slate-500">No players found. <Link href={`/teams/${team?.id}/players/add`} className="text-cricket-400 underline">Add players</Link></p>}
                </div>
              ))}
            </>
          )}

          {/* STEP 3: Opening Players */}
          {step === 3 && battingTeam && bowlingTeam && (
            <>
              <h2 className="font-bold text-white text-lg">Opening Players</h2>
              <div>
                <label className="label">Opening Batsmen ({battingTeam.name})</label>
                <div className="grid grid-cols-2 gap-2">
                  {battingPlaying11.map(pid => {
                    const p = (battingTeamId === team1Id ? team1Players : team2Players).find(x => x.id === pid);
                    if (!p) return null;
                    return (
                      <button key={p.id} type="button"
                        onClick={() => {
                          if (opener1 === p.id) { setOpener1(''); }
                          else if (opener2 === p.id) { setOpener2(''); }
                          else if (!opener1) setOpener1(p.id);
                          else if (!opener2) setOpener2(p.id);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all
                          ${opener1 === p.id ? 'border-cricket-500 bg-cricket-500/10 text-cricket-300' : opener2 === p.id ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-white/5 text-slate-400 hover:border-white/15'}`}>
                        <div className="w-5 h-5 rounded-full bg-cricket-600/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {opener1 === p.id ? '🏏' : opener2 === p.id ? '2' : p.name?.slice(0,1)}
                        </div>
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
                {opener1 && opener2 && (
                  <p className="text-xs text-cricket-400 mt-2">
                    Striker: {battingTeamId === team1Id
                      ? team1Players.find(p => p.id === opener1)?.name
                      : team2Players.find(p => p.id === opener1)?.name}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Opening Bowler ({bowlingTeam.name})</label>
                <div className="grid grid-cols-2 gap-2">
                  {bowlingPlaying11.map(pid => {
                    const p = (bowlingTeamId === team1Id ? team1Players : team2Players).find(x => x.id === pid);
                    if (!p) return null;
                    return (
                      <button key={p.id} type="button" onClick={() => setOpeningBowler(p.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all
                          ${openingBowler === p.id ? 'border-cricket-500 bg-cricket-500/10 text-cricket-300' : 'border-white/5 text-slate-400 hover:border-white/15'}`}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: bowlingTeam?.primary_color }}>
                          {p.name?.slice(0,1)}
                        </div>
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* STEP 4: Confirm */}
          {step === 4 && (
            <>
              <h2 className="font-bold text-white text-lg">Ready to Start?</h2>
              <div className="space-y-3">
                <InfoRow label="Match" value={`${team1?.name} vs ${team2?.name}`} />
                <InfoRow label="Format" value={`${effectiveOvers}-over match`} />
                <InfoRow label="Venue" value={venue || 'Not specified'} />
                <InfoRow label="Toss" value={`${teams.find(t=>t.id===tossWonBy)?.name} won, chose to ${tossDecision}`} />
                <InfoRow label="Batting" value={battingTeam?.name} />
                <InfoRow label="Bowling" value={bowlingTeam?.name} />
              </div>
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex items-center gap-2">
            <FiArrowLeft /> Back
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <button
            disabled={!canProceed}
            onClick={() => setStep(s => s + 1)}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            Next <FiArrowRight />
          </button>
        ) : (
          <button
            disabled={loading}
            onClick={startMatch}
            className="btn-primary flex items-center gap-2 px-8 disabled:opacity-50"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting...</>
            ) : (
              <><MdSportsCricket /> Start Match</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm border-b border-white/5 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}
