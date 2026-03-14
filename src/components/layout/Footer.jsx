'use client';
import Link from 'next/link';
import { GiCricketBat } from 'react-icons/gi';
import { FiGithub, FiTwitter } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-dark-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-cricket-600 flex items-center justify-center">
                <GiCricketBat className="text-white text-lg" />
              </div>
              <span className="text-xl font-bold text-white">
                Scor<span className="text-gradient">X</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              The ultimate cricket scoreboard software for clubs, tournaments, and live streaming.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Dashboard', '/dashboard']].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-cricket-300 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Account</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              {[['Sign In', '/login'], ['Sign Up', '/signup'], ['Settings', '/settings']].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-cricket-300 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs">© {new Date().getFullYear()} ScorX. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-slate-500 hover:text-cricket-400 transition-colors"><FiGithub /></a>
            <a href="#" className="text-slate-500 hover:text-cricket-400 transition-colors"><FiTwitter /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
