import { Inter, Oswald } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MatchProvider } from '@/context/MatchContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', display: 'swap' });

export const metadata = {
  title: 'ScorX — Cricket Live Scorer',
  description: 'The ultimate cricket scoreboard software. Real-time live scoring, tournament management, OBS streaming overlay, and advanced analytics.',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0', // Prevent zooming on mobile inputs
  keywords: 'cricket scorer, live cricket score, cricket scoreboard, tournament cricket, OBS cricket overlay',
  openGraph: {
    title: 'ScorX — Cricket Live Scorer',
    description: 'Real-time cricket scoring with live streaming overlay and tournament management',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${oswald.variable}`}>
      <body className="bg-dark-400 text-slate-100 antialiased font-sans">
        <ThemeProvider>
          <AuthProvider>
            <MatchProvider>
              {children}
            </MatchProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
