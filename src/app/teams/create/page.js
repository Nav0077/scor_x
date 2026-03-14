'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiUpload } from 'react-icons/fi';
import Link from 'next/link';

const ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'];
const BATTING_STYLES = ['Right Hand', 'Left Hand'];
const BOWLING_STYLES = ['Right Arm Fast', 'Right Arm Medium', 'Right Arm Off Spin', 'Right Arm Leg Spin', 'Left Arm Fast', 'Left Arm Medium', 'Left Arm Spin'];

function TeamForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({
    name: '', shortName: '', primaryColor: '#22c55e', secondaryColor: '#ffffff',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, logoFile });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Logo upload */}
      <div className="flex items-center gap-5">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0 overflow-hidden border-2 border-dashed border-white/10"
          style={{ background: form.primaryColor }}
        >
          {logoPreview ? (
            <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
          ) : (
            (form.shortName || form.name?.slice(0, 2) || 'T').toUpperCase()
          )}
        </div>
        <label className="cursor-pointer btn-ghost text-sm flex items-center gap-2">
          <FiUpload />
          Upload Logo
          <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Team Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Thunderbolts XI"
            className="input"
          />
        </div>
        <div>
          <label className="label">Short Name (3-5 chars) *</label>
          <input
            required
            maxLength={5}
            value={form.shortName}
            onChange={(e) => set('shortName', e.target.value.toUpperCase())}
            placeholder="e.g. TBX"
            className="input font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => set('primaryColor', e.target.value)}
              className="h-10 w-14 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="text-sm text-slate-400 font-mono">{form.primaryColor}</span>
          </div>
        </div>
        <div>
          <label className="label">Secondary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.secondaryColor}
              onChange={(e) => set('secondaryColor', e.target.value)}
              className="h-10 w-14 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="text-sm text-slate-400 font-mono">{form.secondaryColor}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <Link href="/teams" className="btn-ghost flex-1 text-center text-sm">Cancel</Link>
        <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </span>
          ) : 'Create Team'}
        </button>
      </div>
    </form>
  );
}

export default function CreateTeamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async ({ name, shortName, primaryColor, secondaryColor, logoFile }) => {
    setLoading(true);
    setError('');

    let logo_url = null;

    // Upload logo if provided
    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, logoFile);
      if (uploadError) {
        setError('Logo upload failed: ' + uploadError.message);
        setLoading(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      logo_url = publicUrl;
    }

    const { data, error: insertError } = await supabase.from('teams').insert({
      user_id: user.id,
      name,
      short_name: shortName,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      logo_url,
    }).select().single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/teams/${data.id}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teams" className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="section-title">Create Team</h1>
          <p className="text-slate-500 text-sm">Set up a new cricket team</p>
        </div>
      </div>

      <div className="card p-6">
        <TeamForm onSubmit={handleSubmit} loading={loading} error={error} />
      </div>
    </div>
  );
}
