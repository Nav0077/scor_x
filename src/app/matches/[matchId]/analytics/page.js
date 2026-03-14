'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell
} from 'recharts';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });

const WAGON_ZONES = [
  { id: 1, name: 'Third Man', angle: 45 },
  { id: 2, name: 'Point', angle: 90 },
  { id: 3, name: 'Cover', angle: 135 },
  { id: 4, name: 'Mid Off', angle: 160 },
  { id: 5, name: 'Mid On', angle: 200 },
  { id: 6, name: 'Mid Wicket', angle: 225 },
  { id: 7, name: 'Square Leg', angle: 270 },
  { id: 8, name: 'Fine Leg', angle: 315 }
];

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#f43f5e', '#8b5cf6'];

export default function AnalyticsPage() {
  const { matchId } = useParams();
  const [supabase] = useState(() => createClient());
  const [match, setMatch] = useState(null);
  const [balls, setBalls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats Data
  const [manhattanData, setManhattanData] = useState([]);
  const [wormData, setWormData] = useState([]);
  const [runDist1, setRunDist1] = useState([]);
  const [runDist2, setRunDist2] = useState([]);

  useEffect(() => { loadAnalytics(); }, [matchId]);

  const loadAnalytics = async () => {
    const { data: m } = await supabase.from('matches').select(`
      *, team1:teams!matches_team1_id_fkey(name), team2:teams!matches_team2_id_fkey(name)
    `).eq('id', matchId).single();
    if (!m) return;
    setMatch(m);

    const { data: b } = await supabase.from('balls').select('*').eq('match_id', matchId).order('ball_sequence');
    setBalls(b || []);

    processCharts(b || [], m);
    setLoading(false);
  };

  const processCharts = (ballsData, m) => {
    const maxOvers = m.overs;
    let i1Manhattan = Array(maxOvers).fill(0);
    let i2Manhattan = Array(maxOvers).fill(0);
    
    let i1Worm = [];
    let i2Worm = [];
    let i1RunningTotal = 0;
    let i2RunningTotal = 0;

    let dist1 = { 0:0, 1:0, 2:0, 3:0, 4:0, 6:0, extras:0 };
    let dist2 = { 0:0, 1:0, 2:0, 3:0, 4:0, 6:0, extras:0 };

    ballsData.forEach(ball => {
      const isI1 = ball.innings_id === (m.innings1_batting_team === m.team1_id ? null /* need innings id comparison, simplify for now */ : null);
      // Wait, matches table just has innings ID references but balls has innings_id. Let's group by innings implicitly by checking ball sequence or just sort them into two arrays.
    });

    // Let's do a better grouping
    const i1Balls = ballsData.filter(b => b.over_number !== undefined && b.ball_sequence < ballsData.findIndex(x => x.over_number === 0 && x.ball_sequence > 0)); 
    // This is tricky without innings_number on the ball table. Let's assume balls are ordered and split by innings boundary (when over_number resets to 0)
    
    let currentInnings = 1;
    let lastOver = -1;
    ballsData.forEach(ball => {
      if (ball.over_number === 0 && lastOver > 0) currentInnings = 2;
      lastOver = ball.over_number;

      const overIdx = ball.over_number;
      if (currentInnings === 1) {
        if (i1Manhattan[overIdx] !== undefined) i1Manhattan[overIdx] += ball.total_runs;
        i1RunningTotal += ball.total_runs;
        if (!i1Worm[overIdx]) i1Worm[overIdx] = 0;
        i1Worm[overIdx] = i1RunningTotal;

        if (ball.extras > 0) dist1.extras += ball.extras;
        else if (dist1[ball.runs_scored] !== undefined) dist1[ball.runs_scored] += 1;

      } else {
        if (i2Manhattan[overIdx] !== undefined) i2Manhattan[overIdx] += ball.total_runs;
        i2RunningTotal += ball.total_runs;
        if (!i2Worm[overIdx]) i2Worm[overIdx] = 0;
        i2Worm[overIdx] = i2RunningTotal;

        if (ball.extras > 0) dist2.extras += ball.extras;
        else if (dist2[ball.runs_scored] !== undefined) dist2[ball.runs_scored] += 1;
      }
    });

    // Fill gaps in worm
    for (let i = 0; i < maxOvers; i++) {
        if (i > 0 && i1Worm[i] === undefined) i1Worm[i] = i1Worm[i-1] || 0;
        if (i > 0 && i2Worm[i] === undefined) i2Worm[i] = i2Worm[i-1] || 0;
    }

    const t1Name = m.team1?.name || 'Team 1';
    const t2Name = m.team2?.name || 'Team 2';
    const bat1Name = m.innings1_batting_team === m.team1_id ? t1Name : t2Name;
    const bat2Name = m.innings2_batting_team === m.team1_id ? t1Name : t2Name;

    const manhattan = Array.from({length: maxOvers}).map((_, i) => ({
      over: i + 1,
      [bat1Name]: i1Manhattan[i] || 0,
      [bat2Name]: i2Manhattan[i] || 0,
    }));
    
    const worm = Array.from({length: maxOvers}).map((_, i) => ({
      over: i + 1,
      [bat1Name]: i1Worm[i] || 0,
      [bat2Name]: i2Worm[i] || 0,
    }));

    setManhattanData(manhattan);
    setWormData(worm);

    setRunDist1(Object.keys(dist1).filter(k=>dist1[k]>0).map(k => ({ name: k==='extras'?'Extras':`${k}s`, value: dist1[k] })));
    setRunDist2(Object.keys(dist2).filter(k=>dist2[k]>0).map(k => ({ name: k==='extras'?'Extras':`${k}s`, value: dist2[k] })));
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-cricket-500/30 border-t-cricket-500 rounded-full animate-spin" /></div>;

  const t1Name = match?.team1?.name || 'Team 1';
  const t2Name = match?.team2?.name || 'Team 2';
  const bat1Name = match?.innings1_batting_team === match?.team1_id ? t1Name : t2Name;
  const bat2Name = match?.innings2_batting_team === match?.team1_id ? t1Name : t2Name;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/matches/${matchId}`} className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="section-title">Match Analytics</h1>
          <p className="text-slate-500 text-sm">In-depth statistics and charts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worm Chart */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-200 mb-4">Worm (Run Progression)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wormData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="over" stroke="#64748b" fontSize={12} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Line type="stepAfter" dataKey={bat1Name} stroke="#22c55e" strokeWidth={3} dot={false} />
                {match?.current_innings === 2 && (
                  <Line type="stepAfter" dataKey={bat2Name} stroke="#3b82f6" strokeWidth={3} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Manhattan Chart */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-200 mb-4">Manhattan (Runs per Over)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={manhattanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="over" stroke="#64748b" fontSize={12} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey={bat1Name} fill="#22c55e" radius={[2, 2, 0, 0]} />
                {match?.current_innings === 2 && (
                  <Bar dataKey={bat2Name} fill="#3b82f6" radius={[2, 2, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Run Distribution */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-200 mb-4">Run Distribution ({bat1Name})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={runDist1} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {runDist1.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {match?.current_innings === 2 && (
          <div className="card p-5">
            <h3 className="font-bold text-slate-200 mb-4">Run Distribution ({bat2Name})</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={runDist2} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {runDist2.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
