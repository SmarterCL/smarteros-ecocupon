# Política de Seguridad - EcoCupon.cl

## Gestión de Credenciales con Vault

### Principios Fundamentales
- **NUNCA** commitar credenciales al repositorio
- **NUNCA** hardcodear keys en el código
- **SIEMPRE** usar Supabase Vault para gestión de secretos
- **SIEMPRE** validar variables de entorno en runtime

### Variables de Entorno
```bash
# Requeridas (desde Vault)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Rotación de Credenciales
1. Rotar inmediatamente si hay exposición pública
2. Rotación programada cada 90 días
3. Permisos mínimos necesarios (principle of least privilege)

## Seguridad de Aplicación

### Headers Implementados
- Strict-Transport-Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy (CSP) restrictiva
- Permissions-Policy

### Content Security Policy
- Scripts: solo 'self' y CDN autorizado
- Styles: 'self' + Google Fonts + jsdelivr
- Images: 'self' + blob: + data: + Supabase
- Fonts: 'self' + Google Fonts
- Connect: solo dominios Supabase
- Frames: none (clickjacking protection)

### Validación de Datos
- Zod para validación de esquemas
- Sanitización de inputs de usuario
- Validación server-side obligatoria

### Autenticación y Sesiones
- Supabase Auth con JWT
- Cookies httpOnly y secure
- CSRF protection nativa
- Refresh token automático
- Validación de roles en middleware

## Protección de Rutas

### Middleware
- `/admin` - Solo usuarios con rol 'admin'
- `/protected` - Usuarios autenticados
- `/auth` - Redirige si ya autenticado

### Verificaciones
1. Validación de sesión en cada request
2. Verificación de roles para admin
3. Redirect automático según estado

## Optimización Web/Móvil

### Performance
- Compresión gzip/brotli activada
- Cache-Control optimizado
- Imágenes en WebP/AVIF
- Device sizes optimizados
- DNS prefetch activado

### Mobile-First
- Viewport optimizado
- Touch-friendly (44px minimum)
- PWA capable
- Apple Web App metadata
- Responsive container queries

### CSS Nativo
- Sin dependencias pesadas
- Variables CSS para theming
- Soporte dark mode nativo
- Shadow DOM para aislamiento

## Seguridad de Infraestructura

### Supabase Vault
- Secrets encriptados en reposo
- Acceso mediante IAM
- Audit logging habilitado
- Rotación automática disponible

### Next.js 16
- Server Components por defecto
- Edge runtime cuando aplica
- Turbopack para build seguro
- React Server Components isolation

### Node.js 24.x
- LTS version
- Security patches automáticos
- Memory limits configurados

## Monitoreo

### Auditoría
- Logs de autenticación
- Access logs de rutas protegidas
- Intentos fallidos registrados
- Alertas por anomalías

### Herramientas
- `npm audit` en CI/CD
- Vercel Analytics
- Supabase logs
- Security headers checker

## Respuesta a Incidentes

### Proceso
1. Identificar y contener
2. Rotar credenciales expuestas
3. Revisar logs y audit trail
4. Documentar y comunicar
5. Implementar medidas preventivas

### Contactos de Emergencia
- Security team: security@ecocupon.cl
- Incidentes críticos: +56 9 XXXX XXXX

## Checklist de Seguridad

### Pre-Deploy
- [ ] Variables desde Vault
- [ ] Headers de seguridad verificados
- [ ] CSP testeada
- [ ] Rutas protegidas validadas
- [ ] Audit de dependencias

### Post-Deploy
- [ ] Security headers scan
- [ ] Penetration test básico
- [ ] Performance metrics
- [ ] Mobile responsiveness
- [ ] Analytics configurado
