# 🚀 Guía de Configuración - EcoCupon.cl

## ✅ Checklist Post-Deploy

### 1. Ejecutar Migración en Supabase

**Opción A: Desde Dashboard (Recomendado)**

1. Ve a https://supabase.com/dashboard/project/uyxvzztnsvfcqmgkrnol
2. SQL Editor → New Query
3. Copia y pega el contenido de `scripts/migrate-plate-support.sql`
4. Click en **Run** o presiona `Ctrl+Enter`
5. ✅ Deberías ver: "Success. No rows returned"

**Opción B: Desde CLI**

```bash
supabase db execute --file scripts/migrate-plate-support.sql
```

---

### 2. Configurar Variables de Entorno en Vercel

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto: `ecocupon-cl`
3. **Settings** → **Environment Variables**
4. Agrega las siguientes variables:

#### Producción (Production)
```
NEXT_PUBLIC_SUPABASE_URL=https://uyxvzztnsvfcqmgkrnol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key_de_supabase>
SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key_de_supabase>

# Boostr.cl API (Opcional - Plan Free)
BOOTSTR_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BOOTSTR_PLAN=free
BOOTSTR_DAILY_LIMIT=10

# Google Cloud Vision (Opcional - Backup)
GOOGLE_CLOUD_VISION_API_KEY=<tu_key_de_google>
GOOGLE_CLOUD_PROJECT_ID=<tu_project_id>
```

#### Cómo obtener las keys de Supabase:
1. Dashboard de Supabase → **Settings** → **API**
2. Copia `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
3. Copia `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copia `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (¡No compartir!)

---

### 3. Redeploy en Vercel

Después de agregar las variables:

1. Ve a **Deployments** en Vercel
2. Click en **...** → **Redeploy**
3. ✅ El build debería pasar ahora

---

## 🧪 Pruebas de Funcionamiento

### Test 1: Verificar Build
```bash
# Local
pnpm run build

# Debería compilar sin errores
```

### Test 2: Verificar Base de Datos
```sql
-- En SQL Editor de Supabase
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'plate';

-- Debería retornar: plate | text
```

### Test 3: Verificar Tabla de Logs
```sql
-- En SQL Editor de Supabase
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'plate_detection_logs'
);

-- Debería retornar: true
```

### Test 4: Probar en Producción

1. **Ir a**: https://ecocupon.cl/admin
2. **Login** con tu cuenta de admin
3. **Click** en "Añadir Producto"
4. **Completar**:
   - Nombre: `Test Placa`
   - Precio: `10000`
   - Categoría: `Seleccionar una`
   - **Placa Patente**: `ABCD-12`
5. **Click** en "Validar" → Debería mostrar `✓ Placa validada`
6. **Verificar** contador: `1/10 usadas hoy`
7. **Guardar** producto

---

## ⚠️ Troubleshooting

### Error: "Missing Supabase environment variables"

**Causa:** Variables de entorno no configuradas en Vercel

**Solución:**
1. Vercel Dashboard → Settings → Environment Variables
2. Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy

---

### Error: "column plate does not exist"

**Causa:** Migración no ejecutada

**Solución:**
1. Supabase Dashboard → SQL Editor
2. Ejecutar `scripts/migrate-plate-support.sql`
3. Refresh en la página

---

### Error: "relation plate_detection_logs does not exist"

**Causa:** Tabla de logs no creada

**Solución:**
1. Supabase Dashboard → SQL Editor
2. Ejecutar `scripts/migrate-plate-support.sql` (Parte 2)
3. Verificar en Table Editor que existe `plate_detection_logs`

---

### Límite de 10 placas no funciona

**Causa:** Trigger o RLS mal configurado

**Solución:**
1. Verificar RLS policies en Supabase
2. Verificar que `user_id` se está guardando correctamente
3. Revisar logs en `plate_detection_logs`

---

## 📊 Monitoreo de Uso

### Ver usos hoy
```sql
SELECT 
  user_id,
  COUNT(*) as usos_hoy,
  MAX(created_at) as ultimo_uso
FROM plate_detection_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY usos_hoy DESC;
```

### Ver placas detectadas
```sql
SELECT 
  detected_plate,
  COUNT(*) as veces_detectada
FROM plate_detection_logs
WHERE status = 'success'
GROUP BY detected_plate
ORDER BY veces_detectada DESC
LIMIT 10;
```

---

## 🔐 Seguridad

### Variables Sensibles

| Variable | Tipo | Ubicación |
|----------|------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Solo Vercel + Vault |
| `BOOTSTR_API_KEY` | Secret | Solo Vercel + Vault |
| `GOOGLE_CLOUD_VISION_API_KEY` | Secret | Solo Vercel + Vault |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | OK en client |

### NUNCA hacer:
- ❌ Commit de `.env.local` con keys reales
- ❌ Exponer `SUPABASE_SERVICE_ROLE_KEY` en el client
- ❌ Compartir API keys en Slack/email sin encriptar

---

## 📞 Soporte

### Documentación Adicional
- `SECURITY.md` - Políticas de seguridad
- `SETUP.md` - Configuración inicial
- `docs/PLATE-IMPLEMENTATION.md` - Detalles de implementación

### Contactos
- **GitHub Issues**: https://github.com/ecocuponcl/ecocupon.cl/issues
- **Email**: soporte@ecocupon.cl

---

## ✅ Checklist Final

- [ ] Migración ejecutada en Supabase
- [ ] Variables configuradas en Vercel
- [ ] Redeploy completado exitosamente
- [ ] Test de placa patente funcionando
- [ ] Contador `X/10` visible en admin
- [ ] Logs guardándose en `plate_detection_logs`

**¡Listo! Tu sistema está configurado y funcionando** 🎉
