'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import Link from 'next/link';

export default function CreateTournamentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [format, setFormat] = useState('T20');
  const [overs, setOvers] = useState(20);
  const [tourType, setTourType] = useState('League');
  
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    if (!name.trim()) return setError("Tournament name is required");
    
    const { data, error: err } = await supabase.from('tournaments').insert([{
      name: name.trim(),
      format,
      overs_per_match: overs,
      tournament_type: tourType,
      user_id: user.id
    }]).select().single();
    
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push(`/tournaments/${data.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tournaments" className="w-10 h-10 rounded-xl bg-dark-200/50 hover:bg-dark-100 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <FiArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="section-title">Host Tournament</h1>
          <p className="text-slate-500 text-sm mt-1">Setup your league format and rules</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleCreate} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start gap-3">
              <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Tournament Name <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="input-field max-w-md" placeholder="e.g. ScorX Premier League 2024" required />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Match Format</label>
              <select value={format} onChange={e => {
                setFormat(e.target.value);
                if (e.target.value === 'T20') setOvers(20);
                if (e.target.value === 'T10') setOvers(10);
                if (e.target.value === 'ODI') setOvers(50);
                if (e.target.value === 'Test') setOvers(90);
              }} className="input-field w-full">
                <option value="T20">T20</option>
                <option value="T10">T10</option>
                <option value="ODI">ODI</option>
                <option value="Test">Test Match</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Overs Per Match</label>
              <input type="number" value={overs} onChange={e => setOvers(parseInt(e.target.value))}
                min="1" max="100" className="input-field w-full" disabled={['T20','T10','ODI'].includes(format)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-3">Tournament Style</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { id: 'Round Robin', label: 'League (Round Robin)' },
                { id: 'Knockout', label: 'Knockout Series' },
                { id: 'Group + Knockout', label: 'Groups & Playoffs' }
              ].map(t => (
                <button type="button" key={t.id} onClick={() => setTourType(t.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${tourType === t.id ? 'border-cricket-500 bg-cricket-500/10' : 'border-white/5 bg-white/3 hover:border-white/20'}`}>
                  <div className={`font-bold ${tourType === t.id ? 'text-cricket-400' : 'text-slate-300'}`}>{t.label}</div>
                  <div className="text-xs mt-1 text-slate-500">
                    {t.id === 'Round Robin' ? 'Everyone plays everyone' : t.id === 'Knockout' ? 'Lose and you are out' : 'Group stage + knockouts'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button type="submit" disabled={loading} className="btn-primary min-w-[150px]">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block mx-auto" /> : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
