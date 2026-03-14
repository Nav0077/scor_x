'use client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { FiSettings, FiUser, FiShield } from 'react-icons/fi';
import { MdPalette, MdCloudUpload, MdNotifications } from 'react-icons/md';

export default function SettingsPage() {
  const { profile, user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your ScorX account and preferences</p>
      </div>

      {/* Profile section */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2"><FiUser /> Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-cricket-600 flex items-center justify-center text-xl font-black text-white">
            {(profile?.full_name || user?.email || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-100">{profile?.full_name || 'Unnamed Scorer'}</div>
            <div className="text-sm text-slate-400">{user?.email}</div>
            <div className="badge badge-gray mt-1">{profile?.role || 'scorer'}</div>
          </div>
        </div>
      </div>

      {/* Settings nav cards */}
      <div className="space-y-3">
        {[
          { href: '/settings/themes', icon: MdPalette, title: 'Theme Customization', desc: 'Change app and scoreboard themes, custom colors', color: 'text-purple-400 bg-purple-500/10' },
          { href: '/settings/backup', icon: MdCloudUpload, title: 'Cloud Backup', desc: 'Export and restore your match data', color: 'text-blue-400 bg-blue-500/10' },
        ].map(({ href, icon: Icon, title, desc, color }) => (
          <Link key={href} href={href} className="card-hover p-4 flex items-center gap-4 block">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
              <Icon size={20} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-200">{title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
            </div>
            <span className="text-slate-600 text-sm">→</span>
          </Link>
        ))}
      </div>

      {/* App info */}
      <div className="card p-4 text-center">
        <p className="text-slate-600 text-xs">ScorX v0.1.0 · Built with Next.js 14 + Supabase</p>
      </div>
    </div>
  );
}
