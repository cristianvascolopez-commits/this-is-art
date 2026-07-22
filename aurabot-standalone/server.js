require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const aurabotChatRoutes = require('./api/routes/aurabotChat');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin: ['https://aurabotbcn.es', 'https://www.aurabotbcn.es', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 60000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Por favor espera un momento.' },
});
app.use('/api/', limiter);

app.use('/api/aurabot-chat', aurabotChatRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'aurabot-chat' });
});

app.get('/debug-last-error', (req, res) => {
  res.json({ lastCalErr: global.__lastCalErr || null });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`\n🤖 Aurabot Chat — Servidor activo en puerto ${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('   ⚠️  ANTHROPIC_API_KEY no configurada — el chatbot no funcionará');
  }
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.warn('   ⚠️  GOOGLE_REFRESH_TOKEN no configurada — las citas no funcionarán');
  }
});
