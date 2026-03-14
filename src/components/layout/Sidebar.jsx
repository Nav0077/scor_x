'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  MdDashboard, MdSportsCricket, MdGroups, MdEmojiEvents, MdSettings,
} from 'react-icons/md';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { GiCricketBat } from 'react-icons/gi';

const navItems = [
  { label: 'Dashboard',    href: '/dashboard',    icon: MdDashboard },
  { label: 'Matches',      href: '/matches',      icon: MdSportsCricket },
  { label: 'Teams',        href: '/teams',        icon: MdGroups },
  { label: 'Tournaments',  href: '/tournaments',  icon: MdEmojiEvents },
  { label: 'Settings',     href: '/settings',     icon: MdSettings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden md:flex flex-col h-screen sticky top-0 bg-dark-300 border-r border-white/5 overflow-hidden z-40"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-white/5 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-cricket-600 flex items-center justify-center shrink-0">
          <GiCricketBat className="text-white text-lg" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-bold text-white whitespace-nowrap"
          >
            Scor<span className="text-gradient">X</span>
          </motion.span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${active
                  ? 'bg-cricket-500/15 text-cricket-300 border-r-2 border-cricket-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500
                     hover:text-slate-300 hover:bg-white/5 transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>
    </motion.aside>
  );
}
