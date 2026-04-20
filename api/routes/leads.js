const express = require('express');
const router = express.Router();
const { sendLeadWelcome } = require('../services/emailService');
const { appendLead }      = require('../services/sheetsService');

/* POST /api/leads/email — Capturar email lead magnet */
router.post('/email', async (req, res) => {
  const { email } = req.body;

  // Validación básica
  if (!email || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.warn('[Lead] Email inválido:', email);
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    // Guardar en Google Sheets (sin bloquear si falla)
    appendLead(email).catch(err => {
      console.error('[Lead] Error al guardar en Sheets:', err.message);
    });

    // Enviar email de bienvenida con descuento
    await sendLeadWelcome(email);

    console.log('[Lead] Procesado con éxito:', email);
    res.status(200).json({ ok: true, message: 'Email guardado y descuento enviado' });
  } catch (err) {
    console.error('[Lead] Error general en /email:', err.message);
    res.status(500).json({ error: 'Error al procesar tu solicitud. Por favor, inténtalo de nuevo.' });
  }
});

module.exports = router;
