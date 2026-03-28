# Variables de Entorno para Vercel

## Configuración Requerida

Agrega estas variables en **Vercel Dashboard → Settings → Environment Variables**:

### Producción

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Anon key de Supabase |
| `BOOTSTR_API_KEY` | `eyJhbG...` | API key de Boostr.cl para placas |

### Opcionales

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://ecocupon.cl` | URL del sitio para sitemap |

## Cómo obtener las credenciales

### Supabase
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. **Settings → API**
4. Copia:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Boostr.cl
1. Revisa tu email de registro en Boostr.cl
2. O ve a https://boostr.cl/docs
3. Copia tu API Key → `BOOTSTR_API_KEY`

## Verificación

Después de agregar las variables:
1. Ve a **Deployments** en Vercel
2. Click en **Redeploy** en el último deployment
3. El build debería pasar correctamente

## Notas Importantes

- ⚠️ Nunca commits `.env` con credenciales reales
- ✅ Usa solo `.env.example` como referencia
- 🔒 Las variables de Vercel están encriptadas
- 🔄 Los cambios en variables requieren redeploy
