'use client';
import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';

const PRESETS = [
  { id: 'dark-green', name: 'ScorX Green (Default)', bg: 'bg-[#151d21]', primary: 'bg-emerald-500' },
  { id: 'midnight-blue', name: 'Midnight IPL', bg: 'bg-[#0f172a]', primary: 'bg-blue-500' },
  { id: 'classic-red', name: 'Test Cricket Red', bg: 'bg-[#1a1515]', primary: 'bg-rose-600' },
  { id: 'royal-purple', name: 'Royal T20', bg: 'bg-[#1e1525]', primary: 'bg-purple-500' },
];

export default function ThemeSettingsPage() {
  const { theme, toggleTheme } = useTheme();
  // We'll simulate theme changes by dispatching an event that updates CSS variables, Or just save to localStorage for now.
  const [activePreset, setActivePreset] = useState('dark-green');
  const [boardTheme, setBoardTheme] = useState('modern');

  const applyPreset = (id) => {
    setActivePreset(id);
    localStorage.setItem('scorx-theme-preset', id);
    // Real implementation would replace CSS variables on document.documentElement here
    window.dispatchEvent(new Event('theme-change')); // Dummy event
  };

  const applyBoardTheme = (id) => {
    setBoardTheme(id);
    localStorage.setItem('scorx-obs-theme', id);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
          <FiArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="section-title">Theme Customization</h1>
          <p className="text-slate-500 text-sm mt-1">Personalize your dashboard and overlays</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">App Color Scheme</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRESETS.map(preset => (
            <button key={preset.id} onClick={() => applyPreset(preset.id)}
              className={`relative rounded-xl border-2 overflow-hidden transition-all group ${activePreset === preset.id ? 'border-cricket-500' : 'border-white/5 hover:border-white/20'}`}>
              
              <div className={`h-24 ${preset.bg} p-3 flex flex-col justify-end`}>
                <div className={`w-8 h-8 rounded-full ${preset.primary} shadow-lg`} />
              </div>
              
              <div className="p-3 bg-dark-300 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 truncate">{preset.name}</span>
                {activePreset === preset.id && <FiCheck className="text-cricket-500 shrink-0" size={14} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 border-t border-white/10 pt-8">
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">OBS Scoreboard Layout</h2>
          <p className="text-xs text-slate-500 mt-1">Default layout style applied when you open an OBS overlay without a `?theme=` parameter.</p>
        </div>
        
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { id: 'modern', name: 'ScorX Modern', desc: 'Glassmorphic, translucent, premium feel.' },
            { id: 'classic', name: 'Sports TV Classic', desc: 'Solid bars, high contrast, broadcast style.' },
            { id: 'minimal', name: 'Minimalist', desc: 'Just the score, zero distractions.' },
          ].map(t => (
            <button key={t.id} onClick={() => applyBoardTheme(t.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${boardTheme === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-dark-200/50 hover:border-white/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold text-sm ${boardTheme === t.id ? 'text-blue-400' : 'text-slate-200'}`}>{t.name}</span>
                {boardTheme === t.id && <FiCheck className="text-blue-500" size={16} />}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
      
      <div className="pt-8 text-center text-xs text-slate-600">
        Changes are automatically saved to your browser's local storage.
      </div>

    </div>
  );
}
