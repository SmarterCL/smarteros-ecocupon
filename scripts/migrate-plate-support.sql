-- ============================================================================
-- ECOCUPON.CL - MIGRACIÓN COMPLETA DE PLACA PATENTE
-- ============================================================================
-- Propósito: Agregar soporte para placa patente con límite de 10/día
-- Fecha: 2026-03-25
-- Instrucciones: Copiar y pegar todo en SQL Editor de Supabase
-- ============================================================================

-- PARTE 1: Agregar columna plate a products
-- ----------------------------------------------------------------------------

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS plate TEXT,
  ADD CONSTRAINT plate_format_check
    CHECK (
      plate IS NULL OR
      plate ~* '^[A-Z]{2,4}-?\d{2,4}$' OR
      plate ~* '^[A-Z]{2}-\d{2}-\d{2}$'
    );

CREATE INDEX IF NOT EXISTS idx_products_plate ON products(plate);

COMMENT ON COLUMN products.plate IS 'License plate number (Chilean format: ABCD-12, AA-12-34, etc.)';

-- PARTE 2: Crear tabla plate_detection_logs
-- ----------------------------------------------------------------------------

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

ALTER TABLE plate_detection_logs ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_plate_logs_user_id ON plate_detection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_plate_logs_created_at ON plate_detection_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_plate_logs_user_date ON plate_detection_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_plate_logs_plate ON plate_detection_logs(detected_plate);

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own logs" ON plate_detection_logs;
CREATE POLICY "Users can view own logs" 
  ON plate_detection_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own logs" ON plate_detection_logs;
CREATE POLICY "Users can insert own logs" 
  ON plate_detection_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access" ON plate_detection_logs;
CREATE POLICY "Service role full access" 
  ON plate_detection_logs 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Función de limpieza
CREATE OR REPLACE FUNCTION clean_old_plate_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM plate_detection_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE plate_detection_logs IS 'Logs de detección de placas patente para tracking de límite diario (10/día)';
COMMENT ON COLUMN plate_detection_logs.confidence IS 'Confidence score: 100 para ingreso manual, <100 para OCR automático';

-- Permisos
GRANT SELECT ON plate_detection_logs TO authenticated;
GRANT INSERT ON plate_detection_logs TO authenticated;
GRANT ALL ON plate_detection_logs TO service_role;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
