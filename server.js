require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const chatRoutes = require('./api/routes/chat');
const calendarRoutes = require('./api/routes/calendar');
const cerebroRoutes = require('./api/routes/cerebro');
const twimlRoutes = require('./api/routes/twiml');
const leadsRoutes = require('./api/routes/leads');

const app = express();
const PORT = process.env.PORT || 3000;

// Necesario en Railway (detrás de proxy)
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "*.googleapis.com", "*.gstatic.com", "*.google.com", "*.instagram.com", "*.cdninstagram.com"],
      frameSrc: ["'self'", "*.google.com"],
      connectSrc: ["'self'", "https://this-is-art-app-production.up.railway.app", "https://thisisart.es", "https://www.thisisart.es"],
    },
  },
}));

app.use(cors({
  origin: ['https://criped.es', 'https://www.criped.es', 'https://thisisart.es', 'https://www.thisisart.es', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Por favor espera un momento.' },
});
app.use('/api/', limiter);

// Rate limit estricto para captación de leads (5 por IP cada 10 min)
const leadsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Inténtalo más tarde.' },
});
app.use('/api/leads/', leadsLimiter);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/chat', chatRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/cerebro', cerebroRoutes);
app.use('/api/twiml', twimlRoutes);
app.use('/api/leads', leadsRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`\n🔪 THIS IS ART — Servidor activo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('   ⚠️  ANTHROPIC_API_KEY no configurada — el chatbot no funcionará');
  }
  if (!process.env.GOOGLE_CALENDAR_ID) {
    console.warn('   ⚠️  GOOGLE_CALENDAR_ID no configurada — las citas no funcionarán');
  }
});
