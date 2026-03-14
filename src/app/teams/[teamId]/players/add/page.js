'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { FiArrowLeft, FiUpload } from 'react-icons/fi';

const ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'];
const BAT_STYLES = ['Right Hand', 'Left Hand'];
const BOWL_STYLES = ['Right Arm Fast', 'Right Arm Medium Fast', 'Right Arm Off Spin', 'Right Arm Leg Spin', 'Left Arm Fast', 'Left Arm Medium', 'Left Arm Spin', 'N/A'];

export default function AddPlayerPage() {
  const { teamId } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    name: '', role: 'Batsman', battingStyle: 'Right Hand', bowlingStyle: 'N/A',
    jerseyNumber: '', isCaptain: false, isWK: false,
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let photo_url = null;
    if (photoFile) {
      const path = `${teamId}/${Date.now()}.${photoFile.name.split('.').pop()}`;
      await supabase.storage.from('photos').upload(path, photoFile);
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
      photo_url = publicUrl;
    }

    const { error: err } = await supabase.from('players').insert({
      team_id: teamId,
      name: form.name,
      role: form.role,
      batting_style: form.battingStyle,
      bowling_style: form.bowlingStyle,
      jersey_number: form.jerseyNumber ? parseInt(form.jerseyNumber) : null,
      is_captain: form.isCaptain,
      is_wk: form.isWK,
      photo_url,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push(`/teams/${teamId}`);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/teams/${teamId}`} className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
          <FiArrowLeft />
        </Link>
        <h1 className="section-title">Add Player</h1>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-dark-100 border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center text-slate-500 text-xl font-bold">
              {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" alt="preview" /> : (form.name?.slice(0, 2) || '?').toUpperCase()}
            </div>
            <label className="cursor-pointer btn-ghost text-sm flex items-center gap-2">
              <FiUpload size={14} />
              Upload Photo
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>

          <div>
            <label className="label">Player Name *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="input" placeholder="Full name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)} className="input">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Jersey No.</label>
              <input type="number" min={1} max={99} value={form.jerseyNumber} onChange={(e) => set('jerseyNumber', e.target.value)} className="input" placeholder="#" />
            </div>
          </div>

          <div>
            <label className="label">Batting Style</label>
            <select value={form.battingStyle} onChange={(e) => set('battingStyle', e.target.value)} className="input">
              {BAT_STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Bowling Style</label>
            <select value={form.bowlingStyle} onChange={(e) => set('bowlingStyle', e.target.value)} className="input">
              {BOWL_STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="relative">
                <input type="checkbox" checked={form.isCaptain} onChange={(e) => set('isCaptain', e.target.checked)} className="sr-only" />
                <div className={`w-10 h-6 rounded-full transition-colors ${form.isCaptain ? 'bg-cricket-600' : 'bg-dark-100'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${form.isCaptain ? 'translate-x-4' : ''}`} />
                </div>
              </span>
              <span className="text-sm text-slate-300">Captain</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="relative">
                <input type="checkbox" checked={form.isWK} onChange={(e) => set('isWK', e.target.checked)} className="sr-only" />
                <div className={`w-10 h-6 rounded-full transition-colors ${form.isWK ? 'bg-cricket-600' : 'bg-dark-100'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${form.isWK ? 'translate-x-4' : ''}`} />
                </div>
              </span>
              <span className="text-sm text-slate-300">Wicket Keeper</span>
            </label>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Link href={`/teams/${teamId}`} className="btn-ghost flex-1 text-center text-sm">Cancel</Link>
            <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
