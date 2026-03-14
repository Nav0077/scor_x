-- ============================================
-- ScorX — Full Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. PROFILES (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'scorer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name VARCHAR(5),
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#22c55e',
  secondary_color VARCHAR(7) DEFAULT '#ffffff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PLAYERS
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  role VARCHAR(20) CHECK (role IN ('Batsman','Bowler','All-Rounder','Wicket Keeper')),
  batting_style VARCHAR(20) DEFAULT 'Right Hand',
  bowling_style VARCHAR(30),
  jersey_number INTEGER,
  is_captain BOOLEAN DEFAULT FALSE,
  is_wk BOOLEAN DEFAULT FALSE,
  matches_played INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  total_balls_faced INTEGER DEFAULT 0,
  total_fours INTEGER DEFAULT 0,
  total_sixes INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  total_wickets INTEGER DEFAULT 0,
  total_overs_bowled DECIMAL DEFAULT 0,
  total_runs_conceded INTEGER DEFAULT 0,
  best_bowling_wickets INTEGER DEFAULT 0,
  best_bowling_runs INTEGER DEFAULT 0,
  total_catches INTEGER DEFAULT 0,
  total_stumpings INTEGER DEFAULT 0,
  total_runouts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TOURNAMENTS
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format VARCHAR(10) CHECK (format IN ('T20','T10','ODI','Test','Custom')),
  overs_per_match INTEGER DEFAULT 20,
  tournament_type VARCHAR(20) CHECK (tournament_type IN ('Round Robin','Knockout','Group + Knockout')),
  number_of_groups INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','completed')),
  start_date DATE,
  end_date DATE,
  venue TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TOURNAMENT TEAMS
CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  group_name VARCHAR(5) DEFAULT 'A',
  UNIQUE(tournament_id, team_id)
);

-- 6. MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  team1_name TEXT,
  team2_name TEXT,
  overs INTEGER NOT NULL DEFAULT 20,
  venue TEXT,
  match_date TIMESTAMPTZ DEFAULT NOW(),
  toss_won_by UUID REFERENCES teams(id),
  toss_decision VARCHAR(5) CHECK (toss_decision IN ('bat','bowl')),
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming','toss','live_innings1','innings_break','live_innings2','completed','abandoned')),
  current_innings INTEGER DEFAULT 1,
  innings1_batting_team UUID REFERENCES teams(id),
  innings1_score INTEGER DEFAULT 0,
  innings1_wickets INTEGER DEFAULT 0,
  innings1_overs DECIMAL DEFAULT 0,
  innings1_extras INTEGER DEFAULT 0,
  innings2_batting_team UUID REFERENCES teams(id),
  innings2_score INTEGER DEFAULT 0,
  innings2_wickets INTEGER DEFAULT 0,
  innings2_overs DECIMAL DEFAULT 0,
  innings2_extras INTEGER DEFAULT 0,
  winner_team_id UUID REFERENCES teams(id),
  result_text TEXT,
  man_of_match UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INNINGS
CREATE TABLE IF NOT EXISTS innings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings_number INTEGER CHECK (innings_number IN (1, 2)),
  batting_team_id UUID REFERENCES teams(id),
  bowling_team_id UUID REFERENCES teams(id),
  total_score INTEGER DEFAULT 0,
  total_wickets INTEGER DEFAULT 0,
  total_overs DECIMAL DEFAULT 0,
  total_extras INTEGER DEFAULT 0,
  extras_wides INTEGER DEFAULT 0,
  extras_noballs INTEGER DEFAULT 0,
  extras_byes INTEGER DEFAULT 0,
  extras_legbyes INTEGER DEFAULT 0,
  extras_penalty INTEGER DEFAULT 0,
  target INTEGER,
  status VARCHAR(20) DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BATTING SCORECARD
CREATE TABLE IF NOT EXISTS batting_scorecard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  player_name TEXT,
  batting_position INTEGER,
  runs_scored INTEGER DEFAULT 0,
  balls_faced INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  strike_rate DECIMAL DEFAULT 0,
  is_striker BOOLEAN DEFAULT FALSE,
  is_non_striker BOOLEAN DEFAULT FALSE,
  is_out BOOLEAN DEFAULT FALSE,
  dismissal_type VARCHAR(20),
  dismissed_by UUID REFERENCES players(id),
  fielder_id UUID REFERENCES players(id),
  dismissal_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BOWLING SCORECARD
CREATE TABLE IF NOT EXISTS bowling_scorecard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  player_name TEXT,
  bowling_position INTEGER,
  overs_bowled DECIMAL DEFAULT 0,
  maidens INTEGER DEFAULT 0,
  runs_conceded INTEGER DEFAULT 0,
  wickets_taken INTEGER DEFAULT 0,
  economy_rate DECIMAL DEFAULT 0,
  wides INTEGER DEFAULT 0,
  no_balls INTEGER DEFAULT 0,
  dots INTEGER DEFAULT 0,
  fours_conceded INTEGER DEFAULT 0,
  sixes_conceded INTEGER DEFAULT 0,
  is_current_bowler BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BALLS
CREATE TABLE IF NOT EXISTS balls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  ball_sequence INTEGER NOT NULL,
  batsman_id UUID REFERENCES players(id),
  non_striker_id UUID REFERENCES players(id),
  bowler_id UUID REFERENCES players(id),
  runs_scored INTEGER DEFAULT 0,
  extras INTEGER DEFAULT 0,
  extra_type VARCHAR(10),
  total_runs INTEGER DEFAULT 0,
  is_wicket BOOLEAN DEFAULT FALSE,
  wicket_type VARCHAR(20),
  dismissed_player_id UUID REFERENCES players(id),
  fielder_id UUID REFERENCES players(id),
  is_boundary BOOLEAN DEFAULT FALSE,
  is_six BOOLEAN DEFAULT FALSE,
  is_dot BOOLEAN DEFAULT FALSE,
  shot_direction INTEGER,
  shot_distance INTEGER,
  wagon_zone INTEGER,
  commentary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PARTNERSHIPS
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  wicket_number INTEGER,
  batsman1_id UUID REFERENCES players(id),
  batsman1_runs INTEGER DEFAULT 0,
  batsman1_balls INTEGER DEFAULT 0,
  batsman2_id UUID REFERENCES players(id),
  batsman2_runs INTEGER DEFAULT 0,
  batsman2_balls INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  total_balls INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. FALL OF WICKETS
CREATE TABLE IF NOT EXISTS fall_of_wickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  wicket_number INTEGER,
  score_at_fall INTEGER,
  overs_at_fall DECIMAL,
  batsman_id UUID REFERENCES players(id),
  batsman_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. POINTS TABLE
CREATE TABLE IF NOT EXISTS points_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  team_name TEXT,
  group_name VARCHAR(5) DEFAULT 'A',
  matches_played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  tied INTEGER DEFAULT 0,
  no_result INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  nrr DECIMAL DEFAULT 0,
  for_runs INTEGER DEFAULT 0,
  for_overs DECIMAL DEFAULT 0,
  against_runs INTEGER DEFAULT 0,
  against_overs DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

-- 14. FIXTURES
CREATE TABLE IF NOT EXISTS fixtures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  match_number INTEGER,
  round VARCHAR(30),
  group_name VARCHAR(5),
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  match_date TIMESTAMPTZ,
  venue TEXT,
  status VARCHAR(20) DEFAULT 'upcoming',
  winner_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. APP SETTINGS
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  theme VARCHAR(20) DEFAULT 'dark',
  scoreboard_theme VARCHAR(20) DEFAULT 'modern',
  primary_color VARCHAR(7) DEFAULT '#22c55e',
  accent_color VARCHAR(7) DEFAULT '#f59e0b',
  show_animations BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  auto_commentary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_balls_match ON balls(match_id);
CREATE INDEX IF NOT EXISTS idx_balls_innings ON balls(innings_id);
CREATE INDEX IF NOT EXISTS idx_batting_innings ON batting_scorecard(innings_id);
CREATE INDEX IF NOT EXISTS idx_bowling_innings ON bowling_scorecard(innings_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_tournament ON fixtures(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_user ON teams(user_id);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE innings;
ALTER PUBLICATION supabase_realtime ADD TABLE balls;
ALTER PUBLICATION supabase_realtime ADD TABLE batting_scorecard;
ALTER PUBLICATION supabase_realtime ADD TABLE bowling_scorecard;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE balls ENABLE ROW LEVEL SECURITY;
ALTER TABLE batting_scorecard ENABLE ROW LEVEL SECURITY;
ALTER TABLE bowling_scorecard ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE fall_of_wickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles - users can read/update own
CREATE POLICY "Own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Teams - public read, owner write
CREATE POLICY "Public read teams"  ON teams FOR SELECT USING (true);
CREATE POLICY "Owner insert teams" ON teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update teams" ON teams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete teams" ON teams FOR DELETE USING (auth.uid() = user_id);

-- Players - public read, team owner write
CREATE POLICY "Public read players"  ON players FOR SELECT USING (true);
CREATE POLICY "Owner insert players" ON players FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM teams WHERE id = team_id)
);
CREATE POLICY "Owner update players" ON players FOR UPDATE USING (
  auth.uid() = (SELECT user_id FROM teams WHERE id = team_id)
);
CREATE POLICY "Owner delete players" ON players FOR DELETE USING (
  auth.uid() = (SELECT user_id FROM teams WHERE id = team_id)
);

-- Matches - public read, owner write
CREATE POLICY "Public read matches"  ON matches FOR SELECT USING (true);
CREATE POLICY "Owner insert matches" ON matches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update matches" ON matches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete matches" ON matches FOR DELETE USING (auth.uid() = user_id);

-- Innings, balls, scorecards - public read, match owner write
CREATE POLICY "Public read innings" ON innings FOR SELECT USING (true);
CREATE POLICY "Auth insert innings" ON innings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update innings" ON innings FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read balls" ON balls FOR SELECT USING (true);
CREATE POLICY "Auth insert balls" ON balls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read batting" ON batting_scorecard FOR SELECT USING (true);
CREATE POLICY "Auth write batting" ON batting_scorecard FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update batting" ON batting_scorecard FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read bowling" ON bowling_scorecard FOR SELECT USING (true);
CREATE POLICY "Auth write bowling" ON bowling_scorecard FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update bowling" ON bowling_scorecard FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read partnerships" ON partnerships FOR SELECT USING (true);
CREATE POLICY "Auth write partnerships" ON partnerships FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read fow" ON fall_of_wickets FOR SELECT USING (true);
CREATE POLICY "Auth write fow" ON fall_of_wickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Tournaments - public read, owner write
CREATE POLICY "Public read tournaments"  ON tournaments FOR SELECT USING (true);
CREATE POLICY "Owner insert tournaments" ON tournaments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update tournaments" ON tournaments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public read fixtures" ON fixtures FOR SELECT USING (true);
CREATE POLICY "Auth write fixtures" ON fixtures FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read points" ON points_table FOR SELECT USING (true);
CREATE POLICY "Auth write points" ON points_table FOR ALL USING (auth.uid() IS NOT NULL);

-- App settings
CREATE POLICY "Own settings" ON app_settings FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS (run in Storage dashboard)
-- ============================================
-- Create these buckets manually in Supabase Dashboard > Storage:
-- 1. "logos"   - Public bucket (for team logos)
-- 2. "photos"  - Public bucket (for player photos)
-- 3. "banners" - Public bucket (for tournament banners)
-- 4. "backups" - Private bucket (for data backups)
