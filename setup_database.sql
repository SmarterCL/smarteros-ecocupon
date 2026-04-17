-- Script Completo para Base de Datos Supabase (EcoCupon.cl)

-- 1. Tabla de Perfiles (Se vincula con auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  total_points INTEGER DEFAULT 0,
  total_recycled NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para Perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su propio perfil" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- Administradores pueden ver todo
CREATE POLICY "Los administradores pueden ver todos los perfiles" 
  ON public.profiles FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  
  -- Insert into public.users for MCP compatibility
  INSERT INTO public.users (id, email, full_name, points)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 0);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabla de Usuarios (Para MCP y compatibilidad)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  points INTEGER DEFAULT 0,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select a todos" ON public.users FOR SELECT USING (true);

-- 3. Eventos de Reciclaje
CREATE TABLE IF NOT EXISTS public.recycling_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  plate TEXT,
  material_type TEXT NOT NULL,
  weight_kg NUMERIC,
  points_earned INTEGER DEFAULT 0,
  photo_url TEXT,
  status TEXT DEFAULT 'completed',
  source TEXT DEFAULT 'app',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.recycling_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propios eventos" 
  ON public.recycling_events FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema crea eventos" 
  ON public.recycling_events FOR INSERT 
  WITH CHECK (true);

-- 4. Transacciones de reciclaje (Para MCP)
CREATE TABLE IF NOT EXISTS public.recycling_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  material_type TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL,
  points_earned INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.recycling_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Tabla de Cupones
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  min_purchase NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propios cupones" 
  ON public.coupons FOR SELECT 
  USING (auth.uid() = user_id);

-- 6. Tabla de Logs de Detección de Placas
CREATE TABLE IF NOT EXISTS public.plate_detection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  detected_plate TEXT NOT NULL,
  original_input TEXT,
  confidence NUMERIC,
  status TEXT DEFAULT 'success',
  api_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.plate_detection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propios logs" 
  ON public.plate_detection_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema inserta logs" 
  ON public.plate_detection_logs FOR INSERT 
  WITH CHECK (true);

-- 7. Función para auto-incrementar puntos del usuario
CREATE OR REPLACE FUNCTION public.increment_user_points(user_id_param UUID, points_to_add INTEGER)
RETURNS void AS $$
BEGIN
  -- Actualizar en public.users
  UPDATE public.users 
  SET points = points + points_to_add, updated_at = NOW()
  WHERE id = user_id_param;
  
  -- Actualizar en public.profiles
  UPDATE public.profiles
  SET total_points = total_points + points_to_add, 
      total_recycled = total_recycled + (points_to_add / 10.0),
      updated_at = NOW()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Gestión de Secretos con Vault (Opcional - Recomendado)
-- Para guardar tus API Keys o Secrets de Google en el Vault de Supabase:
-- 1. Habilita la extensión vault en la sección Extensions.
-- 2. Usa este comando SQL como referencia para guardar tus llaves:
--    SELECT vault.create_secret('TU_CLIENT_SECRET_AQUI', 'google_client_secret', 'Secreto de OAuth para Google Login');
-- Luego puedes acceder a ellas de forma segura desde Edge Functions.
