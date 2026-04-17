const express = require('express');
const router  = express.Router();
const { askClaude }          = require('../services/claudeService');
const { createAppointment }  = require('../services/calendarService');
const { sendConfirmation }   = require('../services/emailService');
const { saveMemory, saveConversation, extractMemorizable } = require('../services/cerebroService');

router.post('/', async (req, res) => {
  const { message, sessionId, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'El campo "message" es obligatorio.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'El chatbot no está configurado. Configura ANTHROPIC_API_KEY en el archivo .env',
    });
  }

  try {
    // Detectar si hay algo que memorizar
    const toMemorize = extractMemorizable(message);
    if (toMemorize && sessionId) {
      saveMemory(toMemorize, sessionId || 'web');
    }

    // Llamar a Claude
    const rawReply = await askClaude(message, history);

    // Detectar si Claude generó datos de cita
    const citaMatch = rawReply.match(/\[CITA:(\{.*?\})\]/s);
    let calendarResult = null;

    if (citaMatch) {
      try {
        const citaData = JSON.parse(citaMatch[1]);
        calendarResult = await createAppointment(citaData);
        console.log('[Calendar] Cita creada:', calendarResult?.id);

        // Enviar email de confirmación si se proporcionó
        sendConfirmation({
          nombre:        citaData.nombre,
          servicio:      citaData.servicio,
          fecha:         citaData.fecha,
          hora:          citaData.hora,
          telefono:      citaData.telefono || '',
          emailCliente:  citaData.email || '',
        }).catch(err => console.warn('[Email] Error al enviar:', err.message));

      } catch (calErr) {
        console.error('[Calendar] Error al crear cita:', calErr.message);
      }
    }

    // Limpiar el token [CITA:...] de la respuesta visible
    const reply = rawReply.replace(/\[CITA:\{.*?\}\]/s, '').trim();

    // Guardar historial de la conversación
    if (sessionId) {
      const updatedHistory = [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: reply },
      ];
      saveConversation(sessionId, updatedHistory);
    }

    return res.json({
      reply,
      memorized: toMemorize ? true : false,
      appointmentCreated: calendarResult ? true : false,
    });

  } catch (err) {
    console.error('[Chat] Error:', err.message);
    return res.status(500).json({
      error: 'Error procesando tu mensaje. Por favor inténtalo de nuevo.',
    });
  }
});

module.exports = router;
