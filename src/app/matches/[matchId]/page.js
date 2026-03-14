'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi';
import { MdOutlineBarChart } from 'react-icons/md';

const TABS = ['Scorecard', 'Commentary'];

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const supabase = createClient();
  const [match, setMatch] = useState(null);
  const [innings1, setInnings1] = useState(null);
  const [innings2, setInnings2] = useState(null);
  const [batting1, setBatting1] = useState([]);
  const [bowling1, setBowling1] = useState([]);
  const [batting2, setBatting2] = useState([]);
  const [bowling2, setBowling2] = useState([]);
  const [fow1, setFow1] = useState([]);
  const [fow2, setFow2] = useState([]);
  const [balls, setBalls] = useState([]);
  const [activeTab, setActiveTab] = useState('Scorecard');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMatch(); }, [matchId]);

  const loadMatch = async () => {
    const { data: m } = await supabase.from('matches').select(`
      *, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)
    `).eq('id', matchId).single();
    setMatch(m);

    const { data: innings } = await supabase.from('innings').select('*').eq('match_id', matchId).order('innings_number');
    const i1 = innings?.find(i => i.innings_number === 1);
    const i2 = innings?.find(i => i.innings_number === 2);
    setInnings1(i1); setInnings2(i2);

    if (i1) {
      const [{ data: bat }, { data: bowl }, { data: fow }] = await Promise.all([
        supabase.from('batting_scorecard').select('*').eq('innings_id', i1.id).order('batting_position'),
        supabase.from('bowling_scorecard').select('*').eq('innings_id', i1.id).order('overs_bowled', {ascending: false}),
        supabase.from('fall_of_wickets').select('*').eq('innings_id', i1.id).order('wicket_number'),
      ]);
      setBatting1(bat || []); setBowling1(bowl || []); setFow1(fow || []);
    }
    if (i2) {
      const [{ data: bat }, { data: bowl }, { data: fow }] = await Promise.all([
        supabase.from('batting_scorecard').select('*').eq('innings_id', i2.id).order('batting_position'),
        supabase.from('bowling_scorecard').select('*').eq('innings_id', i2.id).order('overs_bowled', {ascending: false}),
        supabase.from('fall_of_wickets').select('*').eq('innings_id', i2.id).order('wicket_number'),
      ]);
      setBatting2(bat || []); setBowling2(bowl || []); setFow2(fow || []);
    }

    const { data: ballsData } = await supabase.from('balls').select('*')
      .eq('match_id', matchId).order('ball_sequence');
    setBalls(ballsData || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-cricket-500/30 border-t-cricket-500 rounded-full animate-spin" />
    </div>
  );

  if (!match) return <div className="text-slate-400 text-center py-12">Match not found.</div>;

  const isLive = ['live_innings1','live_innings2','innings_break'].includes(match.status);

  function BattingTable({ scorecard, innings, teamName }) {
    if (!scorecard.length) return null;
    const extras = innings;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300">{teamName} Batting</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table-scoreboard w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-2 text-slate-500">Batsman</th>
                <th className="text-slate-500 py-2 px-2">Dismissal</th>
                <th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.map((b) => (
                <tr key={b.id} className={`border-b border-white/5 hover:bg-white/3 ${b.is_striker || b.is_non_striker ? 'bg-cricket-500/5' : ''}`}>
                  <td className="py-2 px-2">
                    <span className="font-semibold text-slate-200">{b.player_name}</span>
                    {b.is_striker && <span className="text-cricket-400 ml-1">*</span>}
                    {b.is_non_striker && <span className="text-slate-500 ml-1">(running)</span>}
                  </td>
                  <td className="py-2 px-2 text-slate-500 text-xs">
                    {b.is_out ? b.dismissal_text || b.dismissal_type : (!b.is_striker && !b.is_non_striker ? 'did not bat' : 'not out')}
                  </td>
                  <td className="font-bold text-white">{b.runs_scored}</td>
                  <td>{b.balls_faced}</td>
                  <td>{b.fours}</td>
                  <td>{b.sixes}</td>
                  <td className="text-slate-400">{b.balls_faced > 0 ? ((b.runs_scored/b.balls_faced)*100).toFixed(1) : '0.0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {innings && (
          <div className="flex justify-between text-xs text-slate-500 px-2 py-1.5 bg-white/3 rounded">
            <span>Extras: {innings.total_extras} (wd {innings.extras_wides}, nb {innings.extras_noballs}, b {innings.extras_byes}, lb {innings.extras_legbyes})</span>
            <span className="font-bold text-slate-200">Total: {innings.total_score}/{innings.total_wickets} ({innings.total_overs} ov)</span>
          </div>
        )}
      </div>
    );
  }

  function BowlingTable({ scorecard, teamName }) {
    if (!scorecard.length) return null;
    return (
      <div className="space-y-2 mt-4">
        <h3 className="text-sm font-bold text-slate-300">{teamName} Bowling</h3>
        <div className="overflow-x-auto">
          <table className="table-scoreboard w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-2 text-slate-500">Bowler</th>
                <th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th><th>Wd</th><th>NB</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.map((b) => (
                <tr key={b.id} className={`border-b border-white/5 ${b.is_current_bowler ? 'bg-cricket-500/5' : ''}`}>
                  <td className="py-2 px-2 font-semibold text-slate-200">
                    {b.player_name}{b.is_current_bowler && <span className="text-cricket-400 ml-1">*</span>}
                  </td>
                  <td>{b.overs_bowled}</td>
                  <td>{b.maidens}</td>
                  <td className="font-bold text-white">{b.runs_conceded}</td>
                  <td className="font-bold text-cricket-400">{b.wickets_taken}</td>
                  <td className="text-slate-400">{b.economy_rate || '-'}</td>
                  <td>{b.wides}</td>
                  <td>{b.no_balls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Auto-generate commentary for a ball
  function ballCommentary(ball) {
    if (ball.is_wicket) return `WICKET! ${ball.wicket_type?.replace('_',' ') || 'Out'}`;
    if (ball.is_six)    return `SIX! Massive hit over the boundary`;
    if (ball.is_boundary) return `FOUR! Racing to the boundary`;
    if (ball.extra_type === 'wide') return `Wide ball`;
    if (ball.extra_type === 'noball') return `No Ball!`;
    if (ball.runs_scored === 0) return `Dot ball. Defended back`;
    return `${ball.runs_scored} run${ball.runs_scored > 1 ? 's' : ''}`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/matches" className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
          <FiArrowLeft />
        </Link>
        <div className="flex-1" />
        {isLive && (
          <Link href={`/matches/${matchId}/score`} className="btn-primary text-sm flex items-center gap-2">
            Live Score →
          </Link>
        )}
        <Link href={`/scoreboard/${matchId}?theme=modern`} target="_blank" className="btn-ghost text-sm flex items-center gap-2">
          <FiExternalLink size={14} /> OBS Overlay
        </Link>
        <Link href={`/matches/${matchId}/analytics`} className="btn-ghost text-sm flex items-center gap-2">
          <MdOutlineBarChart /> Analytics
        </Link>
      </div>

      {/* Match Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <span className={`badge ${isLive ? 'badge-live' : match.status === 'completed' ? 'badge-gray' : 'badge-blue'}`}>
            {isLive && <span className="live-dot mr-1" />}
            {isLive ? 'LIVE' : match.status === 'completed' ? 'Result' : 'Upcoming'}
          </span>
          <span className="text-xs text-slate-500">{match.venue || 'Unknown venue'} · {new Date(match.match_date).toLocaleDateString()} · {match.overs} overs</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-base font-bold text-slate-200">{match.team1?.name || match.team1_name}</div>
            <div className="score-display text-3xl font-black text-white mt-1">
              {match.innings1_batting_team === match.team1_id
                ? `${match.innings1_score}/${match.innings1_wickets}`
                : `${match.innings2_score || '-'}/${match.innings2_wickets || 0}`}
              <span className="text-slate-500 text-sm font-normal ml-1">
                ({match.innings1_batting_team === match.team1_id ? match.innings1_overs : match.innings2_overs || 0} ov)
              </span>
            </div>
          </div>
          <div className="text-slate-600 font-bold text-sm">vs</div>
          <div className="flex-1 text-right">
            <div className="text-base font-bold text-slate-200">{match.team2?.name || match.team2_name}</div>
            <div className="score-display text-3xl font-black text-white mt-1">
              {match.innings1_batting_team === match.team2_id
                ? `${match.innings1_score}/${match.innings1_wickets}`
                : `${match.innings2_score || '-'}/${match.innings2_wickets || 0}`}
              <span className="text-slate-500 text-sm font-normal ml-1">
                ({match.innings1_batting_team === match.team2_id ? match.innings1_overs : match.innings2_overs || 0} ov)
              </span>
            </div>
          </div>
        </div>

        {match.result_text && (
          <div className="mt-4 pt-4 border-t border-white/5 text-sm font-semibold text-cricket-400">
            {match.result_text}
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-dark-100/50 rounded-lg p-1 border border-white/5 w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-cricket-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Scorecard Tab */}
      {activeTab === 'Scorecard' && (
        <div className="space-y-6">
          {/* Innings 1 */}
          {innings1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 space-y-3">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">1st Innings</div>
              <BattingTable
                scorecard={batting1}
                innings={innings1}
                teamName={match.innings1_batting_team === match.team1_id ? match.team1?.name : match.team2?.name}
              />
              {fow1.length > 0 && (
                <div className="text-xs text-slate-500 pt-2 border-t border-white/5">
                  <span className="font-semibold">FOW: </span>
                  {fow1.map((f, i) => (
                    <span key={f.id}>
                      {f.score}-{f.wicket_number} ({f.batsman_name}, {f.overs_at_fall} ov){i < fow1.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
              <BowlingTable
                scorecard={bowling1}
                teamName={match.innings1_batting_team === match.team1_id ? match.team2?.name : match.team1?.name}
              />
            </motion.div>
          )}

          {/* Innings 2 */}
          {innings2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4 space-y-3">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">2nd Innings {innings2.target && <span className="text-amber-400 ml-2">Target: {innings2.target}</span>}</div>
              <BattingTable
                scorecard={batting2}
                innings={innings2}
                teamName={match.innings2_batting_team === match.team1_id ? match.team1?.name : match.team2?.name}
              />
              {fow2.length > 0 && (
                <div className="text-xs text-slate-500 pt-2 border-t border-white/5">
                  <span className="font-semibold">FOW: </span>
                  {fow2.map((f, i) => (
                    <span key={f.id}>
                      {f.score}-{f.wicket_number} ({f.batsman_name}, {f.overs_at_fall} ov){i < fow2.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
              <BowlingTable
                scorecard={bowling2}
                teamName={match.innings2_batting_team === match.team1_id ? match.team2?.name : match.team1?.name}
              />
            </motion.div>
          )}
        </div>
      )}

      {/* Commentary Tab */}
      {activeTab === 'Commentary' && (
        <div className="card p-4 space-y-2 max-h-[600px] overflow-y-auto">
          {balls.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No balls recorded yet.</p>
          ) : (
            [...balls].reverse().map((ball) => (
              <div key={ball.id} className={`flex gap-3 py-2 border-b border-white/5 text-sm
                ${ball.is_wicket ? 'text-red-400' : ball.is_six ? 'text-purple-400' : ball.is_boundary ? 'text-blue-400' : 'text-slate-400'}`}>
                <span className="text-slate-600 font-mono text-xs shrink-0 pt-0.5">
                  {ball.over_number}.{ball.ball_number}
                </span>
                <span>{ballCommentary(ball)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
