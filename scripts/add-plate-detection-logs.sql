-- Migration: Add plate detection logs table
-- Purpose: Track daily plate detection usage (limit: 10 per day)
-- Date: 2026-03-25

-- Create plate_detection_logs table
CREATE TABLE IF NOT EXISTS plate_detection_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  detected_plate TEXT NOT NULL,
  original_input TEXT NOT NULL,
  confidence INTEGER DEFAULT 100,
  status TEXT CHECK (status IN ('success', 'error', 'invalid_format')) NOT NULL DEFAULT 'success',
  api_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE plate_detection_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plate_logs_user_id ON plate_detection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_plate_logs_created_at ON plate_detection_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_plate_logs_user_date ON plate_detection_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_plate_logs_plate ON plate_detection_logs(detected_plate);

-- RLS Policies
-- Users can view their own logs
CREATE POLICY "Users can view own logs" 
  ON plate_detection_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own logs
CREATE POLICY "Users can insert own logs" 
  ON plate_detection_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all logs
CREATE POLICY "Service role full access" 
  ON plate_detection_logs 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Function to clean old logs (older than 30 days)
CREATE OR REPLACE FUNCTION clean_old_plate_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM plate_detection_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON TABLE plate_detection_logs IS 'Logs de detección de placas patente para tracking de límite diario (10/día)';
COMMENT ON COLUMN plate_detection_logs.confidence IS 'Confidence score: 100 para ingreso manual, <100 para OCR automático';

-- Grant permissions
GRANT SELECT ON plate_detection_logs TO authenticated;
GRANT INSERT ON plate_detection_logs TO authenticated;
GRANT ALL ON plate_detection_logs TO service_role;
