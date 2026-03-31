// =============================================================================
// PicoClaw Driver API - Con OAuth Google + AI Studio Integration
// =============================================================================
// Copiar a: /root/smarteros-runtime/driver-picoclaw/src/index.js
// =============================================================================

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
  secret: process.env.SESSION_SECRET || 'your-session-secret-min-32-chars',
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

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.OAUTH_CALLBACK_URL || '/auth/callback'
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  ));
}

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
  req.logout((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/');
  });
});

// Middleware para proteger rutas API
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ 
    error: 'UNAUTHORIZED', 
    message: 'Authentication required. Login via /auth/google' 
  });
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
    user: req.user ? { 
      id: req.user.id, 
      email: req.user.emails?.[0]?.value,
      name: req.user.displayName 
    } : null,
    ai_studio: {
      enabled: !!process.env.AI_STUDIO_API_KEY,
      app_id: process.env.AI_STUDIO_APP_ID || null
    },
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
  
  console.log(`[ACTION] ${action_id} by ${req.user.email}: ${command}`);
  
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

// AI Studio webhook endpoint (for integration)
app.post('/api/v1/ai-studio/webhook', (req, res) => {
  const { api_key, action } = req.body;
  
  // Validate AI Studio API key
  if (api_key !== process.env.AI_STUDIO_API_KEY) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid AI Studio API key'
    });
  }
  
  if (!action) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'action is required'
    });
  }
  
  // Execute action from AI Studio
  driverState.current_action = {
    id: `ai-studio-${Date.now()}`,
    command: action.command || 'move_to',
    params: action.params || {},
    status: 'executing',
    started_at: new Date().toISOString(),
    source: 'ai-studio'
  };
  
  console.log(`[AI STUDIO] Action from ${process.env.AI_STUDIO_APP_ID}: ${action.command}`);
  
  res.json({
    status: 'executing',
    action_id: driverState.current_action.id,
    message: 'AI Studio action accepted'
  });
});

// Dashboard (protected)
app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// 404 handler for API
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
  console.log(`🤖 AI Studio Webhook: http://localhost:${PORT}/api/v1/ai-studio/webhook`);
  
  if (process.env.AI_STUDIO_API_KEY) {
    console.log(`✅ AI Studio integration enabled`);
  } else {
    console.log(`⚠️  AI Studio integration disabled (set AI_STUDIO_API_KEY)`);
  }
});
