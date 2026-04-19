const express = require('express');
const router = express.Router();
const { sendLeadWelcome } = require('../services/emailService');
const { appendLead }      = require('../services/sheetsService');

/* POST /api/leads/email — Capturar email lead magnet */
router.post('/email', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  // Guardar en Sheet y enviar emails (sin bloquear si falla uno)
  appendLead(email).catch(() => {});
  sendLeadWelcome(email).catch(err => console.error('[Lead] Error email:', err.message));

  console.log('[Lead] Captado:', email);
  res.json({ ok: true });
});

module.exports = router;
