# 🔐 OAuth Setup - PicoClaw Driver API

**Fecha:** 2026-03-30
**Proveedor:** Google OAuth 2.0
**Integración:** Google AI Studio

---

## 📋 REQUISITOS

### 1. Google Cloud Console Setup

1. Ir a: https://console.cloud.google.com/
2. Crear/Seleccionar proyecto
3. Habilitar APIs:
   - Google AI Platform
   - Cloud Run (si usas ais-dev)

---

## 🔑 CONFIGURACIÓN DE CREDENCIALES

### Paso 1: Crear OAuth Client ID

```
1. Google Cloud Console → APIs & Services → Credentials
2. Create Credentials → OAuth Client ID
3. Application Type: Web Application
4. Authorized JavaScript Origins:
   - https://claw.smarterbot.cl
   - https://ais-dev-wm5ps7wjt3fvpbvuke3g4h-592502038801.us-east1.run.app
5. Authorized Redirect URIs:
   - https://claw.smarterbot.cl/auth/callback
   - https://ais-dev-wm5ps7wjt3fvpbvuke3g4h-592502038801.us-east1.run.app/auth/callback
```

### Paso 2: Obtener Credenciales

```json
{
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uris": [
    "https://claw.smarterbot.cl/auth/callback",
    "https://ais-dev-wm5ps7wjt3fvpbvuke3g4h-592502038801.us-east1.run.app/auth/callback"
  ],
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

---

## 🚀 IMPLEMENTACIÓN EN VPS

### Paso 1: Instalar dependencias

```bash
cd /root/smarteros-runtime/driver-picoclaw
npm install express-session passport passport-google-oauth20 dotenv
```

### Paso 2: Actualizar .env

```bash
# OAuth Google
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
SESSION_SECRET=your_session_secret_min_32_chars
OAUTH_CALLBACK_URL=https://claw.smarterbot.cl/auth/callback

# AI Studio Integration
AI_STUDIO_API_KEY=your_ai_studio_api_key
AI_STUDIO_APP_ID=cc8ce04a-e4b2-4c16-be7c-17f8212da670
```

### Paso 3: Actualizar index.js con OAuth

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 18790;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport config
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.OAUTH_CALLBACK_URL
  },
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Auth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// Middleware para proteger rutas
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
}

// Estado del driver (simulado)
let driverState = {
  connected: true,
  ready: true,
  current_action: null,
  hardware: {
    position: { x: 0, y: 0, z: 0 },
    gripper_open: true,
    temperature: 25,
    error: null
  }
};

// Public endpoints
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    driver: driverState,
    authenticated: req.isAuthenticated(),
    user: req.user ? { id: req.user.id, email: req.user.emails?.[0]?.value } : null,
    timestamp: new Date().toISOString()
  });
});

// Protected API endpoints
app.post('/api/v1/action/grab', isAuthenticated, (req, res) => {
  const { action_id, command, params, timeout } = req.body;
  
  if (!action_id || !command) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'action_id y command son requeridos'
    });
  }
  
  driverState.current_action = {
    id: action_id,
    command,
    params,
    status: 'executing',
    started_at: new Date().toISOString(),
    user: req.user.email
  };
  
  res.json({
    status: 'executing',
    action_id,
    message: 'Acción aceptada - iniciando ejecución',
    user: req.user.email
  });
});

app.get('/api/v1/action/status/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  
  if (driverState.current_action && driverState.current_action.id === id) {
    res.json({
      action_id: id,
      status: driverState.current_action.status,
      action: driverState.current_action
    });
  } else {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Acción no encontrada'
    });
  }
});

app.post('/api/v1/hardware/calibrate', isAuthenticated, (req, res) => {
  if (!driverState.connected) {
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'driverState is not defined'
    });
  }
  
  res.json({
    status: 'calibrating',
    message: 'Iniciando calibración de hardware',
    user: req.user.email
  });
});

// Dashboard (protected)
app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Endpoint no encontrado'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 PicoClaw Driver API running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 OAuth: http://localhost:${PORT}/auth/google`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});
```

---

## 🎨 DASHBOARD HTML (public/dashboard.html)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - PicoClaw Driver</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #0f3460;
        }
        h1 {
            font-size: 2rem;
            background: linear-gradient(90deg, #e94560, #ff6b6b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .user-email {
            color: #8b8b8b;
            font-size: 0.9rem;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #e94560;
            color: #fff;
            text-decoration: none;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 0.9rem;
        }
        .btn:hover { background: #ff6b6b; }
        .card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            border: 1px solid #0f3460;
        }
        .card h2 {
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: #e94560;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .status-item {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .status-label { color: #8b8b8b; font-size: 0.85rem; margin-bottom: 5px; }
        .status-value { font-size: 1.2rem; font-weight: bold; color: #00d26a; }
        .action-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .log-box {
            background: rgba(0, 0, 0, 0.5);
            border-radius: 8px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            max-height: 300px;
            overflow-y: auto;
        }
        .log-entry {
            padding: 5px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .log-entry.success { color: #00d26a; }
        .log-entry.error { color: #e94560; }
        .log-entry.info { color: #4ecdc4; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🤖 PicoClaw Dashboard</h1>
            <div class="user-info">
                <span class="user-email" id="user-email">Loading...</span>
                <a href="/logout" class="btn">Logout</a>
            </div>
        </header>

        <div class="card">
            <h2>📊 Estado del Sistema</h2>
            <div class="status-grid">
                <div class="status-item">
                    <div class="status-label">Driver</div>
                    <div class="status-value" id="driver-status">--</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Hardware</div>
                    <div class="status-value" id="hardware-status">--</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Gripper</div>
                    <div class="status-value" id="gripper-status">--</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Temperatura</div>
                    <div class="status-value" id="temp-status">--</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>🎮 Control de Garra</h2>
            <div class="action-buttons">
                <button class="btn" onclick="executeAction('home')">🏠 Home</button>
                <button class="btn" onclick="executeAction('grab')">✊ Agarrar</button>
                <button class="btn" onclick="executeAction('release')">👐 Soltar</button>
                <button class="btn" onclick="executeAction('calibrate')">⚙️ Calibrar</button>
            </div>
        </div>

        <div class="card">
            <h2>📝 Activity Log</h2>
            <div class="log-box" id="log-box">
                <div class="log-entry info">Dashboard loaded...</div>
            </div>
        </div>
    </div>

    <script>
        let actionLog = [];

        function addLog(message, type = 'info') {
            const logBox = document.getElementById('log-box');
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logBox.appendChild(entry);
            logBox.scrollTop = logBox.scrollHeight;
        }

        async function fetchStatus() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                
                document.getElementById('driver-status').textContent = data.driver.connected ? '● Conectado' : '○ Desconectado';
                document.getElementById('hardware-status').textContent = data.driver.ready ? '● Ready' : '○ Not Ready';
                document.getElementById('gripper-status').textContent = data.driver.hardware.gripper_open ? '○ Abierto' : '● Cerrado';
                document.getElementById('temp-status').textContent = data.driver.hardware.temperature + '°C';
                
                if (data.user && data.user.email) {
                    document.getElementById('user-email').textContent = data.user.email;
                }
            } catch (error) {
                addLog('Error fetching status: ' + error.message, 'error');
            }
        }

        async function executeAction(action) {
            const actions = {
                'home': { command: 'move_to', params: { x: 0, y: 0, z: 0 } },
                'grab': { command: 'grab', params: { force: 50 } },
                'release': { command: 'release', params: {} },
                'calibrate': { command: 'calibrate', params: {} }
            };

            const config = actions[action];
            if (!config) return;

            try {
                addLog(`Executing ${action}...`, 'info');
                const response = await fetch('/api/v1/action/grab', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action_id: `${action}-${Date.now()}`,
                        command: config.command,
                        params: config.params,
                        timeout: 30
                    })
                });
                const data = await response.json();
                
                if (data.status === 'executing') {
                    addLog(`✓ ${action} started`, 'success');
                } else {
                    addLog(`✗ ${action} failed: ${data.message}`, 'error');
                }
            } catch (error) {
                addLog(`Error: ${error.message}`, 'error');
            }
        }

        // Initial fetch
        fetchStatus();
        // Refresh every 5 seconds
        setInterval(fetchStatus, 5000);
    </script>
</body>
</html>
```

---

## 🧪 TESTING

### 1. Test sin autenticación

```bash
# Should return 401
curl https://claw.smarterbot.cl/api/v1/action/grab \
  -H "Content-Type: application/json" \
  -d '{"action_id":"test","command":"move_to","params":{"x":0,"y":0,"z":0}}'

# Response:
# {"error":"UNAUTHORIZED","message":"Authentication required"}
```

### 2. Test con autenticación

```bash
# 1. Login via browser
open https://claw.smarterbot.cl/auth/google

# 2. After login, test with session cookie
curl https://claw.smarterbot.cl/api/v1/action/grab \
  -H "Content-Type: application/json" \
  -b "session=YOUR_SESSION_COOKIE" \
  -d '{"action_id":"test","command":"move_to","params":{"x":0,"y":0,"z":0}}'
```

### 3. Test Health (public)

```bash
curl https://claw.smarterbot.cl/health

# Response includes auth status:
{
  "status": "healthy",
  "authenticated": true,
  "user": { "id": "...", "email": "user@gmail.com" }
}
```

---

## 🔄 DEPLOYMENT EN VPS

```bash
# 1. Conectar al VPS
ssh root@89.116.23.167

# 2. Ir al directorio del driver
cd /root/smarteros-runtime/driver-picoclaw

# 3. Instalar dependencias
npm install express-session passport passport-google-oauth20 dotenv

# 4. Backup del código actual
cp src/index.js src/index.js.oauth-backup

# 5. Copiar nuevos archivos
# (Upload index.js con OAuth y dashboard.html)

# 6. Actualizar .env
nano .env
# Agregar variables de OAuth

# 7. Reiniciar servicio
systemctl restart picoclaw-driver

# 8. Verificar
systemctl status picoclaw-driver
journalctl -u picoclaw-driver -f
```

---

## 📊 ARQUITECTURA CON OAUTH

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET                                  │
│         (Google AI Studio, Users, n8n)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              CLOUDFLARE EDGE                                 │
│    (DDoS, SSL, WAF)                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         VPS HUAWEI (89.116.23.167)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Caddy (Reverse Proxy + SSL)                        │    │
│  │ Port: 443                                          │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ PicoClaw Driver API + OAuth                        │    │
│  │ • Public: /, /health                               │    │
│  │ • Protected: /api/v1/*, /dashboard                 │    │
│  │ • Auth: /auth/google, /auth/callback               │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Google OAuth 2.0                                   │    │
│  │ • Authentication                                   │    │
│  │ • User info (email, profile)                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST

- [ ] Google Cloud Console project created
- [ ] OAuth credentials generated
- [ ] DNS configured for callback URLs
- [ ] Dependencies installed on VPS
- [ ] .env updated with OAuth vars
- [ ] index.js updated with OAuth
- [ ] dashboard.html created
- [ ] Service restarted
- [ ] Test authentication flow
- [ ] Test protected endpoints

---

**Documentación:** [`CLAW-OPERATIONAL-STATUS.md`](https://github.com/ecocuponcl/ecocupon.cl/blob/main/CLAW-OPERATIONAL-STATUS.md)
