'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  MdSportsCricket, MdLiveTv, MdBarChart, MdEmojiEvents,
  MdSpeed, MdCloudUpload, MdPhoneAndroid, MdWifi,
} from 'react-icons/md';
import { FiArrowRight, FiPlay, FiZap, FiUsers } from 'react-icons/fi';
import { GiCricketBat, GiTrophy } from 'react-icons/gi';

const features = [
  {
    icon: MdSportsCricket,
    title: 'Ball-by-Ball Scoring',
    desc: 'Record every delivery with full cricket logic — extras, wickets, partnerships, and live run rates.',
    color: 'from-cricket-600 to-cricket-400',
  },
  {
    icon: MdLiveTv,
    title: 'OBS Streaming Overlay',
    desc: 'Professional broadcast-quality scoreboard overlay for YouTube, Facebook, and streaming platforms.',
    color: 'from-blue-600 to-blue-400',
  },
  {
    icon: MdEmojiEvents,
    title: 'Tournament Management',
    desc: 'Round robin, knockout, and group stage formats with automatic fixture generation and points tables.',
    color: 'from-amber-600 to-amber-400',
  },
  {
    icon: MdBarChart,
    title: 'Advanced Analytics',
    desc: 'Manhattan charts, worm charts, wagon wheel, partnership analysis, and phase-by-phase breakdowns.',
    color: 'from-purple-600 to-purple-400',
  },
  {
    icon: MdSpeed,
    title: 'Real-Time Updates',
    desc: 'Supabase Realtime WebSockets deliver instant score updates to all viewers simultaneously.',
    color: 'from-red-600 to-red-400',
  },
  {
    icon: MdCloudUpload,
    title: 'Cloud Backup',
    desc: 'Your data is safe with automatic cloud backups. Export and restore your matches anytime.',
    color: 'from-teal-600 to-teal-400',
  },
];

const stats = [
  { value: '∞', label: 'Matches Scored' },
  { value: '6', label: 'Chart Types' },
  { value: '4', label: 'Scoreboard Themes' },
  { value: '100%', label: 'Free to Use' },
];

const stepVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden" id="hero">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full
                        bg-cricket-600/5 blur-3xl pointer-events-none" />
        <div className="absolute top-48 right-0 w-96 h-96 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cricket-500/30 
                       bg-cricket-500/10 text-cricket-400 text-sm font-medium mb-8"
          >
            <FiZap size={14} />
            Real-Time Cricket Scoring Software
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6"
          >
            The Ultimate{' '}
            <span className="text-gradient block sm:inline">Cricket Scoreboard</span>
            {' '}Software
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Score matches ball-by-ball, manage tournaments, stream live scoreboards to OBS,
            and analyze performance with powerful charts. Built for cricket clubs.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/signup" className="btn-primary text-lg px-8 py-3.5 gap-2 inline-flex items-center">
              Start Scoring Free
              <FiArrowRight />
            </Link>
            <Link href="#features" className="btn-secondary text-lg px-8 py-3.5 gap-2 inline-flex items-center">
              <FiPlay />
              See Features
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto"
          >
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black text-gradient-gold mb-1">{value}</div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 px-4 bg-dark-300/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-white mb-4"
            >
              Everything a Cricket Club Needs
            </motion.h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              From scoring a friendly match to managing an entire tournament — ScorX has it all.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stepVariants}
                className="card-hover p-6 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} bg-opacity-20 
                                flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="text-white text-2xl" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-white mb-4"
            >
              Up and Running in Minutes
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: FiUsers, title: 'Set Up Teams', desc: 'Create your teams, add players with roles, and customize team colors and logos.' },
              { step: '02', icon: GiCricketBat, title: 'Start Scoring', desc: 'Set up the match, enter the toss, select playing XI, and start scoring ball-by-ball.' },
              { step: '03', icon: MdLiveTv, title: 'Go Live', desc: 'Copy the scoreboard URL into OBS as a browser source. Your live overlay is ready!' },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <motion.div
                key={step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stepVariants}
                className="text-center"
              >
                <div className="text-6xl font-black text-cricket-500/20 mb-4">{step}</div>
                <div className="w-14 h-14 rounded-2xl bg-cricket-600/20 border border-cricket-500/30 
                               flex items-center justify-center mx-auto mb-4">
                  <Icon className="text-cricket-400 text-2xl" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="py-20 px-4 bg-dark-300/80">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="card p-12 border-cricket-500/20 glow-green"
          >
            <GiTrophy className="text-6xl text-amber-400 mx-auto mb-6" />
            <h2 className="text-4xl font-black text-white mb-4">
              Ready to Score Your Next Match?
            </h2>
            <p className="text-slate-400 mb-8 text-lg">
              Join cricket clubs and scorers who trust ScorX for professional-grade live scoring.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="btn-primary text-lg px-10 py-3.5 gap-2 inline-flex items-center">
                Create Free Account
                <FiArrowRight />
              </Link>
              <Link href="/login" className="btn-secondary text-lg px-8 py-3.5">
                Already have an account?
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
