-- ============================================
-- EcoCupon - Recycling Module Database Setup
-- ============================================

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  total_points INTEGER DEFAULT 0,
  total_recycled INTEGER DEFAULT 0, -- in kg
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recycling_events table
CREATE TABLE IF NOT EXISTS recycling_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  points INTEGER DEFAULT 100,
  weight_kg DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plate_detection_logs table (for tracking daily limits)
CREATE TABLE IF NOT EXISTS plate_detection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id TEXT,
  detected_plate TEXT NOT NULL,
  original_input TEXT,
  confidence INTEGER DEFAULT 100,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'error')),
  api_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recycling_events_user_id ON recycling_events(user_id);
CREATE INDEX IF NOT EXISTS idx_recycling_events_created_at ON recycling_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recycling_events_plate ON recycling_events(plate);
CREATE INDEX IF NOT EXISTS idx_plate_detection_logs_user_id ON plate_detection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_plate_detection_logs_created_at ON plate_detection_logs(created_at DESC);

-- Create function to update profile stats
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
    SET 
      total_points = total_points + NEW.points,
      total_recycled = total_recycled + COALESCE(NEW.weight_kg, 0),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET 
      total_points = GREATEST(0, total_points - OLD.points),
      total_recycled = GREATEST(0, total_recycled - COALESCE(OLD.weight_kg, 0)),
      updated_at = NOW()
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating profile stats
DROP TRIGGER IF EXISTS trigger_update_profile_stats ON recycling_events;
CREATE TRIGGER trigger_update_profile_stats
  AFTER INSERT OR DELETE ON recycling_events
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_stats();

-- Create function to create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating profiles
DROP TRIGGER IF EXISTS trigger_create_profile ON auth.users;
CREATE TRIGGER trigger_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_on_signup();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plate_detection_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Recycling events policies
CREATE POLICY "Users can view own recycling events"
  ON recycling_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recycling events"
  ON recycling_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Plate detection logs policies
CREATE POLICY "Users can view own plate detection logs"
  ON plate_detection_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own plate detection logs"
  ON plate_detection_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin policies (for future admin dashboard)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Comments for documentation
COMMENT ON TABLE profiles IS 'User profiles with recycling stats';
COMMENT ON TABLE recycling_events IS 'Records of recycling events with plate detection';
COMMENT ON TABLE plate_detection_logs IS 'Daily tracking of plate detection API usage';
COMMENT ON COLUMN recycling_events.plate IS 'Chilean vehicle plate (format: ABCD12 or AB12CD-0)';
COMMENT ON COLUMN recycling_events.points IS 'Points earned for recycling (default: 100)';
COMMENT ON COLUMN recycling_events.status IS 'pending: awaiting validation, approved: validated, rejected: invalid';
