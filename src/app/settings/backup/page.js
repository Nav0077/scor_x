'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { FiArrowLeft, FiDownloadCloud, FiUploadCloud, FiAlertTriangle } from 'react-icons/fi';

export default function BackupPage() {
  const supabase = createClient();
  const { user } = useAuth();
  
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    setMessage({ type: 'info', text: 'Preparing export...' });

    try {
      // Fetch user's data
      const [{ data: teams }, { data: matches }, { data: tournaments }, { data: players }] = await Promise.all([
        supabase.from('teams').select('*').eq('user_id', user.id),
        supabase.from('matches').select('*').eq('user_id', user.id),
        supabase.from('tournaments').select('*').eq('user_id', user.id),
        supabase.from('players').select('*, teams!inner(user_id)').eq('teams.user_id', user.id)
      ]);

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user_id: user.id,
        data: {
          teams: teams || [],
          matches: matches || [],
          tournaments: tournaments || [],
          players: players || []
        }
      };

      // Create a blob and trigger download
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scorx-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Export downloaded successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Export failed: ' + err.message });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setImporting(true);
    setMessage({ type: 'info', text: 'Reading file...' });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.version !== '1.0' || !json.data) throw new Error("Invalid backup format");
        
        setMessage({ type: 'info', text: 'Simulating import (not fully implemented due to FK constraints). Backup is valid.' });
        // Full import requires carefully upserting data and managing UUID conflicts.
        // For now, this is a placeholder/simulation for safety.
        
      } catch (err) {
        setMessage({ type: 'error', text: 'Import failed: ' + err.message });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
          <FiArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="section-title">Cloud Backup</h1>
          <p className="text-slate-500 text-sm mt-1">Export your matches, teams, and data</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          message.type === 'success' ? 'bg-cricket-500/10 border-cricket-500/20 text-cricket-400' :
          'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}>
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="card p-6 flex flex-col items-center justify-center text-center space-y-4 hover:border-cricket-500/30 transition-colors">
          <div className="w-14 h-14 bg-cricket-500/10 rounded-full flex items-center justify-center text-cricket-400">
            <FiDownloadCloud size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-200">Export Data</h3>
            <p className="text-xs text-slate-500 mt-2">Download a JSON snapshot of all your teams, matches, and tournaments.</p>
          </div>
          <button onClick={handleExport} disabled={exporting} className="btn-primary w-full mt-2">
            {exporting ? 'Exporting...' : 'Download JSON'}
          </button>
        </div>

        <div className="card p-6 flex flex-col items-center justify-center text-center space-y-4 hover:border-blue-500/30 transition-colors">
          <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
            <FiUploadCloud size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-200">Import Data</h3>
            <p className="text-xs text-slate-500 mt-2">Restore data from a previously downloaded JSON backup file.</p>
          </div>
          <div className="w-full relative">
            <input type="file" accept=".json" onChange={handleImport} disabled={importing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <button className="btn-ghost w-full mt-2 border border-slate-700 pointer-events-none">
              {importing ? 'Importing...' : 'Select File'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="card p-5 bg-dark-200/50">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-400 font-semibold block mb-1">Backup Notice</strong>
          Exported data includes all text and statistical records. Images and logos stored in Supabase Storage are not included in the JSON payload and remain hosted in the cloud.
        </p>
      </div>
    </div>
  );
}
