const express = require('express');
const router  = express.Router();
const fs   = require('fs');
const path = require('path');
const { loadKnowledge, saveMemory } = require('../services/cerebroService');

const CEREBRO_DIR  = path.join(__dirname, '../../cerebro');
const MEMORIA_FILE = path.join(CEREBRO_DIR, 'memoria.md');

/* GET /api/cerebro — Ver conocimiento cargado */
router.get('/', (req, res) => {
  const knowledge = loadKnowledge();
  return res.json({ knowledge });
});

/* GET /api/cerebro/memoria — Ver memorias guardadas */
router.get('/memoria', (req, res) => {
  try {
    const content = fs.readFileSync(MEMORIA_FILE, 'utf-8');
    return res.json({ memoria: content });
  } catch {
    return res.json({ memoria: '' });
  }
});

/* POST /api/cerebro/memoria — Guardar una memoria manualmente */
router.post('/memoria', (req, res) => {
  const { text, sessionId } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'El campo "text" es obligatorio.' });
  }
  const saved = saveMemory(text, sessionId || 'manual');
  return res.json({ success: saved });
});

/* GET /api/cerebro/historial — Listar sesiones del historial */
router.get('/historial', (req, res) => {
  const histDir = path.join(CEREBRO_DIR, 'historial');
  try {
    const files = fs.readdirSync(histDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const raw = fs.readFileSync(path.join(histDir, f), 'utf-8');
        const data = JSON.parse(raw);
        return {
          sessionId: data.sessionId,
          updatedAt: data.updatedAt,
          messageCount: data.messages?.length || 0,
        };
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return res.json({ sessions: files });
  } catch {
    return res.json({ sessions: [] });
  }
});

/* GET /api/cerebro/historial/:sessionId — Ver una conversación */
router.get('/historial/:sessionId', (req, res) => {
  const file = path.join(CEREBRO_DIR, 'historial', `${req.params.sessionId}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return res.json(data);
  } catch {
    return res.status(404).json({ error: 'Sesión no encontrada.' });
  }
});

module.exports = router;
